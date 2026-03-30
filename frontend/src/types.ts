export interface ScanMetadata {
  id: number;
  name: string;
  acquisitionTime: string;
  bbox_min_lon: number;
  bbox_min_lat: number;
  bbox_max_lon: number;
  bbox_max_lat: number;
  storageUrlRaw: string;
  storageUrlHdr: string;
  uploadedAt: string;
}
