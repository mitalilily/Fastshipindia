import api from "./axios";

export const warmAdminApi = async () => {
  const response = await api.get("/health", { timeout: 8000 });
  return response.data;
};

export const loginAdmin = async (email, password) => {
  const response = await api.post("/auth/admin/login", { email, password });
  return response.data;
};

export const logoutAdmin = async () => {
  return await api.post("/auth/logout");
};

export const changeAdminPassword = async ({ currentPassword, newPassword }) => {
  const response = await api.post('/auth/admin/change-password', {
    currentPassword,
    newPassword,
  })
  return response.data
}
