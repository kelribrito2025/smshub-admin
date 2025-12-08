import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  // Try admin auth first
  const adminMeQuery = trpc.adminAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Fallback to Manus OAuth ONLY if admin auth finished loading AND returned null
  const oauthMeQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !adminMeQuery.isLoading && !adminMeQuery.data, // Wait for admin query to finish
  });

  // Use admin auth if available, otherwise use OAuth
  const meQuery = adminMeQuery.data ? adminMeQuery : oauthMeQuery;

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const adminLogoutMutation = trpc.adminAuth.logout.useMutation({
    onSuccess: () => {
      utils.adminAuth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      // Try admin logout first
      if (adminMeQuery.data) {
        await adminLogoutMutation.mutateAsync();
        utils.adminAuth.me.setData(undefined, null);
        await utils.adminAuth.me.invalidate();
      } else {
        // Fallback to OAuth logout
        await logoutMutation.mutateAsync();
        utils.auth.me.setData(undefined, null);
        await utils.auth.me.invalidate();
      }
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    }
  }, [adminMeQuery.data, adminLogoutMutation, logoutMutation, utils]);

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending || adminLogoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? adminLogoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
    adminLogoutMutation.error,
    adminLogoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending || adminLogoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    adminLogoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
