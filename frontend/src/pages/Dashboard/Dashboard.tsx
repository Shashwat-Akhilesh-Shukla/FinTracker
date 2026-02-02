// src/pages/Dashboard/Dashboard.tsx
import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import {
  Add,
  Analytics
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import PortfolioSummary from '../../components/portfolio/PortfolioSummary';
import HoldingsTable from '../../components/portfolio/HoldingsTable';
import PerformanceCharts from '../../components/charts/PerformanceCharts';
import NewsPanel from '../../components/news/NewsPanel';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import {
  fetchPortfolioSummary,
  fetchPortfolioHoldings,
  fetchPortfolioTransactions
} from '../../store/slices/portfolioSlice';
import { RootState, AppDispatch } from '../../store/store';
import { ROUTES } from '../../constants/routes';
import { formatCurrency, formatPercentage, formatDateTime } from '../../utils/formatters';

const RecentActivity: React.FC = () => {
  const { transactions } = useSelector((state: RootState) => state.portfolio);

  // Get recent 3 transactions, sorted by date descending
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Recent Activity
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {recentTransactions.length > 0 ? (
          recentTransactions.map((transaction) => (
            <Box key={transaction.id} display="flex" justifyContent="space-between" py={1}>
              <Box>
                <Chip
                  label={transaction.type}
                  color={transaction.type === 'BUY' ? 'success' : 'error'}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" component="span">
                  {transaction.symbol} - {transaction.shares} shares at {formatCurrency(transaction.price)}
                </Typography>
              </Box>
              <Typography variant="caption" color="textSecondary">
                {formatDateTime(transaction.date)}
              </Typography>
            </Box>
          ))
        ) : (
          <Typography variant="body2" color="textSecondary">
            No recent activity
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isLoading, error } = useSelector((state: RootState) => state.portfolio);

  useEffect(() => {
    dispatch(fetchPortfolioSummary());
    dispatch(fetchPortfolioHoldings());
    dispatch(fetchPortfolioTransactions());

    const interval = setInterval(() => {
      dispatch(fetchPortfolioSummary());
      dispatch(fetchPortfolioHoldings());
      dispatch(fetchPortfolioTransactions());
    }, 300000); // refresh every 5 minutes

    return () => clearInterval(interval);
  }, [dispatch]);

  if (isLoading) return <LoadingSpinner message="Loading dashboard..." />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <MainLayout>
      <Container maxWidth="xl" sx={{ py: 0 }}>
        {/* Header */}
        <Box mb={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Welcome back, {user?.firstName}!
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Here's what's happening with your portfolio today.
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<Analytics />}
                onClick={() => navigate(ROUTES.ANALYTICS)}
                sx={{ borderRadius: 2 }}
              >
                View Analytics
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(ROUTES.PORTFOLIO)}
                sx={{ borderRadius: 2 }}
              >
                Add Investment
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid item xs={12} lg={8}>
            {/* Portfolio Summary */}
            <Box mb={3}>
              <PortfolioSummary />
            </Box>

            {/* Performance Charts */}
            <Box mb={3}>
              <PerformanceCharts />
            </Box>

            {/* Holdings Table */}
            <Box mb={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Portfolio Holdings
                  </Typography>
                  <HoldingsTable />
                </CardContent>
              </Card>
            </Box>
          </Grid>

          {/* Right Column */}
          <Grid item xs={12} lg={4}>
            {/* News Panel */}
            <Box mb={3}>
              <NewsPanel />
            </Box>

            {/* Recent Activity */}
            <Box mb={3}>
              <RecentActivity />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </MainLayout>
  );
};

export default Dashboard;
