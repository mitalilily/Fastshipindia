import { ChakraProvider, useColorMode } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminLayout from "layouts/Admin.js";
import AuthLayout from "layouts/Auth.js";
import RTLLayout from "layouts/RTL.js";
import SignIn from "views/Auth/SignIn";
import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import theme from "theme/theme.js";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: 1,
    },
  },
});

const root = createRoot(document.getElementById("root"));

function ForceLightMode() {
  const { colorMode, setColorMode } = useColorMode();

  useEffect(() => {
    if (colorMode !== "light") setColorMode("light");
  }, [colorMode, setColorMode]);

  return null;
}

root.render(
  <ChakraProvider theme={theme} resetCss={false}>
    <ForceLightMode />
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Switch>
          <Route exact path="/login" component={SignIn} />
          <Route path="/auth" component={AuthLayout} />
          <Route path="/admin" component={AdminLayout} />
          <Route path="/rtl" component={RTLLayout} />
          <Redirect from="/" to="/admin/dashboard" />
        </Switch>
      </BrowserRouter>
    </QueryClientProvider>
  </ChakraProvider>
);
