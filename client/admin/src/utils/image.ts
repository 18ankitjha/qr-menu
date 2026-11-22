// ============================================================
// Cloudinary thumbnails — ask Cloudinary for a small square version of a photo
// instead of downloading the full 800px original for an 80px box.
// ============================================================

const UPLOAD_SEGMENT = '/image/upload/';

/** Same size as the customer menu so both reuse one cached Cloudinary version per photo. */
export const THUMB_SIZE = 160;

/** `size` = rendered CSS size × 2 (sharp on high-DPI screens). Non-Cloudinary URLs are returned unchanged. */
export const thumbUrl = (url: string, size: number = THUMB_SIZE): string => {
  if (!url.includes('res.cloudinary.com') || !url.includes(UPLOAD_SEGMENT)) return url;
  return url.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}c_fill,w_${size},h_${size},f_auto,q_auto/`);
};
