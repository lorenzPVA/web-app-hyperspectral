import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getScan } from './api';
import type { ScanMetadata } from './types';
import './index.css';

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<ScanMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchScanDetails = async () => {
      try {
        const data = await getScan(parseInt(id, 10));
        setScan(data);
      } catch (err: any) {
        setError(err.message || 'Error fetching scan details');
      } finally {
        setLoading(false);
      }
    };
    fetchScanDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="layout">
        <main className="content">
          <div className="card">
            <p>Loading scan details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="layout">
        <main className="content">
          <div className="card">
            <h2>Scan Not Found</h2>
            <p className="error-banner">{error || 'The requested scan could not be found.'}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout">
      <main className="content">
        <section className="detail-section card" style={{ display: 'block', marginTop: '2rem' }}>
          <h2>{scan.name}</h2>
          <div className="detail-grid">
            <div><strong>ID:</strong> {scan.id}</div>
            <div><strong>Uploaded At:</strong> {new Date(scan.uploadedAt).toLocaleString()}</div>
            <div><strong>Acquisition Time:</strong> {new Date(scan.acquisitionTime).toLocaleString()}</div>
            
            <div className="detail-bbox">
              <strong>Bounding Box:</strong>
              <ul>
                <li>Min Lon: {scan.bbox_min_lon}</li>
                <li>Min Lat: {scan.bbox_min_lat}</li>
                <li>Max Lon: {scan.bbox_max_lon}</li>
                <li>Max Lat: {scan.bbox_max_lat}</li>
              </ul>
            </div>

            <div className="detail-files">
              <strong>Files:</strong>
              <ul>
                <li><a href={scan.storageUrlRaw} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-block', marginBottom: '0.5rem', textDecoration: 'none' }}>Download .raw</a></li>
                <li><a href={scan.storageUrlHdr} target="_blank" rel="noreferrer" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>Download .hdr</a></li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
