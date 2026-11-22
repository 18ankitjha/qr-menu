import { useState } from 'react';
import { ReasonDialog } from '../components/ReasonDialog';
import { changeRestaurantStatus, getErrorMessage } from '../services/api';
import { MESSAGES, STATUS_LABELS } from '../constants';
import type { StatusAction } from '../constants';
import type { IRestaurant } from '../types';

// ============================================================
// useStatusAction — open the confirm dialog, call the API, report the result
// ============================================================

interface IPendingAction {
  restaurant: Pick<IRestaurant, '_id' | 'name'>;
  action: StatusAction;
}

const useStatusAction = (onChanged: (updated: IRestaurant) => void) => {
  const [pending, setPending] = useState<IPendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const openAction = (restaurant: IPendingAction['restaurant'], action: StatusAction) => {
    setError('');
    setSuccessMessage('');
    setPending({ restaurant, action });
  };

  const closeAction = () => {
    if (!busy) setPending(null);
  };

  const confirmAction = async (reason: string) => {
    if (!pending) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await changeRestaurantStatus(pending.restaurant._id, pending.action, reason || undefined);
      setSuccessMessage(`${data.data.name} is now ${STATUS_LABELS[data.data.status].toLowerCase()}.`);
      setPending(null);
      onChanged(data.data);
    } catch (err) {
      setError(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setBusy(false);
    }
  };

  const dialog = pending ? (
    <ReasonDialog
      key={`${pending.restaurant._id}-${pending.action}`}
      action={pending.action}
      restaurantName={pending.restaurant.name}
      busy={busy}
      error={error}
      onConfirm={confirmAction}
      onCancel={closeAction}
    />
  ) : null;

  return { openAction, dialog, successMessage, clearSuccess: () => setSuccessMessage('') };
};

export { useStatusAction };
