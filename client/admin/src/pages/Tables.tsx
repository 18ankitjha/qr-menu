import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTables, addTable, addBulkTables, deleteTable, generateQr } from '../services/api';
import { MESSAGES } from '../constants';
import type { ITable } from '../types';
import { getErrorMessage } from '../services/api';
import { TableBillModal } from '../components/TableBillModal';
import { TableAlertsBanner } from '../components/TableAlertsBanner';
import { QrDownloadModal } from '../components/QrDownloadModal';
import './FormPage.css';
import './Tables.css';

// ============================================================
// Tables & QR — Table management with QR code generation
// ============================================================

const PAGE = {
  TITLE: 'Tables & QR Codes',
  SUBTITLE: 'Add tables — a QR code is generated automatically for each one. Take orders and bills from the Orders page.',
  SUBTITLE_SETUP: 'Add your tables — a QR code is generated automatically for each one.',
  SUBTITLE_STAFF: 'Download table QR codes. Take orders and generate bills from the Orders page.',
  BTN_DELETE: 'Delete table',
  ADD_TABLE: 'Add Table',
  BULK_ADD: 'Bulk Add',
  TABLE_NUMBER: 'Table Number',
  TABLE_LABEL: 'Label (optional)',
  BULK_COUNT: 'Number of Tables',
  BTN_ADD: 'Add Table',
  BTN_BULK: 'Add Tables',
  BTN_RETRY_QR: 'Retry QR',
  QR_MISSING: 'QR not generated',
  ADDING: 'Adding & generating QR…',
  BTN_DOWNLOAD_QR: 'Download QR',
  NO_TABLES: 'No tables yet. Add your first table.',
  NO_RESTAURANT: 'Register a restaurant first.',
  QR_GENERATED: 'QR code generated!',
  QR_REGENERATED: (n: number) => `New QR for table #${n} — print and replace the old one.`,
  BTN_REGENERATE_QR: 'Regenerate QR',
  CONFIRM_REGENERATE: (n: number) =>
    `Regenerate the QR for table #${n}?\n\nThe old QR stops working immediately — diners scanning it will be asked to scan the new one. Use this if the QR was photographed/shared, or to upgrade an old QR.`,
  LEGACY_QR: 'Old-style QR (links by table id). Regenerate to get a secure link.',
} as const;

