import { useState } from 'react';
import { markBillPaid, getErrorMessage } from '../services/api';
import { MESSAGES, PAYMENT_MODES } from '../constants';
import type { IBill, PaymentMode } from '../types';
import './Billing.css';

// ============================================================
// PayButtons — one tap per payment mode marks a bill paid.
// ============================================================

const MODE_LABELS: Record<PaymentMode, string> = {
  CASH: '💵 Cash',
  UPI: '📱 UPI',
  CARD: '💳 Card',
};

interface PayButtonsProps {
  bill: IBill;
  onPaid: (bill: IBill) => void;
}

const PayButtons = ({ bill, onPaid }: PayButtonsProps) => {
  const [saving, setSaving] = useState<PaymentMode | null>(null);
  const [error, setError] = useState('');

  const pay = async (mode: PaymentMode) => {
    setSaving(mode);
    setError('');
    try {
      const { data } = await markBillPaid(bill._id, mode);
      onPaid(data.data);
    } catch (err) {
      setError(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="pay-buttons-wrap">
      <div className="pay-buttons">
        {PAYMENT_MODES.map((mode) => (
          <button
            key={mode}
            className="btn-secondary btn-sm"
            disabled={!!saving}
            onClick={() => pay(mode)}
            title={`Mark paid by ${mode}`}
          >
            {saving === mode ? '...' : MODE_LABELS[mode]}
          </button>
        ))}
      </div>
      {error && <span className="pay-error">{error}</span>}
    </div>
  );
};

export { PayButtons };
