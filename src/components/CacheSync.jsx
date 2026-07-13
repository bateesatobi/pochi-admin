import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';

export default function CacheSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = (keys) => () => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    };

    const onOrder = invalidate([
      queryKeys.stats,
      ['admin', 'orders'],
      ['admin', 'order-requests'],
      ['admin', 'order'],
      queryKeys.auditLogs,
    ]);
    const onDisbursement = invalidate([
      queryKeys.stats,
      ['admin', 'payments'],
      queryKeys.pendingDisbursements,
      queryKeys.payTransactions,
      queryKeys.disbursements,
    ]);

    window.addEventListener('poch-order-new', onOrder);
    window.addEventListener('poch-order-status-changed', onOrder);
    window.addEventListener('poch-disbursement-completed', onDisbursement);

    return () => {
      window.removeEventListener('poch-order-new', onOrder);
      window.removeEventListener('poch-order-status-changed', onOrder);
      window.removeEventListener('poch-disbursement-completed', onDisbursement);
    };
  }, [queryClient]);

  return null;
}
