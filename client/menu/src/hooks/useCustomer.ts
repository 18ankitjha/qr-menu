import { useCallback, useEffect, useState } from 'react';
import * as TableSessionApi from '../api/table-session.api';
import { statusOf } from '../api/http';
import type { ICustomer } from '../types';

// ============================================================
// useCustomer — who is signed in on this phone (Google). undefined while checking, null when signed out.
// ============================================================

export const useCustomer = () => {
  const [customer, setCustomer] = useState<ICustomer | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    TableSessionApi.getProfile()
      .then((profile) => !cancelled && setCustomer(profile))
      .catch((error) => {
        if (cancelled) return;
        if (statusOf(error) !== 401 && statusOf(error) !== 403) console.warn('Profile check failed', error);
        setCustomer(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    await TableSessionApi.logout().catch(() => undefined);
    setCustomer(null);
  }, []);

  return { customer, signOut };
};
