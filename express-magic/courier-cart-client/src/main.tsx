import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import App from "./App.tsx";
import "./index.css";
import darkTheme from "./theme/theme.ts";
import { CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "./components/UI/Toast.tsx";
import { AuthProvider } from "./context/auth/AuthContext.tsx";
import ErrorBoundary from "./components/UI/ErrorBoundary.tsx";

const CHUNK_RELOAD_KEY = "__chunk_reload_attempted__";

const getAppBasePath = () => {
  const basePath = String(import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  return basePath === "/" ? "" : basePath;
};

const getRoutePathFromLocation = () => {
  const appBasePath = getAppBasePath();
  const { pathname } = window.location;

  if (appBasePath) {
    if (pathname === appBasePath) return "/";
    if (!pathname.startsWith(`${appBasePath}/`)) return "";
    return pathname.slice(appBasePath.length) || "/";
  }

  return pathname;
};

const routePath = getRoutePathFromLocation();

if (!window.location.hash && routePath && routePath !== "/" && !routePath.includes(".")) {
  const appBasePath = getAppBasePath();
  const nextUrl = `${window.location.origin}${appBasePath}/#${routePath}${window.location.search}`;
  window.history.replaceState(null, "", nextUrl);
}

const isChunkLoadError = (message?: string) => {
  if (!message) return false;
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed")
  );
};

const tryReloadForChunkError = () => {
  const alreadyAttempted = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
  if (alreadyAttempted) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
};

window.addEventListener("error", (event) => {
  const message = event?.error?.message || event?.message;
  if (isChunkLoadError(message)) {
    tryReloadForChunkError();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason;
  const message =
    reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";
  if (isChunkLoadError(message)) {
    tryReloadForChunkError();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2, // only retry failed queries once
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <ToastProvider />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
