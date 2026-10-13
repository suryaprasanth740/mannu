import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { badRequest } from '../utils/http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Cloudinary reads CLOUDINARY_URL from the environment automatically.
const useCloudinary = Boolean(env.cloudinaryUrl);
if (useCloudinary) cloudinary.config({ secure: true });

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(badRequest('Only JPG, PNG or WebP images are allowed'));
  },
});

/** Check the file's magic bytes, so a renamed non-image is rejected. */
function looksLikeImage(buf) {
  if (buf.length < 12) return false;
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  return jpg || png || webp;
}

/** Store an uploaded file and return { url, publicId }. */
export async function storeImage(file, folder = 'products') {
  if (!looksLikeImage(file.buffer)) throw badRequest('The uploaded file is not a valid image');
  if (useCloudinary) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `mannu/${folder}`, resource_type: 'image', transformation: [{ width: 1200, crop: 'limit' }] },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(file.buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }
  const name = `${folder}-${crypto.randomUUID()}.${ALLOWED[file.mimetype]}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), file.buffer);
  return { url: `/uploads/${name}`, publicId: `local:${name}` };
}

export async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    if (publicId.startsWith('local:')) {
      await fs.unlink(path.join(UPLOAD_DIR, path.basename(publicId.slice(6))));
    } else if (useCloudinary) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch {
    // Image already gone — nothing to clean up.
  }
}
