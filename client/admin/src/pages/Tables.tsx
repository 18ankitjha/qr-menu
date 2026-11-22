import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTables, addTable, addBulkTables, deleteTable, generateQr } from '../services/api';
import { MESSAGES } from '../constants';
import type { ITable } from '../types';
import './FormPage.css';
import './Tables.css';

// ============================================================
// Tables & QR — Table management with QR code generation
// ============================================================

const PAGE = {
  TITLE: 'Tables & QR Codes',
  SUBTITLE: 'Manage tables and generate QR codes for customers.',
  ADD_TABLE: 'Add Table',
  BULK_ADD: 'Bulk Add',
  TABLE_NUMBER: 'Table Number',
  TABLE_LABEL: 'Label (optional)',
  BULK_COUNT: 'Number of Tables',
  BTN_ADD: 'Add Table',
  BTN_BULK: 'Add Tables',
  BTN_GENERATE_QR: 'Generate QR',
  BTN_DOWNLOAD_QR: 'Download QR',
  NO_TABLES: 'No tables yet. Add your first table.',
  NO_RESTAURANT: 'Register a restaurant first.',
  QR_GENERATED: 'QR code generated!',
  SUCCESS_TABLE: 'Table added!',
  SUCCESS_BULK: 'Tables added!',
} as const;

const Tables = () => {
  const { restaurant } = useAuth();
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
      await addTable({
        restaurantId: restaurant._id,
        tableNumber: parseInt(tableNum),
        label: tableLabel || undefined,
      });
      await fetchTables();
      setShowForm(false);
      setTableNum('');
      setTableLabel('');
      setMessage(PAGE.SUCCESS_TABLE);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setLoading(true);
    try {
      await addBulkTables({ restaurantId: restaurant._id, count: parseInt(bulkCount) });
      await fetchTables();
      setShowForm(false);
      setBulkCount('');
      setMessage(PAGE.SUCCESS_BULK);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQr = async (tableId: string) => {
    try {
      await generateQr(tableId);
      await fetchTables();
      setMessage(PAGE.QR_GENERATED);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm(MESSAGES.CONFIRM_DELETE)) return;
    await deleteTable(tableId);
    await fetchTables();
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
        <p className="page-subtitle">{PAGE.SUBTITLE}</p>
      </div>

      {message && <div className="form-message">{message}</div>}

      <div className="btn-row" style={{ marginBottom: 24 }}>
        <button className="btn-primary" onClick={() => { setIsBulk(false); setShowForm(true); }}>
          + {PAGE.ADD_TABLE}
        </button>
        <button className="btn-secondary" onClick={() => { setIsBulk(true); setShowForm(true); }}>
          + {PAGE.BULK_ADD}
        </button>
      </div>

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
                <div className="qr-preview">
                  <img src={table.qrCodeUrl} alt={`QR Table ${table.tableNumber}`} className="qr-image" />
                  <a href={table.qrCodeUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                    {PAGE.BTN_DOWNLOAD_QR}
                  </a>
                </div>
              ) : (
                <button className="btn-secondary btn-sm" onClick={() => handleGenerateQr(table._id)}>
                  {PAGE.BTN_GENERATE_QR}
                </button>
              )}
              <button className="btn-icon btn-icon--danger" onClick={() => handleDeleteTable(table._id)}>🗑️</button>
            </div>
          ))}
        </div>
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
              <button className="btn-primary" disabled={loading}>{loading ? MESSAGES.LOADING : (isBulk ? PAGE.BTN_BULK : PAGE.BTN_ADD)}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>{MESSAGES.CANCEL}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export { Tables };
