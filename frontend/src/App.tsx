// src/App.tsx - UPDATED to initialize auth
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PrivateRoute } from './components/common/PrivateRoute';
import { getTheme } from './theme/theme';
import { store } from './store/store';
import { ROUTES } from './constants/routes';
import { initializeAuth } from './store/slices/authSlice';
import { ReactQueryDevtools } from 'react-query/devtools';
import { RootState } from './store/store';

// Pages
import { Login, Register } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { PortfolioPage } from './pages/Portfolio';
import { Analytics } from './pages/Analytics';
import { RebalancingPage } from './pages/Portfolio/RebalancingPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
      staleTime: 30000,
    },
  },
});

// App content component to use hooks inside Provider
const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);

  useEffect(() => {
    // Initialize authentication state on app start
    dispatch(initializeAuth() as any);
  }, [dispatch]);

  const theme = getTheme(isDarkMode ? 'dark' : 'light');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
          
          {/* Private Routes */}
          <Route path={ROUTES.DASHBOARD} element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path={ROUTES.PORTFOLIO} element={
            <PrivateRoute>
              <PortfolioPage />
            </PrivateRoute>
          } />
          <Route path={ROUTES.ANALYTICS} element={
            <PrivateRoute>
              <Analytics />
            </PrivateRoute>
          } />
          <Route path={ROUTES.REBALANCE} element={
            <PrivateRoute>
              <RebalancingPage />
            </PrivateRoute>
          } />
          
          {/* Default Route */}
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
      </Router>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
