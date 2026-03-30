import type { ScanMetadata } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (
  import.meta.env.DEV
    ? 'http://localhost:3001'
    : (() => { throw new Error('VITE_API_URL is not set'); })()
);

async function extractError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({}));
  return err.error || `Request failed with status ${res.status}`;
}

export async function uploadScan(formData: FormData): Promise<ScanMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${API_BASE_URL}/scans/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(await extractError(res));
    return res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Upload timed out. File may be too large.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function listScans(): Promise<ScanMetadata[]> {
  const res = await fetch(`${API_BASE_URL}/scans`);
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function getScan(id: number): Promise<ScanMetadata> {
  const res = await fetch(`${API_BASE_URL}/scans/${id}`);
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function deleteScan(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/scans/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await extractError(res));
}
