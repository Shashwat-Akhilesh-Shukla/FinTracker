// src/pages/Analytics/Analytics.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Divider,
  Alert,
  Skeleton
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { useDispatch, useSelector } from 'react-redux';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { fetchAnalytics } from '../../store/slices/analyticsSlice';
import { RootState, AppDispatch } from '../../store/store';
import { SECTOR_COLORS } from '../../constants/colors';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

const RiskMetricsCard: React.FC = () => {
  const { analytics } = useSelector((state: RootState) => state.analytics);

  if (!analytics?.performance_metrics) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Risk Metrics</Typography>
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={80} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  const { performance_metrics } = analytics;
  
  const riskMetrics = [
    { 
      label: 'Sharpe Ratio', 
      value: performance_metrics.sharpe_ratio.toFixed(3), 
      description: 'Risk-adjusted return',
      color: performance_metrics.sharpe_ratio > 1 ? '#4caf50' : performance_metrics.sharpe_ratio > 0 ? '#ff9800' : '#f44336'
    },
    { 
      label: 'Beta', 
      value: performance_metrics.beta.toFixed(3), 
      description: 'Market sensitivity',
      color: performance_metrics.beta > 1 ? '#f44336' : '#4caf50'
    },
    { 
      label: 'Alpha', 
      value: `${performance_metrics.alpha.toFixed(2)}%`, 
      description: 'Excess return over benchmark',
      color: performance_metrics.alpha > 0 ? '#4caf50' : '#f44336'
    },
    { 
      label: 'Max Drawdown', 
      value: `${performance_metrics.max_drawdown.toFixed(2)}%`, 
      description: 'Largest peak-to-trough decline',
      color: performance_metrics.max_drawdown > 20 ? '#f44336' : performance_metrics.max_drawdown > 10 ? '#ff9800' : '#4caf50'
    },
    { 
      label: 'Volatility', 
      value: `${performance_metrics.volatility.toFixed(2)}%`, 
      description: 'Annualized standard deviation',
      color: performance_metrics.volatility > 25 ? '#f44336' : performance_metrics.volatility > 15 ? '#ff9800' : '#4caf50'
    },
    { 
      label: 'Sortino Ratio', 
      value: performance_metrics.sortino_ratio.toFixed(3), 
      description: 'Downside risk-adjusted return',
      color: performance_metrics.sortino_ratio > 1 ? '#4caf50' : performance_metrics.sortino_ratio > 0 ? '#ff9800' : '#f44336'
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Risk Metrics</Typography>
        <Grid container spacing={2}>
          {riskMetrics.map((metric, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper sx={{ p: 2, textAlign: 'center', borderLeft: `4px solid ${metric.color}` }}>
                <Typography variant="h4" sx={{ color: metric.color, fontWeight: 'bold' }}>
                  {metric.value}
                </Typography>
                <Typography variant="subtitle1" color="text.primary">
                  {metric.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metric.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

const PerformanceComparisonCard: React.FC = () => {
  const { benchmarkComparison, isLoadingBenchmark } = useSelector((state: RootState) => state.analytics);

  if (isLoadingBenchmark) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Performance vs Benchmark</Typography>
          <Skeleton variant="rectangular" height={300} />
        </CardContent>
      </Card>
    );
  }

  if (!benchmarkComparison?.portfolio_data?.length) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Performance vs Benchmark</Typography>
          <Alert severity="info">No benchmark data available</Alert>
        </CardContent>
      </Card>
    );
  }

  const chartData = benchmarkComparison.portfolio_data.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    portfolio: item.portfolio_value,
    benchmark: item.benchmark_value
  }));

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Portfolio vs Benchmark ({benchmarkComparison.timeframe})
        </Typography>
        <Box sx={{ height: 300, mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.split('/').slice(0, 2).join('/')}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'portfolio' ? 'Portfolio' : 'Benchmark'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="portfolio" 
                stroke="#2196f3" 
                strokeWidth={2}
                dot={false}
                name="Portfolio"
              />
              <Line 
                type="monotone" 
                dataKey="benchmark" 
                stroke="#ff9800" 
                strokeWidth={2}
                dot={false}
                name="Benchmark"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        
        {/* Benchmark Returns Summary */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Benchmark Returns</Typography>
          <Grid container spacing={2}>
            {Object.entries(benchmarkComparison.benchmark_returns).map(([name, value]) => (
              <Grid item xs={6} sm={3} key={name}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">{name}</Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ color: value >= 0 ? '#4caf50' : '#f44336' }}
                  >
                    {value.toFixed(2)}%
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

const SectorAllocationCard: React.FC = () => {
  const { analytics } = useSelector((state: RootState) => state.analytics);

  if (!analytics?.sector_allocation?.length) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Sector Allocation</Typography>
          <Alert severity="info">No sector allocation data available</Alert>
        </CardContent>
      </Card>
    );
  }

  const { sector_allocation } = analytics;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Sector Allocation</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sector_allocation}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ sector, percentage }) => `${sector} ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sector_allocation.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={SECTOR_COLORS[entry.sector] || SECTOR_COLORS.Other} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Sector Breakdown</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sector</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">Weight</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sector_allocation.map((sector) => (
                    <TableRow key={sector.sector}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: SECTOR_COLORS[sector.sector] || SECTOR_COLORS.Other,
                              mr: 1
                            }}
                          />
                          {sector.sector}
                        </Box>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(sector.value)}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={`${sector.percentage.toFixed(1)}%`}
                          size="small"
                          color={sector.percentage > 20 ? "error" : sector.percentage > 10 ? "warning" : "success"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

const CorrelationMatrixCard: React.FC = () => {
  const { analytics } = useSelector((state: RootState) => state.analytics);

  if (!analytics?.correlation_matrix) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Correlation Matrix</Typography>
          <Alert severity="info">
            Correlation analysis requires at least 2 holdings with sufficient historical data
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { correlation_matrix } = analytics;
  const { symbols, matrix } = correlation_matrix;

  const getCorrelationColor = (value: number) => {
    if (value > 0.7) return '#f44336'; // High positive correlation - red
    if (value > 0.3) return '#ff9800'; // Medium positive correlation - orange
    if (value > -0.3) return '#4caf50'; // Low correlation - green
    if (value > -0.7) return '#ff9800'; // Medium negative correlation - orange
    return '#f44336'; // High negative correlation - red
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Asset Correlation Matrix</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Values range from -1 (perfect negative correlation) to +1 (perfect positive correlation)
        </Typography>
        
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                {symbols.map((symbol) => (
                  <TableCell key={symbol} align="center" sx={{ minWidth: 60 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                      {symbol}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {symbols.map((symbol1, i) => (
                <TableRow key={symbol1}>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    {symbol1}
                  </TableCell>
                  {symbols.map((symbol2, j) => (
                    <TableCell key={symbol2} align="center">
                      <Chip
                        label={matrix[i][j].toFixed(2)}
                        size="small"
                        sx={{
                          backgroundColor: i === j ? '#e0e0e0' : getCorrelationColor(matrix[i][j]),
                          color: i === j ? '#000' : '#fff',
                          fontWeight: 'bold',
                          minWidth: 50
                        }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Interpretation:</strong> Values closer to 1 indicate assets move together, 
            closer to -1 indicate opposite movements, and closer to 0 indicate independence.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const DiversificationCard: React.FC = () => {
  const { analytics } = useSelector((state: RootState) => state.analytics);

  if (!analytics) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="rectangular" height={100} />
        </CardContent>
      </Card>
    );
  }

  const { diversification_score } = analytics;
  const scorePercentage = diversification_score * 100;
  
  const getDiversificationLevel = (score: number) => {
    if (score >= 0.8) return { level: 'Excellent', color: '#4caf50' };
    if (score >= 0.6) return { level: 'Good', color: '#8bc34a' };
    if (score >= 0.4) return { level: 'Moderate', color: '#ff9800' };
    if (score >= 0.2) return { level: 'Poor', color: '#f44336' };
    return { level: 'Very Poor', color: '#d32f2f' };
  };

  const diversificationLevel = getDiversificationLevel(diversification_score);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Portfolio Diversification</Typography>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h3" sx={{ color: diversificationLevel.color, fontWeight: 'bold' }}>
            {scorePercentage.toFixed(1)}%
          </Typography>
          <Typography variant="h6" sx={{ color: diversificationLevel.color, mb: 2 }}>
            {diversificationLevel.level}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={scorePercentage}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: diversificationLevel.color
              }
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Diversification score is calculated based on concentration risk across your holdings. 
          Higher scores indicate better risk distribution.
        </Typography>
      </CardContent>
    </Card>
  );
};

const Analytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { analytics, isLoading, error } = useSelector((state: RootState) => state.analytics);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchAnalytics(user.id));
    }
  }, [dispatch, user]);

  if (isLoading) return <LoadingSpinner message="Loading analytics..." />;
  if (error) return <ErrorAlert error={error} />;
  if (!analytics) return null;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Portfolio Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Advanced quantitative analysis and risk metrics for your portfolio
        </Typography>
        {analytics.lastUpdated && (
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date(analytics.lastUpdated).toLocaleString()}
          </Typography>
        )}
      </Box>

      {/* Timeframe Selector */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={analytics.timeframe}
          exclusive
          onChange={(_, value) => value && setTimeframe(value)}
          size="small"
        >
          <ToggleButton value="1M">1M</ToggleButton>
          <ToggleButton value="6M">6M</ToggleButton>
          <ToggleButton value="1Y">1Y</ToggleButton>
          <ToggleButton value="3Y">3Y</ToggleButton>
          <ToggleButton value="MAX">MAX</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Analytics Content */}
      <Grid container spacing={3}>
        {/* Risk Metrics */}
        <Grid item xs={12}>
          <RiskMetricsCard />
        </Grid>

        {/* Performance vs Benchmark */}
        <Grid item xs={12}>
          <PerformanceComparisonCard />
        </Grid>

        {/* Sector Analysis and Diversification */}
        <Grid item xs={12} lg={8}>
          <SectorAllocationCard />
        </Grid>
        <Grid item xs={12} lg={4}>
          <DiversificationCard />
        </Grid>

        {/* Correlation Analysis */}
        <Grid item xs={12}>
          <CorrelationMatrixCard />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Analytics;
