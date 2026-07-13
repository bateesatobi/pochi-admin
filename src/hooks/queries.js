import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../context/AdminAuthContext';
import { queryKeys } from '../lib/queryKeys';
import { STALE } from '../lib/queryClient';

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
    staleTime: STALE.LONG,
  });
}

export function useBusinesses(statusFilter = '') {
  return useQuery({
    queryKey: queryKeys.businesses(statusFilter),
    queryFn: () => {
      const params = statusFilter ? { status: statusFilter } : undefined;
      return api.get('/admin/businesses', { params }).then((r) => r.data);
    },
    staleTime: STALE.MEDIUM,
  });
}

export function useBusinessDetail(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.businessDetail(id),
    queryFn: () => api.get(`/admin/businesses/${id}`).then((r) => r.data),
    enabled: enabled && !!id,
    staleTime: STALE.MEDIUM,
  });
}

export function useUsers(roleFilter = '') {
  return useQuery({
    queryKey: queryKeys.users(roleFilter),
    queryFn: () => {
      const params = roleFilter ? { role: roleFilter } : undefined;
      return api.get('/admin/users', { params }).then((r) => r.data);
    },
    staleTime: STALE.MEDIUM,
  });
}

export function useUserDetail(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.userDetail(id),
    queryFn: () => api.get(`/admin/users/${id}`).then((r) => r.data),
    enabled: enabled && !!id,
    staleTime: STALE.MEDIUM,
  });
}

export function useAdminProducts() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: () =>
      api.get('/admin/products', { params: { viewer_currency: 'UGX' } }).then((r) => r.data),
    staleTime: STALE.MEDIUM,
  });
}

export function useAdminProductDetail(sku, enabled = true) {
  return useQuery({
    queryKey: queryKeys.productDetail(sku),
    queryFn: () =>
      api
        .get(`/admin/products/${sku}`, { params: { viewer_currency: 'UGX' } })
        .then((r) => r.data),
    enabled: enabled && !!sku,
    staleTime: STALE.MEDIUM,
  });
}

export function useAdminOrders({ statusFilter = '', startDate = '', endDate = '' } = {}) {
  const filters = { statusFilter, startDate, endDate };
  return useQuery({
    queryKey: queryKeys.orders(filters),
    queryFn: () => {
      const params = { status: statusFilter };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      return api.get('/admin/orders', { params }).then((r) => r.data);
    },
    staleTime: STALE.MEDIUM,
  });
}

export function useAdminOrderDetail(orderId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.orderDetail(orderId),
    queryFn: () => api.get(`/admin/orders/${orderId}`).then((r) => r.data),
    enabled: enabled && !!orderId,
    staleTime: STALE.SHORT,
  });
}

export function useOrderRequests(status = 'PENDING') {
  return useQuery({
    queryKey: queryKeys.orderRequests(status),
    queryFn: () =>
      api.get('/admin/order-requests', { params: { status: status || undefined } }).then((r) => r.data),
    staleTime: STALE.SHORT,
  });
}

export function useReviewOrderRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, action, review_note }) =>
      api.patch(`/admin/order-requests/${requestId}`, { action, review_note }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'order'] });
    },
  });
}

export function useAdminUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, new_status }) =>
      api.patch(`/admin/orders/${orderId}/status`, null, { params: { new_status } }).then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orderDetail(variables.orderId) });
    },
  });
}

export function usePendingDisbursements() {
  return useQuery({
    queryKey: queryKeys.pendingDisbursements,
    queryFn: () => api.get('/admin/payments/pending-disbursements').then((r) => r.data || []),
    staleTime: STALE.MEDIUM,
  });
}

export function useAdminPayTransactions() {
  return useQuery({
    queryKey: queryKeys.payTransactions,
    queryFn: () => api.get('/admin/payments/transactions').then((r) => r.data || []),
    staleTime: STALE.MEDIUM,
  });
}

export function useAdminDisbursements() {
  return useQuery({
    queryKey: queryKeys.disbursements,
    queryFn: () => api.get('/admin/payments/disbursements').then((r) => r.data || []),
    staleTime: STALE.MEDIUM,
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: queryKeys.platformSettings,
    queryFn: () => api.get('/admin/settings/platform').then((r) => r.data),
    staleTime: STALE.LONG,
  });
}

export function useAdminFxRates() {
  return useQuery({
    queryKey: queryKeys.fxRates,
    queryFn: () => api.get('/admin/settings/platform/fx-rates').then((r) => r.data),
    staleTime: STALE.LONG,
  });
}

import { getToken } from '../context/AdminAuthContext';

export function useAdminCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => api.get('/admin/categories/').then((r) => r.data ?? []),
    staleTime: STALE.LONG,
    enabled: !!getToken(),
    retry: (count, err) => {
      const status = err?.response?.status;
      if (status === 401 || status === 403) return false;
      return count < 2;
    },
  });
}

export function usePromotions() {
  return useQuery({
    queryKey: queryKeys.promotions,
    queryFn: () => api.get('/admin/promotions/promotions').then((r) => r.data || []),
    staleTime: STALE.MEDIUM,
  });
}

export function useCoupons() {
  return useQuery({
    queryKey: queryKeys.coupons,
    queryFn: () => api.get('/admin/promotions/coupons').then((r) => r.data || []),
    staleTime: STALE.MEDIUM,
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: queryKeys.auditLogs,
    queryFn: () => api.get('/admin/audit-logs', { params: { limit: 200 } }).then((r) => r.data),
    staleTime: STALE.MEDIUM,
  });
}

export function useAdminNotifications(options = {}) {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api.get('/admin/notifications').then((r) => r.data || []),
    staleTime: STALE.SHORT,
    ...options,
  });
}
