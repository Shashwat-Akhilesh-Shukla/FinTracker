import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  Divider,
  styled,
  useTheme,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Sell as SellIcon,
  ShoppingCart as BuyIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import MainLayout from '../../components/layout/MainLayout';
import { useRebalancing, TargetAllocation } from '../../hooks/useRebalancing';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

const GlassCard = styled(Card)(({ theme }) => ({
  background: theme.palette.mode === 'dark' 
    ? 'rgba(30, 41, 59, 0.7)' 
    : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(12px)',
  borderRadius: '16px',
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
}));

const ActionIcon = ({ action }: { action: string }) => {
  if (action === 'BUY') return <BuyIcon sx={{ color: '#4caf50', mr: 1, fontSize: '1.2rem' }} />;
  return <SellIcon sx={{ color: '#f44336', mr: 1, fontSize: '1.2rem' }} />;
};

export const RebalancingPage: React.FC = () => {
  const theme = useTheme();
  const { loading, error, targets, rebalanceData, saveTargets, refresh } = useRebalancing();
  const [editableTargets, setEditableTargets] = useState<TargetAllocation[]>([]);

  useEffect(() => {
    if (targets.length > 0) {
      setEditableTargets(targets);
    } else if (rebalanceData?.sector_comparisons) {
      // Default to current sectors if no targets set
      setEditableTargets(rebalanceData.sector_comparisons.map(s => ({
        category_name: s.sector,
        target_percentage: s.current_percentage,
        category_type: 'sector'
      })));
    }
  }, [targets, rebalanceData]);

  const handleTargetChange = (name: string, value: number) => {
    setEditableTargets(prev => prev.map(t => 
      t.category_name === name ? { ...t, target_percentage: value / 100 } : t
    ));
  };

  const totalTargetPercent = editableTargets.reduce((sum, t) => sum + t.target_percentage, 0) * 100;

  const handleSave = () => {
    if (Math.abs(totalTargetPercent - 100) > 0.1) {
      alert(`Total allocation must sum to 100% (currently ${totalTargetPercent.toFixed(1)}%)`);
      return;
    }
    saveTargets(editableTargets);
  };

  if (loading && !rebalanceData) return <LoadingSpinner message="Calculating rebalancing needs..." />;

  const chartData = rebalanceData?.sector_comparisons.map(s => ({
    name: s.sector,
    Current: (s.current_percentage * 100).toFixed(1),
    Target: (s.target_percentage * 100).toFixed(1)
  })) || [];

  return (
    <MainLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
              Portfolio Rebalancing
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Maintain your ideal asset distribution with AI-powered trade suggestions.
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />} 
            onClick={refresh}
            sx={{ borderRadius: '10px' }}
          >
            Refresh Data
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Grid container spacing={3}>
          {/* Target Configuration */}
          <Grid item xs={12} lg={4}>
            <GlassCard sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight={600}>Target Allocation</Typography>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={handleSave}
                    disabled={Math.abs(totalTargetPercent - 100) > 0.1}
                    startIcon={<SaveIcon />}
                  >
                    Save Targets
                  </Button>
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="body2" color={Math.abs(totalTargetPercent - 100) > 0.1 ? 'error' : 'success.main'} fontWeight={600}>
                    Total Allocation: {totalTargetPercent.toFixed(1)}% / 100%
                  </Typography>
                </Box>

                <Box sx={{ maxHeight: '500px', overflowY: 'auto', pr: 1 }}>
                  {editableTargets.map((target) => (
                    <Box key={target.category_name} sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2">{target.category_name}</Typography>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {(target.target_percentage * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                      <Slider
                        value={target.target_percentage * 100}
                        onChange={(_, v) => handleTargetChange(target.category_name, v as number)}
                        step={1}
                        min={0}
                        max={100}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Visual Comparison */}
          <Grid item xs={12} lg={8}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <GlassCard sx={{ height: '400px' }}>
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>Current vs. Target Allocation</Typography>
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <ChartTooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: theme.shadows[3] }}
                          />
                          <Legend />
                          <Bar dataKey="Current" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Target" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </GlassCard>
              </Grid>

              {/* Suggestions Table */}
              <Grid item xs={12}>
                <GlassCard>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                      <TrendingUpIcon color="primary" />
                      <Typography variant="h6" fontWeight={600}>Recommended Actions</Typography>
                    </Box>

                    {rebalanceData?.suggestions && rebalanceData.suggestions.length > 0 ? (
                      <TableContainer component={Box}>
                        <Table sx={{ minWidth: 650 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Symbol</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Shares</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Est. Price</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Total Value</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rebalanceData.suggestions.map((s, i) => (
                              <TableRow key={i} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell component="th" scope="row">
                                  <Typography variant="subtitle2" fontWeight={700}>
                                    {s.symbol === 'NEW_PICK' ? '???' : s.symbol}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <ActionIcon action={s.action} />
                                    <Typography variant="body2" fontWeight={600} color={s.action === 'BUY' ? 'success.main' : 'error.main'}>
                                      {s.action}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="right">{s.shares > 0 ? s.shares : 'N/A'}</TableCell>
                                <TableCell align="right">{s.estimated_price > 0 ? formatCurrency(s.estimated_price) : 'N/A'}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  {formatCurrency(s.estimated_total)}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">
                                    {s.reason}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Button size="small" variant="text" color="primary">
                                    Execute
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <InfoIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">
                          {rebalanceData?.summary || "No rebalancing suggestions yet. Try setting targets or refreshing data."}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </GlassCard>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </MainLayout>
  );
};
