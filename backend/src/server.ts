import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;
const storageMode = process.env.STORAGE_MODE || 'local';

// Supabase Setup
let supabase: any = null;
if (storageMode === 'supabase') {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.warn('STORAGE_MODE is supabase but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  } else {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
}
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || 'hyperspectral-scans';

// Middleware
app.use(cors());
app.use(express.json());

// Set up file storage mechanism based on mode
const localUploadPath = path.join(__dirname, '../../mock_storage');
if (!fs.existsSync(localUploadPath)) {
  fs.mkdirSync(localUploadPath, { recursive: true });
}

const storage = storageMode === 'supabase' ? multer.memoryStorage() : multer.diskStorage({
  destination: (req, file, cb) => cb(null, localUploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  }
});
const upload = multer({ storage });

// Interfaces
interface ScanUploadBody {
  name: string;
  acquisitionTime: string;
  bbox_min_lon: string;
  bbox_min_lat: string;
  bbox_max_lon: string;
  bbox_max_lat: string;
}

const router = express.Router();

// Routes
router.get('/scans', async (req, res) => {
  try {
    const scans = await prisma.scan.findMany({ orderBy: { uploadedAt: 'desc' } });
    res.json(scans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/scans/:id', async (req, res) => {
  try {
    const scan = await prisma.scan.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    res.json(scan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/scans/upload', upload.fields([{ name: 'rawFile', maxCount: 1 }, { name: 'hdrFile', maxCount: 1 }]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const rawFile = files?.['rawFile']?.[0];
    const hdrFile = files?.['hdrFile']?.[0];

    // Validate Files
    if (!rawFile || !hdrFile) {
      return res.status(400).json({ error: 'Missing rawFile or hdrFile' });
    }

    // Validate Metadata
    const b = req.body as ScanUploadBody;
    if (!b.name || !b.acquisitionTime || !b.bbox_min_lon || !b.bbox_min_lat || !b.bbox_max_lon || !b.bbox_max_lat) {
      return res.status(400).json({ error: 'Missing required metadata fields (name, acquisitionTime, bbox_* coordinates)' });
    }

    const bbox_min_lon = parseFloat(b.bbox_min_lon);
    const bbox_min_lat = parseFloat(b.bbox_min_lat);
    const bbox_max_lon = parseFloat(b.bbox_max_lon);
    const bbox_max_lat = parseFloat(b.bbox_max_lat);
    if (isNaN(bbox_min_lon) || isNaN(bbox_min_lat) || isNaN(bbox_max_lon) || isNaN(bbox_max_lat)) {
      return res.status(400).json({ error: 'Bounding box values must be valid numbers' });
    }

    let storageUrlRaw = '';
    let storageUrlHdr = '';

    if (storageMode === 'supabase' && supabase) {
      // Upload to Supabase Storage
      const rawKey = `${randomUUID()}${path.extname(rawFile.originalname)}`;
      const { data: rawData, error: rawErr } = await supabase.storage.from(supabaseBucket).upload(rawKey, rawFile.buffer, { contentType: rawFile.mimetype });
      if (rawErr) throw new Error(`Supabase Raw upload failed: ${rawErr.message}`);
      const { data: rawPublicUrl } = supabase.storage.from(supabaseBucket).getPublicUrl(rawKey);
      storageUrlRaw = rawPublicUrl.publicUrl;

      const hdrKey = `${randomUUID()}${path.extname(hdrFile.originalname)}`;
      const { data: hdrData, error: hdrErr } = await supabase.storage.from(supabaseBucket).upload(hdrKey, hdrFile.buffer, { contentType: hdrFile.mimetype });
      if (hdrErr) throw new Error(`Supabase Hdr upload failed: ${hdrErr.message}`);
      const { data: hdrPublicUrl } = supabase.storage.from(supabaseBucket).getPublicUrl(hdrKey);
      storageUrlHdr = hdrPublicUrl.publicUrl;
    } else {
      // Local setup via diskStorage
      storageUrlRaw = `/mock_storage/${rawFile.filename}`;
      storageUrlHdr = `/mock_storage/${hdrFile.filename}`;
    }

    // Write to DB
    const scan = await prisma.scan.create({
      data: {
        name: b.name,
        acquisitionTime: new Date(b.acquisitionTime),
        bbox_min_lon,
        bbox_min_lat,
        bbox_max_lon,
        bbox_max_lat,
        storageUrlRaw,
        storageUrlHdr,
      }
    });

    res.status(201).json(scan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/scans/:id', async (req, res) => {
  try {
    const scanId = parseInt(req.params.id);
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    await prisma.scan.delete({ where: { id: scanId } });

    if (storageMode === 'supabase' && supabase) {
      const extractKey = (url: string) => url.split('/').pop() || '';
      const rawKey = extractKey(scan.storageUrlRaw);
      const hdrKey = extractKey(scan.storageUrlHdr);
      if (rawKey && hdrKey) {
        await supabase.storage.from(supabaseBucket).remove([rawKey, hdrKey]);
      }
    } else if (storageMode === 'local') {
      const fullRaw = path.join(__dirname, '../../', scan.storageUrlRaw);
      const fullHdr = path.join(__dirname, '../../', scan.storageUrlHdr);
      if (fs.existsSync(fullRaw)) fs.unlinkSync(fullRaw);
      if (fs.existsSync(fullHdr)) fs.unlinkSync(fullHdr);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mount routes
app.use('/api', router);
app.use('/', router); // fallback

// Start Server locally if not required by Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

export default app;
