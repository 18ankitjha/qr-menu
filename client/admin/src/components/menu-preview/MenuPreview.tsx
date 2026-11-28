import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { IMenu, IMenuTheme, IRestaurant } from '../../types';
import type { ICategoryWithDishes } from './preview-data';
import { PREVIEW_MESSAGE, PREVIEW_PATH } from './preview.protocol';
import './MenuPreview.css';

// ============================================================
// Customer menu preview — the REAL customer menu app (/menu/preview) in a phone frame, so the preview can never
// drift from what diners see (search, Veg / Non-veg, tabs, table number, Call waiter, cart...).
// This side only sends data; nothing in the preview calls the API or reaches the restaurant.
// ============================================================

const PREVIEW_TABLE = { _id: 'preview', tableNumber: 1 };

interface PhoneMenuPreviewProps {
  restaurant: IRestaurant | null;
  menu: IMenu;
  /** Unsaved theme from the colour pickers; defaults to the saved one. */
  theme?: IMenuTheme;
  categories: ICategoryWithDishes[];
}

/** The phone itself — inline on Customer Menu, inside the overlay in Menu Builder. */
export const PhoneMenuPreview = ({ restaurant, menu, theme, categories }: PhoneMenuPreviewProps) => {
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Same shape as GET /table-session/resolve, which the real menu renders
  const data = useMemo(
    () => ({
      restaurant: { _id: restaurant?._id ?? '', name: restaurant?.name ?? '', logoUrl: restaurant?.logoUrl },
      menu: {
        _id: menu._id,
        name: menu.name,
        theme: theme ?? menu.theme,
        customerOrderingEnabled: menu.customerOrderingEnabled,
      },
      categories,
      table: PREVIEW_TABLE,
    }),
    [restaurant, menu, theme, categories]
  );
  const dataRef = useRef(data);

  const send = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: PREVIEW_MESSAGE.DATA, menu: dataRef.current },
      window.location.origin
    );
  }, []);

  // The preview asks for data once it has loaded (and again after a reload)
  useEffect(() => {
    const onMessage = (e: MessageEvent<{ type?: string }>) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.type === PREVIEW_MESSAGE.READY) send();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [send]);

  // Every change (colour picker, menu edit) shows up immediately
  useEffect(() => {
    dataRef.current = data;
    send();
  }, [data, send]);

  return (
    <div className="mp-phone">
      <div className="mp-phone-chrome">
        <div className="mp-phone-notch" />
      </div>
      <iframe ref={frameRef} className="mp-frame" src={PREVIEW_PATH} title="Customer menu preview" />
      <div className="mp-phone-bottom" />
    </div>
  );
};

interface MenuPreviewProps extends PhoneMenuPreviewProps {
  onClose: () => void;
}

/** Full-screen overlay with the phone (Menu Builder → Preview). */
export const MenuPreview = ({ onClose, ...phone }: MenuPreviewProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="mp-overlay" onClick={onClose}>
      <button type="button" className="mp-close-btn" onClick={onClose} aria-label="Close preview" title="Close preview (Esc)">
        ✕
      </button>
      <div className="mp-phone-wrap" onClick={(e) => e.stopPropagation()}>
        <PhoneMenuPreview {...phone} />
      </div>
      <p className="mp-close-hint">Click outside, press Esc or ✕ to close</p>
    </div>
  );
};
