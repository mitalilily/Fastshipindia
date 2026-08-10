import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "../../components/UI/Toast";
import { changePassword } from "../../api/auth";
import { DEMO_PASSWORD_STORAGE_KEY, isDemoLoginEnabled } from "../../utils/demoAuth";

/**
 * Hook consumed by <PasswordSettingsForm />
 */
export const useChangePassword = () => {
  const qc = useQueryClient();

  return useMutation<void, unknown, { currentPassword?: string; newPassword: string }>({
    mutationFn: async (data) => {
      if (isDemoLoginEnabled()) {
        localStorage.setItem(DEMO_PASSWORD_STORAGE_KEY, data.newPassword);
        return;
      }

      await changePassword(data);
    },
    onSuccess: () => {
      toast.open({ message: "Password updated", severity: "success" });
      // If you cache user info (e.g. /me) invalidate it here
      qc.invalidateQueries({ queryKey: ["userProfile"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.open({
        message: err?.response?.data?.message ?? "Password change failed",
        severity: "error",
      });
    },
  });
};
