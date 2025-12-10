import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ Optimized defaults to eliminate loading flashes and avoid 429 "Too Many Requests"
      staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes (eliminates unnecessary refetches and prevents 429 errors)
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
      refetchOnMount: false, // Don't auto-refetch when component mounts if data is fresh
      refetchOnWindowFocus: false, // Don't auto-refetch when window regains focus
      refetchOnReconnect: true, // Only refetch when reconnecting to network
      retry: 1, // ✅ Apenas 1 retry para carregamento mais rápido (evita esperar muito em caso de erro)
      retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 10000), // ✅ Backoff mais rápido: 500ms, 1s, 2s... max 10s
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Check if current route is a public store route (not admin)
  const currentPath = window.location.pathname;
  const isPublicRoute = !currentPath.startsWith('/admin');
  
  // Only redirect to login if we're in an admin route
  if (!isPublicRoute) {
    window.location.href = getLoginUrl();
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
