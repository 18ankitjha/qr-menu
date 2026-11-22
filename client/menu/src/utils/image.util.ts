// ============================================================
// Cloudinary thumbnails — ask Cloudinary for a small square version of a photo
// instead of downloading the full 800px original for an 80px box.
// Cloudinary builds each size once, caches it, and serves it from its CDN.
// ============================================================

const UPLOAD_SEGMENT = '/image/upload/';

/** One size for every thumbnail (all render ≤ 80px) so Cloudinary builds and caches just one version per photo. */
export const THUMB_SIZE = 160;

/**
 * `size` = rendered CSS size × 2 (sharp on high-DPI phones). Non-Cloudinary URLs are returned unchanged.
 * Example: .../image/upload/v1/qr-menu/dishes/a.webp → .../image/upload/c_fill,w_160,h_160,f_auto,q_auto/v1/qr-menu/dishes/a.webp
 */
export const thumbUrl = (url: string, size: number = THUMB_SIZE): string => {
  if (!url.includes('res.cloudinary.com') || !url.includes(UPLOAD_SEGMENT)) return url;
  return url.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}c_fill,w_${size},h_${size},f_auto,q_auto/`);
};
