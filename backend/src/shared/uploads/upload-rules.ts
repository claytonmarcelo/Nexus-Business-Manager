export const allowedImageMimes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

export const allowedImageExtensions = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.ico',
];

export function getMaxUploadSizeBytes() {
  const mb = Number(process.env.MAX_UPLOAD_SIZE_MB || 5);
  return mb * 1024 * 1024;
}

export function isAllowedImageMime(mime: string) {
  return allowedImageMimes.includes(mime);
}
