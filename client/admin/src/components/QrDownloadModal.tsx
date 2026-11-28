import { useEffect, useRef, useState } from 'react';
import type { ITable } from '../types';
import './QrDownloadModal.css';

// ============================================================
// QR Download — renders a printable card (restaurant name, big "Table N" header,
// the QR on a white tile, a short call-to-action) on a canvas, in a chosen colour.
// ============================================================

const TEXT = {
  TITLE: (n: number) => `Download QR — Table #${n}`,
  COLOUR: 'Background colour',
  CUSTOM: 'Custom',
  TABLE: (n: number) => `TABLE ${n}`,
  CTA_ORDER: 'Scan to view the menu & order',
  CTA_VIEW: 'Scan to view the menu',
  BTN_DOWNLOAD: '⬇️ Download PNG',
  BTN_CLOSE: 'Close',
  LOADING: 'Preparing QR…',
  ERROR: 'Could not load the QR image. Try again, or regenerate the QR.',
} as const;

const PRESETS = ['#111827', '#ff6b35', '#b91c1c', '#7c2d12', '#15803d', '#1d4ed8', '#6d28d9', '#ffffff'] as const;
const FALLBACK_COLOUR = '#111827';
const STORAGE_KEY = (restaurantId: string) => `qr-card-colour:${restaurantId}`;

const CARD = { W: 1000, H: 1400, QR_TILE: 720, QR_PAD: 40, RADIUS: 48 } as const;
const FONT = 'Inter, "Segoe UI", system-ui, sans-serif';

interface Props {
  table: ITable;
  restaurantId: string;
  restaurantName: string;
  /** Menu theme colour, used as the first default when nothing was picked before. */
  defaultColour?: string;
  /** false → menu is view-only; undefined → unknown (e.g. waiter), use neutral text. */
  customerOrderingEnabled?: boolean;
  onClose: () => void;
}

/** Black or white text, whichever reads better on the given hex background. */
const textColourFor = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** Shrinks the font until the text fits the width. */
const fitText = (ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number) => {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > 20 && ctx.measureText(text).width > maxWidth) {
    s -= 4;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const drawCard = (
  canvas: HTMLCanvasElement,
  qr: HTMLImageElement,
  opts: { colour: string; restaurantName: string; table: ITable; cta: string },
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { W, H, QR_TILE, QR_PAD, RADIUS } = CARD;
  canvas.width = W;
  canvas.height = H;
  const fg = textColourFor(opts.colour);
  const isWhiteBg = fg !== '#ffffff';

  ctx.fillStyle = opts.colour;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = fg;

  fitText(ctx, opts.restaurantName, 600, 48, W - 120);
  ctx.globalAlpha = 0.85;
  ctx.fillText(opts.restaurantName, W / 2, 110);
  ctx.globalAlpha = 1;

  fitText(ctx, TEXT.TABLE(opts.table.tableNumber), 800, 150, W - 120);
  ctx.fillText(TEXT.TABLE(opts.table.tableNumber), W / 2, 270);

  let tileY = 330;
  if (opts.table.label) {
    fitText(ctx, opts.table.label, 500, 44, W - 120);
    ctx.globalAlpha = 0.85;
    ctx.fillText(opts.table.label, W / 2, 335);
    ctx.globalAlpha = 1;
    tileY = 375;
  }

  const tileX = (W - QR_TILE) / 2;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, tileX, tileY, QR_TILE, QR_TILE, RADIUS);
  ctx.fill();
  if (isWhiteBg) {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, tileX + QR_PAD, tileY + QR_PAD, QR_TILE - QR_PAD * 2, QR_TILE - QR_PAD * 2);

  ctx.fillStyle = fg;
  fitText(ctx, opts.cta, 700, 52, W - 120);
  ctx.fillText(opts.cta, W / 2, tileY + QR_TILE + 120);
};

const QrDownloadModal = ({ table, restaurantId, restaurantName, defaultColour, customerOrderingEnabled, onClose }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrImage, setQrImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState(false);
  const [colour, setColour] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY(restaurantId)) || defaultColour || FALLBACK_COLOUR,
  );
  const cta = customerOrderingEnabled === false || customerOrderingEnabled === undefined ? TEXT.CTA_VIEW : TEXT.CTA_ORDER;

  useEffect(() => {
    if (!table.qrCodeUrl) return;
    let cancelled = false;
    loadImage(table.qrCodeUrl)
      .then((img) => { if (!cancelled) setQrImage(img); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [table.qrCodeUrl]);

  useEffect(() => {
    if (qrImage && canvasRef.current) {
      drawCard(canvasRef.current, qrImage, { colour, restaurantName, table, cta });
    }
  }, [qrImage, colour, restaurantName, table, cta]);

  const pickColour = (c: string) => {
    setColour(c);
    localStorage.setItem(STORAGE_KEY(restaurantId), c);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `table-${table.tableNumber}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const swatches = defaultColour && !PRESETS.includes(defaultColour as (typeof PRESETS)[number])
    ? [defaultColour, ...PRESETS]
    : [...PRESETS];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card qr-download-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="card-title">{TEXT.TITLE(table.tableNumber)}</h2>

        <div className="qr-download-preview">
          {error ? (
            <p className="table-label">⚠️ {TEXT.ERROR}</p>
          ) : (
            <>
              {!qrImage && <p className="table-label">{TEXT.LOADING}</p>}
              <canvas ref={canvasRef} className="qr-download-canvas" style={{ display: qrImage ? 'block' : 'none' }} />
            </>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">{TEXT.COLOUR}</label>
          <div className="qr-swatches">
            {swatches.map((c) => (
              <button
                key={c}
                type="button"
                className={`qr-swatch ${c.toLowerCase() === colour.toLowerCase() ? 'qr-swatch--selected' : ''}`}
                style={{ background: c }}
                aria-label={c}
                title={c}
                onClick={() => pickColour(c)}
              />
            ))}
            <label className="qr-swatch-custom" title={TEXT.CUSTOM}>
              <input type="color" value={colour} onChange={(e) => pickColour(e.target.value)} />
              <span>{TEXT.CUSTOM}</span>
            </label>
          </div>
        </div>

        <div className="btn-row">
          <button className="btn-primary" disabled={!qrImage} onClick={handleDownload}>{TEXT.BTN_DOWNLOAD}</button>
          <button type="button" className="btn-secondary" onClick={onClose}>{TEXT.BTN_CLOSE}</button>
        </div>
      </div>
    </div>
  );
};

export { QrDownloadModal };
