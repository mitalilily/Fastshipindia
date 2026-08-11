import api from "./axios";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let warmupPromise = null;

export const warmAdminApi = async () => {
  const response = await api.get("/health", { timeout: 12000 });
  return response.data;
};

export const waitForAdminApi = async ({
  maxWaitMs = 75000,
  intervalMs = 2500,
} = {}) => {
  if (warmupPromise) {
    try {
      await warmupPromise;
      return true;
    } catch {
      warmupPromise = null;
    }
  }

  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      warmupPromise = warmAdminApi();
      await warmupPromise;
      warmupPromise = null;
      return true;
    } catch (error) {
      lastError = error;
      warmupPromise = null;
      await sleep(intervalMs);
    }
  }

  throw lastError || new Error("Backend is not reachable");
};

export const loginAdmin = async (email, password) => {
  const response = await api.post(
    "/auth/admin/login",
    { email, password },
    { timeout: 60000 },
  );
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
