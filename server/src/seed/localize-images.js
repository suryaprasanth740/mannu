/* Copy every remote demo photo (Unsplash) into your own image storage:
 * Cloudinary when CLOUDINARY_URL is set, otherwise server/uploads/.
 *
 *   npm run images:localize
 *
 * Safe to run more than once: images already stored locally or on Cloudinary are skipped. */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Category, FarmerProfile, Product } from '../models/index.js';
import { storeImage } from '../middleware/upload.js';

const isRemote = (url) => /^https?:\/\//.test(url || '') && !url.includes('res.cloudinary.com');

async function download(url) {
  const u = new URL(url);
  if (u.hostname === 'images.unsplash.com') u.searchParams.set('fm', 'jpg');
  const res = await fetch(u, { headers: { accept: 'image/jpeg,image/png,image/webp' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const mimetype = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
  return { buffer: Buffer.from(await res.arrayBuffer()), mimetype };
}

async function localize(url, folder) {
  const file = await download(url);
  const stored = await storeImage(file, folder);
  return stored;
}

async function main() {
  await connectDB();
  let done = 0;
  let failed = 0;

  for (const p of await Product.find({ 'images.0': { $exists: true } })) {
    let changed = false;
    for (const img of p.images) {
      if (!isRemote(img.url)) continue;
      try {
        const s = await localize(img.url, 'products');
        img.url = s.url;
        img.publicId = s.publicId;
        changed = true;
        done++;
      } catch (e) {
        failed++;
        console.warn(`  ${p.name}: ${e.message}`);
      }
    }
    if (changed) await p.save();
  }

  for (const f of await FarmerProfile.find({})) {
    for (const key of ['coverPhoto', 'photo']) {
      if (!isRemote(f[key]?.url)) continue;
      try {
        f[key] = await localize(f[key].url, 'farms');
        await f.save();
        done++;
      } catch (e) {
        failed++;
        console.warn(`  ${f.farmName} ${key}: ${e.message}`);
      }
    }
  }

  for (const c of await Category.find({})) {
    if (!isRemote(c.image)) continue;
    try {
      c.image = (await localize(c.image, 'categories')).url;
      await c.save();
      done++;
    } catch (e) {
      failed++;
      console.warn(`  ${c.name}: ${e.message}`);
    }
  }

  console.log(`Copied ${done} images${failed ? `, ${failed} failed (they keep their Unsplash link)` : ''}.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
