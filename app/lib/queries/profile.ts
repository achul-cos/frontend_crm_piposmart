"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProfile,
  updateUserProfile,
  changeUserPassword,
  type UserResponse,
  type UpdateUserProfilePayload,
  type ChangePasswordPayload,
} from "@/app/lib/api";

export const profileKeys = {
  detail: ["profile"] as const,
};

export function useProfileQuery(enabled = true) {
  return useQuery<UserResponse>({
    queryKey: profileKeys.detail,
    queryFn: getProfile,
    enabled,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserProfilePayload) => updateUserProfile(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.detail }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changeUserPassword(payload),
  });
}
