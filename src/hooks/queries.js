import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../context/AdminAuthContext';
import { queryKeys } from '../lib/queryKeys';
import { STALE } from '../lib/queryClient';

export function useAdminStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
    staleTime: STALE.SHORT,
    refetchInterval: 30_000,
    ...options,
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

export function useFinancingLoans() {
  return useQuery({
    queryKey: queryKeys.financingLoans,
    queryFn: () => api.get('/financing/admin/loans').then((r) => r.data || []),
    staleTime: STALE.SHORT,
  });
}

export function useFinancingLenders() {
  return useQuery({
    queryKey: queryKeys.financingLenders,
    queryFn: () => api.get('/financing/admin/lenders').then((r) => r.data || []),
    staleTime: STALE.MEDIUM,
  });
}

export function useFinancingNotices() {
  return useQuery({
    queryKey: queryKeys.financingNotices,
    queryFn: () => api.get('/financing/admin/notices').then((r) => r.data || []),
    staleTime: STALE.SHORT,
    refetchInterval: 30_000,
  });
}

export function useFinancingUnmatched() {
  return useQuery({
    queryKey: queryKeys.financingUnmatched,
    queryFn: () => api.get('/financing/admin/unmatched').then((r) => r.data || []),
    staleTime: STALE.SHORT,
  });
}

export function useFinancingSettlement() {
  return useQuery({
    queryKey: queryKeys.financingSettlement,
    queryFn: () => api.get('/settlements/current').then((r) => r.data),
    staleTime: STALE.MEDIUM,
  });
}

export function useFinancingTreasury() {
  return useQuery({
    queryKey: queryKeys.financingTreasury,
    queryFn: () => api.get('/financing/admin/treasury').then((r) => r.data || {}),
    staleTime: STALE.MEDIUM,
  });
}

export function useFinancingCredits() {
  return useQuery({
    queryKey: queryKeys.financingCredits,
    queryFn: () => api.get('/financing/admin/funder-credits').then((r) => r.data || []),
    staleTime: STALE.SHORT,
  });
}

export function useFinancingPartners() {
  return useQuery({
    queryKey: queryKeys.financingPartners,
    queryFn: () => api.get('/financing/admin/partners').then((r) => r.data || []),
    staleTime: STALE.SHORT,
  });
}

export function useReferralCampaigns() {
  return useQuery({
    queryKey: queryKeys.referralCampaigns,
    queryFn: () => api.get('/referrals/admin/campaigns').then((r) => r.data || []),
    staleTime: STALE.SHORT,
    retry: (count, err) => {
      if (err?.response?.status === 404) return false;
      return count < 2;
    },
  });
}

export function useReferralLeaderboard(campaignId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.referralLeaderboard(campaignId),
    queryFn: () =>
      api
        .get(`/referrals/admin/campaigns/${campaignId}/leaderboard`, { params: { limit: 100 } })
        .then((r) => r.data || []),
    enabled: enabled && !!campaignId,
    staleTime: STALE.SHORT,
  });
}

export function useReferralEvents(campaignId, fraudOnly = false, enabled = true) {
  return useQuery({
    queryKey: queryKeys.referralEvents(campaignId, fraudOnly),
    queryFn: () =>
      api
        .get(`/referrals/admin/campaigns/${campaignId}/events`, {
          params: { fraud_only: fraudOnly },
        })
        .then((r) => r.data || []),
    enabled: enabled && !!campaignId,
    staleTime: STALE.SHORT,
  });
}

export function useReferralKits(campaignId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.referralKits(campaignId),
    queryFn: () =>
      api.get(`/referrals/admin/campaigns/${campaignId}/kits`).then((r) => r.data || []),
    enabled: enabled && !!campaignId,
    staleTime: STALE.SHORT,
  });
}

export function useReferralAnalytics(campaignId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.referralAnalytics(campaignId),
    queryFn: () =>
      api.get(`/referrals/admin/analytics/${campaignId}`).then((r) => r.data || null),
    enabled: enabled && !!campaignId,
    staleTime: STALE.SHORT,
  });
}

export function useSnapAskCases({ status = '', q = '' } = {}) {
  const filters = { status: status || 'all', q: q || '' };
  return useQuery({
    queryKey: queryKeys.snapAskCases(filters),
    queryFn: () => {
      const params = { limit: 100 };
      if (status) params.status = status;
      if (q) params.q = q;
      return api.get('/admin/snap-ask/cases', { params }).then((r) => r.data || []);
    },
    staleTime: STALE.SHORT,
  });
}

export function useSnapAskCase(caseId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.snapAskCase(caseId),
    queryFn: () => api.get(`/admin/snap-ask/cases/${caseId}`).then((r) => r.data),
    enabled: enabled && !!caseId,
    staleTime: STALE.SHORT,
  });
}

export function useSnapAskMessages(caseId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.snapAskMessages(caseId),
    queryFn: () => api.get(`/admin/snap-ask/cases/${caseId}/messages`).then((r) => r.data || []),
    enabled: enabled && !!caseId,
    staleTime: STALE.SHORT,
  });
}

export function useUpdateSnapAskCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, ...body }) =>
      api.put(`/admin/snap-ask/cases/${caseId}`, body).then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'snap-ask'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.snapAskCase(variables.caseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

export function usePostSnapAskMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, body, image_base64 }) =>
      api.post(`/admin/snap-ask/cases/${caseId}/messages`, { body, image_base64 }).then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.snapAskMessages(variables.caseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.snapAskCase(variables.caseId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'snap-ask'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

export function useDeleteSnapAskCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (caseId) => api.delete(`/admin/snap-ask/cases/${caseId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'snap-ask'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}
