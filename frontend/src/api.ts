import type { ScanMetadata } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function uploadScan(formData: FormData): Promise<ScanMetadata> {
  const res = await fetch(`${API_BASE_URL}/scans/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed with status ${res.status}`);
  }
  return res.json();
}

export async function listScans(): Promise<ScanMetadata[]> {
  const res = await fetch(`${API_BASE_URL}/scans`);
  if (!res.ok) throw new Error('Failed to fetch scans');
  return res.json();
}

export async function getScan(id: number): Promise<ScanMetadata> {
  const res = await fetch(`${API_BASE_URL}/scans/${id}`);
  if (!res.ok) throw new Error('Failed to fetch scan');
  return res.json();
}

export async function deleteScan(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/scans/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete scan');
}
