import fs from 'node:fs';
import path from 'node:path';

export function ensureUploadFolders() {
  const uploadsRoot = path.resolve(process.env.UPLOADS_DIR || 'uploads');

  const folders = [
    uploadsRoot,
    path.join(uploadsRoot, 'avatars'),
    path.join(uploadsRoot, 'logos'),
    path.join(uploadsRoot, 'favicons'),
    path.join(uploadsRoot, 'documents'),
    path.join(uploadsRoot, 'temp'),
  ];

  for (const folder of folders) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }

  return uploadsRoot;
}
