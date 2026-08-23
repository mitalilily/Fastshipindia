import api from "./axios";

export async function getRefundApprovalRequests(params = {}) {
  const { data } = await api.get("/admin/refund-approvals", {
    params: { status: "pending", limit: 50, ...params },
  });
  return data;
}

export async function approveRefundRequest(id, payload = {}) {
  const { data } = await api.post(`/admin/refund-approvals/${id}/approve`, payload);
  return data;
}

export async function declineRefundRequest(id, payload = {}) {
  const { data } = await api.post(`/admin/refund-approvals/${id}/decline`, payload);
  return data;
}
