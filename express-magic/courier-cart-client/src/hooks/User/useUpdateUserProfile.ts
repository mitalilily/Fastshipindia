// hooks/useUpdateUserProfile.ts
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { IUserProfileDB } from "../../types/user.types";
import { updateUserProfile } from "../../api/userProfile.api";
import { toast } from "../../components/UI/Toast";
import { getUserProfileQueryKey } from "../../utils/authQueryKeys";
import { getStoredSessionUser, setStoredSessionUser } from "../../api/tokenVault";
import { isDemoLoginEnabled } from "../../utils/demoAuth";
import { emptyUserProfile } from "../../utils/utility";

/**
 * Update the current user's profile
 *
 * @example
 * const { mutate: saveProfile, isPending } = useUpdateUserProfile({
 *   onSuccess: () => toast.success("Profile updated!"),
 * });
 */
export const useUpdateUserProfile = (
  options?: UseMutationOptions<
    { message: string; user: IUserProfileDB },
    Error,
    Partial<IUserProfileDB>
  >
) => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; user: IUserProfileDB },
    Error,
    Partial<IUserProfileDB>
  >({
    mutationFn: async (payload) => {
      if (!isDemoLoginEnabled()) return updateUserProfile(payload);

      const current = getStoredSessionUser<IUserProfileDB>() ?? emptyUserProfile;
      const nextUser = {
        ...current,
        ...payload,
        companyInfo: {
          ...current.companyInfo,
          ...(payload.companyInfo ?? {}),
        },
      } as IUserProfileDB;

      setStoredSessionUser(nextUser);
      return { message: "Demo profile updated", user: nextUser };
    },
    onSuccess: (
      data: { message: string; user: IUserProfileDB },
      variables: Partial<IUserProfileDB>,
      ...callbackArgs: unknown[]
    ) => {
      queryClient.setQueryData(getUserProfileQueryKey(), data?.user);

      toast.open({ message: data?.message, severity: "success" });

      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        ...callbackArgs
      );
    },
    onError: (
      error: Error,
      variables: Partial<IUserProfileDB>,
      ...callbackArgs: unknown[]
    ) => {
      (options?.onError as ((...args: unknown[]) => unknown) | undefined)?.(
        error,
        variables,
        ...callbackArgs
      );
      toast.open({
        message: "Error saving profile details!",
        severity: "error",
      });
    },
    ...options,
  });
};
