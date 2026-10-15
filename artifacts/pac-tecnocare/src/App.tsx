import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import PanelInicio from "@/pages/panel-inicio";
import ClientesPage from "@/pages/clientes";
import LlamadasPage from "@/pages/llamadas";
import ApolloPage from "@/pages/apollo";
import ReportesPage from "@/pages/reportes";
import EmbudoPage from "@/pages/embudo";
import AsistentePage from "@/pages/asistente";
import { AuthProvider } from "@/auth/auth-provider";
import { Protected } from "@/components/protected";
import { PanelLayout } from "@/components/panel-layout";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: true } },
});

function Private({ children }: { children: ReactNode }) {
  return <Protected><PanelLayout><RoutedErrorBoundary>{children}</RoutedErrorBoundary></PanelLayout></Protected>;
}

function Router() {
  return (
    <Switch>
      <Route path="/"><RoutedErrorBoundary><HomePage /></RoutedErrorBoundary></Route>
      <Route path="/login"><RoutedErrorBoundary><LoginPage /></RoutedErrorBoundary></Route>
      <Route path="/panel"><Private><PanelInicio /></Private></Route>
      <Route path="/panel/clientes"><Private><ClientesPage /></Private></Route>
      <Route path="/panel/embudo"><Private><EmbudoPage /></Private></Route>
      <Route path="/panel/llamadas"><Private><LlamadasPage /></Private></Route>
      <Route path="/panel/asistente"><Private><AsistentePage /></Private></Route>
      <Route path="/panel/ozonar"><Private><ApolloPage /></Private></Route>
      <Route path="/panel/apollo"><Redirect to="/panel/ozonar" replace /></Route>
      <Route path="/panel/reportes"><Private><ReportesPage /></Private></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
