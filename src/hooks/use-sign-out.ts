import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "@/hooks/use-action";
import authClient from "@/lib/auth/auth-client";
import { toAction } from "@/hooks/use-action";
import { authQueryOptions } from "@/lib/auth/queries";
import { QUERY_KEYS } from "@/constants";

export function useSignOut() {
  const router = useRouter();
  const qc = useQueryClient();

  const mutation = useAction(signOutAction, {
    showToast: false,
    invalidate: [
      QUERY_KEYS.AUTH.USER,
      QUERY_KEYS.AUTH.SESSION,
      authQueryOptions().queryKey,
    ],
    onSuccess: async () => {
      // Fully clear all auth-related cache (not just invalidate)
      qc.removeQueries({ queryKey: QUERY_KEYS.AUTH.SESSION });
      qc.removeQueries({ queryKey: QUERY_KEYS.AUTH.USER });
      qc.removeQueries({ queryKey: authQueryOptions().queryKey });
      await router.invalidate();
      // Hard navigation to flush all cached state
      window.location.href = "/login";
    },
    onError: async () => {
      // Even if sign-out API fails, clear client state and redirect
      qc.removeQueries({ queryKey: QUERY_KEYS.AUTH.SESSION });
      qc.removeQueries({ queryKey: QUERY_KEYS.AUTH.USER });
      qc.removeQueries({ queryKey: authQueryOptions().queryKey });
      window.location.href = "/login";
    },
  });

  return { signOut: () => mutation.mutateAsync(undefined as never), mutation };
}

export async function signOutAction() {
  return toAction(async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          // Cookie cleared by server response
        },
      },
    });
    return null;
  });
}