const Tables = () => {
  const { restaurant, menu, isOwner, isSetupComplete, refreshSetup } = useAuth();
  const [billTable, setBillTable] = useState<ITable | null>(null);
  const [qrTable, setQrTable] = useState<ITable | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [tables, setTables] = useState<ITable[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [tableNum, setTableNum] = useState('');
  const [tableLabel, setTableLabel] = useState('');
  const [bulkCount, setBulkCount] = useState('');

  const fetchTables = useCallback(async () => {
    if (!restaurant) return;
    try {
      const { data } = await getTables(restaurant._id);
      setTables(data.data);
    } catch { /* empty */ }
  }, [restaurant]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setLoading(true);
    try {
      const { data } = await addTable({
        restaurantId: restaurant._id,
        tableNumber: parseInt(tableNum),
        label: tableLabel || undefined,
      });
      await fetchTables();
      refreshSetup();
      setShowForm(false);
      setTableNum('');
      setTableLabel('');
      setMessage(data.message ?? '');
    } catch (err) {
      setMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setLoading(true);
    try {
      const { data } = await addBulkTables({ restaurantId: restaurant._id, count: parseInt(bulkCount) });
      await fetchTables();
      refreshSetup();
      setShowForm(false);
      setBulkCount('');
      setMessage(data.message ?? '');
    } catch (err) {
      setMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setLoading(false);
    }
  };

  /** QR codes are generated on create; this only retries one that failed (e.g. upload error). */
  const handleRetryQr = async (tableId: string) => {
    setRetryingId(tableId);
    try {
      await generateQr(tableId);
      await fetchTables();
      setMessage(PAGE.QR_GENERATED);
    } catch (err) {
      setMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setRetryingId(null);
    }
  };

  /** Rotates the table's QR token: the printed QR stops working and a new one is issued. */
  const handleRegenerateQr = async (table: ITable) => {
    if (!confirm(PAGE.CONFIRM_REGENERATE(table.tableNumber))) return;
    setRetryingId(table._id);
    try {
      await generateQr(table._id);
      await fetchTables();
      setMessage(PAGE.QR_REGENERATED(table.tableNumber));
    } catch (err) {
      setMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setRetryingId(null);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm(MESSAGES.CONFIRM_DELETE)) return;
    try {
      await deleteTable(tableId);
      await fetchTables();
      refreshSetup();
    } catch (err) {
      setMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    }
  };

  if (!restaurant) {
    return (
      <div className="form-page">
        <div className="empty-state">
          <div className="empty-icon">🏪</div>
          <p className="empty-text">{PAGE.NO_RESTAURANT}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tables-page">
      <div className="page-header">
        <h1 className="page-title">{PAGE.TITLE}</h1>
        <p className="page-subtitle">{!isOwner ? PAGE.SUBTITLE_STAFF : isSetupComplete ? PAGE.SUBTITLE : PAGE.SUBTITLE_SETUP}</p>
      </div>

      {message && <div className="form-message">{message}</div>}

      {isSetupComplete && (
        <TableAlertsBanner
          restaurantId={restaurant._id}
          onOpenBill={(tableId) => setBillTable(tables.find((t) => t._id === tableId) ?? null)}
        />
      )}

      {isOwner && (
        <div className="btn-row" style={{ marginBottom: 24 }}>
          <button className="btn-primary" onClick={() => { setIsBulk(false); setShowForm(true); }}>
            + {PAGE.ADD_TABLE}
          </button>
          <button className="btn-secondary" onClick={() => { setIsBulk(true); setShowForm(true); }}>
            + {PAGE.BULK_ADD}
          </button>
        </div>
      )}

      {tables.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🪑</div>
          <p className="empty-text">{PAGE.NO_TABLES}</p>
        </div>
      ) : (
        <div className="tables-grid">
          {tables.map((table) => (
            <div key={table._id} className="table-card">
              <div className="table-number">#{table.tableNumber}</div>
              {table.label && <div className="table-label">{table.label}</div>}
              {table.qrCodeUrl ? (
                <img src={table.qrCodeUrl} alt={`QR Table ${table.tableNumber}`} className="qr-image" />
              ) : (
                <span className="table-label">⚠️ {PAGE.QR_MISSING}</span>
              )}
              {table.qrCodeUrl && !table.qrToken && <span className="table-label">⚠️ {PAGE.LEGACY_QR}</span>}
              <div className="table-card-actions">
                {table.qrCodeUrl ? (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setQrTable(table)}>
                    {PAGE.BTN_DOWNLOAD_QR}
                  </button>
                ) : (
                  isOwner && (
                    <button className="btn-secondary btn-sm" disabled={retryingId === table._id} onClick={() => handleRetryQr(table._id)}>
                      {retryingId === table._id ? MESSAGES.LOADING : PAGE.BTN_RETRY_QR}
                    </button>
                  )
                )}
                {isOwner && table.qrCodeUrl && (
                  <button
                    className="btn-icon"
                    disabled={retryingId === table._id}
                    onClick={() => handleRegenerateQr(table)}
                    title={PAGE.BTN_REGENERATE_QR}
                    aria-label={PAGE.BTN_REGENERATE_QR}
                  >
                    {retryingId === table._id ? '…' : '🔄'}
                  </button>
                )}
                {isOwner && (
                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={() => handleDeleteTable(table._id)}
                    title={PAGE.BTN_DELETE}
                    aria-label={PAGE.BTN_DELETE}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {billTable && (
        <TableBillModal
          tableId={billTable._id}
          tableNumber={billTable.tableNumber}
          tableLabel={billTable.label}
          onClose={() => setBillTable(null)}
        />
      )}

      {qrTable && (
        <QrDownloadModal
          table={qrTable}
          restaurantId={restaurant._id}
          restaurantName={restaurant.name}
          defaultColour={menu?.theme?.primaryColor}
          customerOrderingEnabled={menu ? menu.customerOrderingEnabled !== false : undefined}
          onClose={() => setQrTable(null)}
        />
      )}

      {/* Add Table Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={isBulk ? handleBulkAdd : handleAddTable}>
            <h2 className="card-title">{isBulk ? PAGE.BULK_ADD : PAGE.ADD_TABLE}</h2>
            {isBulk ? (
              <div className="form-group">
                <label className="form-label">{PAGE.BULK_COUNT}</label>
                <input type="number" min="1" max="50" className="form-input" value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} required />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">{PAGE.TABLE_NUMBER}</label>
                  <input type="number" className="form-input" value={tableNum} onChange={(e) => setTableNum(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{PAGE.TABLE_LABEL}</label>
                  <input className="form-input" value={tableLabel} onChange={(e) => setTableLabel(e.target.value)} />
                </div>
              </>
            )}
            <div className="btn-row">
              <button className="btn-primary" disabled={loading}>{loading ? PAGE.ADDING : (isBulk ? PAGE.BTN_BULK : PAGE.BTN_ADD)}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>{MESSAGES.CANCEL}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export { Tables };
