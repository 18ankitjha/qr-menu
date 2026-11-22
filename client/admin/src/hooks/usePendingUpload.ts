import { useCallback, useEffect, useRef } from 'react';
import { discardImage } from '../services/api';

// ============================================================
// usePendingUpload — remembers an image uploaded in a form but not yet saved,
// so it can be deleted from Cloudinary if the form is cancelled, the image is
// replaced before saving, or the page is left.
// ============================================================

export const usePendingUpload = () => {
  const pending = useRef<string | null>(null);

  /** Call right after an upload succeeds. Discards the previous unsaved upload, if any. */
  const track = useCallback((url: string) => {
    if (pending.current && pending.current !== url) void discardImage(pending.current);
    pending.current = url;
  }, []);

  /** Call on cancel / remove: deletes the unsaved upload. */
  const discard = useCallback(() => {
    if (pending.current) void discardImage(pending.current);
    pending.current = null;
  }, []);

  /** Call after a successful save: the upload is now in use, keep it. */
  const commit = useCallback(() => {
    pending.current = null;
  }, []);

  useEffect(() => discard, [discard]);

  return { track, discard, commit };
};
