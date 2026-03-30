import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { uploadScan, listScans, deleteScan } from './api';
import type { ScanMetadata } from './types';
import ScanDetailPage from './ScanDetailPage';
import './index.css';

function AdminDashboard() {
  const [scans, setScans] = useState<ScanMetadata[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const data = await listScans();
      setScans(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      await uploadScan(formData);
      await fetchScans();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    try {
      await deleteScan(id);
      if (selectedScan?.id === id) {
        setSelectedScan(null);
      }
      await fetchScans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="layout">
      <header className="header">
        <h1>Hyperspectral Scan Manager</h1>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="content">
        <section className="upload-section card">
          <h2>Upload Scan</h2>
          <form onSubmit={handleUpload} className="upload-form">
            <div className="form-group">
              <label>Name</label>
              <input type="text" name="name" required />
            </div>

            <div className="form-group">
              <label>Acquisition Time</label>
              <input type="datetime-local" name="acquisitionTime" required />
            </div>

            <fieldset className="bbox-group">
              <legend>Bounding Box</legend>
              <div className="bbox-inputs">
                <div className="form-group">
                  <label>Min Longitude</label>
                  <input type="number" step="any" name="bbox_min_lon" required />
                </div>
                <div className="form-group">
                  <label>Min Latitude</label>
                  <input type="number" step="any" name="bbox_min_lat" required />
                </div>
                <div className="form-group">
                  <label>Max Longitude</label>
                  <input type="number" step="any" name="bbox_max_lon" required />
                </div>
                <div className="form-group">
                  <label>Max Latitude</label>
                  <input type="number" step="any" name="bbox_max_lat" required />
                </div>
              </div>
            </fieldset>

            <div className="file-group">
              <div className="form-group">
                <label>Raw File (.raw)</label>
                <input type="file" name="rawFile" required accept=".raw" />
              </div>
              <div className="form-group">
                <label>Header File (.hdr)</label>
                <input type="file" name="hdrFile" required accept=".hdr" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Uploading...' : 'Upload Scan'}
            </button>
          </form>
        </section>

        <section className="list-section card">
          <h2>Available Scans</h2>
          {scans.length === 0 ? (
            <p className="empty-state">No scans available. Upload one to get started.</p>
          ) : (
            <table className="scan-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map(scan => (
                  <tr key={scan.id} className={selectedScan?.id === scan.id ? 'selected' : ''}>
                    <td>{scan.id}</td>
                    <td>{scan.name}</td>
                    <td>{new Date(scan.acquisitionTime).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <button type="button" onClick={() => setSelectedScan(scan)} className="btn-secondary">View</button>
                      <button type="button" onClick={() => handleDelete(scan.id)} className="btn-danger">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {selectedScan && (
          <section className="detail-section card">
            <h2>Scan Details</h2>
            <div className="detail-grid">
              <div><strong>ID:</strong> {selectedScan.id}</div>
              <div><strong>Name:</strong> {selectedScan.name}</div>
              <div><strong>Uploaded At:</strong> {new Date(selectedScan.uploadedAt).toLocaleString()}</div>
              <div><strong>Acquisition Time:</strong> {new Date(selectedScan.acquisitionTime).toLocaleString()}</div>

              <div className="detail-bbox">
                <strong>Bounding Box:</strong>
                <ul>
                  <li>Min Lon: {selectedScan.bbox_min_lon}</li>
                  <li>Min Lat: {selectedScan.bbox_min_lat}</li>
                  <li>Max Lon: {selectedScan.bbox_max_lon}</li>
                  <li>Max Lat: {selectedScan.bbox_max_lat}</li>
                </ul>
              </div>

              <div className="detail-files">
                <strong>Files:</strong>
                <ul>
                  <li><a href={selectedScan.storageUrlRaw} target="_blank" rel="noreferrer">Download .raw</a></li>
                  <li><a href={selectedScan.storageUrlHdr} target="_blank" rel="noreferrer">Download .hdr</a></li>
                </ul>
              </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <Link to={`/scans/${selectedScan.id}`} className="btn-primary" style={{ textDecoration: 'none' }}>Open Public Page</Link>
              <button onClick={() => setSelectedScan(null)} className="btn-secondary">Close</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/scans/:id" element={<ScanDetailPage />} />
    </Routes>
  );
}

export default App;
