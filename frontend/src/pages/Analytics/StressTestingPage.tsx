import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Slider,
  Paper,
  Divider,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  styled,
  useTheme,
  alpha
} from '@mui/material';
import {
  Warning as WarningIcon,
  Psychology as PsychologyIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  Security as SecurityIcon,
  Bolt as BoltIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useSelector } from 'react-redux';
import MainLayout from '../../components/layout/MainLayout';
import { RootState } from '../../store/store';
import { BASE_URL, API_ENDPOINTS } from '../../constants/api';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

const GlassCard = styled(Card)(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  borderRadius: '20px',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const ScenarioCard = styled(GlassCard)<{ risk: string }>(({ theme, risk }) => {
  const color = risk === 'Low' ? '#4caf50' : 
                risk === 'Moderate' ? '#ff9800' : 
                risk === 'High' ? '#f44336' : '#d32f2f';
  return {
    borderLeft: `6px solid ${color}`,
  };
});

const ImpactValue = styled(Typography)<{ negative?: boolean }>(({ theme, negative }) => ({
  color: negative ? theme.palette.error.main : theme.palette.success.main,
  fontWeight: 700,
  fontSize: '1.5rem',
}));

export const StressTestingPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [customShock, setCustomShock] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.id) return;
        const resp = await axios.get(`${BASE_URL}${API_ENDPOINTS.QUANT.STRESS_TEST}/${user.id}`);
        setData(resp.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load stress test data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress size={60} thickness={4} />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
        </Container>
      </MainLayout>
    );
  }

  const customImpactPct = customShock * (data?.portfolio_beta || 1.0);
  const customValueLoss = (customImpactPct / 100) * (data?.current_value || 0);
  const remainingValue = (data?.current_value || 0) - customValueLoss;

  return (
    <MainLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" fontWeight={800} gutterBottom sx={{ 
            background: 'linear-gradient(45deg, #1e3c72 0%, #2a5298 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Market Stress Testing
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Simulate portfolio resilience against historical crashes and hypothetical shocks.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Main Controls & Custom Shock */}
          <Grid item xs={12} lg={8}>
            <GlassCard sx={{ p: 2, mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
                  <BoltIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h5" fontWeight={700}>Interactive Shock Simulator</Typography>
                    <Typography variant="body2" color="text.secondary">Manually apply a market-wide percentage drop</Typography>
                  </Box>
                </Box>

                <Box sx={{ px: 4, py: 2 }}>
                  <Typography gutterBottom fontWeight={600} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Market Drop Intensity</span>
                    <span style={{ color: theme.palette.error.main }}>-{customShock}%</span>
                  </Typography>
                  <Slider
                    value={customShock}
                    onChange={(_, value) => setCustomShock(value as number)}
                    min={0}
                    max={100}
                    step={1}
                    sx={{
                      height: 12,
                      '& .MuiSlider-rail': { opacity: 0.2, backgroundColor: '#bfbfbf' },
                      '& .MuiSlider-track': { border: 'none', backgroundColor: theme.palette.error.main },
                      '& .MuiSlider-thumb': {
                        height: 28,
                        width: 28,
                        backgroundColor: '#fff',
                        border: `4px solid ${theme.palette.error.main}`,
                        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                          boxShadow: 'inherit',
                        },
                      },
                    }}
                  />
                </Box>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: '15px' }}>
                      <Typography variant="caption" color="text.secondary" uppercase fontWeight={700}>Portfolio Beta</Typography>
                      <Typography variant="h4" fontWeight={800}>{data?.portfolio_beta.toFixed(2)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: '15px', borderColor: alpha(theme.palette.error.main, 0.3) }}>
                      <Typography variant="caption" color="error" uppercase fontWeight={700}>Est. Portfolio Loss</Typography>
                      <Typography variant="h4" fontWeight={800} color="error">-{customImpactPct.toFixed(1)}%</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: '15px' }}>
                      <Typography variant="caption" color="text.secondary" uppercase fontWeight={700}>Projected Ending Value</Typography>
                      <Typography variant="h4" fontWeight={800}>{formatCurrency(remainingValue)}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>

            <Typography variant="h5" fontWeight={700} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingDownIcon color="error" /> Historical Scenario Analysis
            </Typography>

            <Grid container spacing={3}>
              {data?.scenarios.map((scenario: any, idx: number) => (
                <Grid item xs={12} md={6} key={idx}>
                  <ScenarioCard risk={scenario.risk_level}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" fontWeight={700}>{scenario.scenario_name}</Typography>
                        <Chip 
                          label={scenario.risk_level} 
                          size="small" 
                          sx={{ 
                            fontWeight: 700, 
                            backgroundColor: alpha(scenario.risk_level === 'Low' ? '#4caf50' : '#f44336', 0.1),
                            color: scenario.risk_level === 'Low' ? '#4caf50' : '#f44336'
                          }} 
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Market benchmark dropped by {scenario.market_drop_pct}%
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Est. Value Loss</Typography>
                          <ImpactValue negative>-{scenario.estimated_portfolio_drop_pct}%</ImpactValue>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary">Dollar Impact</Typography>
                          <Typography variant="h6" fontWeight={700}>-{formatCurrency(scenario.estimated_portfolio_drop_value)}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </ScenarioCard>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* AI Advisor & Risk Insights */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ position: 'sticky', top: 24 }}>
              <GlassCard sx={{ mb: 4, background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: '#fff' }}>
                <CardContent sx={{ position: 'relative', overflow: 'hidden' }}>
                  <AccountBalanceIcon sx={{ position: 'absolute', right: -20, bottom: -20, fontSize: 150, opacity: 0.1 }} />
                  <Typography variant="h6" fontWeight={700} gutterBottom>Current Portfolio Base</Typography>
                  <Typography variant="h3" fontWeight={800} sx={{ my: 2 }}>{formatCurrency(data?.current_value)}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip icon={<SecurityIcon sx={{ color: '#fff !important' }} />} label="Protected" size="small" sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} variant="outlined" />
                    <Chip icon={<TrendingDownIcon sx={{ color: '#fff !important' }} />} label={`Beta: ${data?.portfolio_beta.toFixed(2)}`} size="small" sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} variant="outlined" />
                  </Box>
                </CardContent>
              </GlassCard>

              <GlassCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                    <PsychologyIcon color="secondary" />
                    <Typography variant="h6" fontWeight={700}>FinBot AI Risk Analysis</Typography>
                  </Box>
                  <Alert severity="info" icon={<PsychologyIcon />} sx={{ 
                    borderRadius: '15px',
                    '& .MuiAlert-message': { fontSize: '0.95rem', lineHeight: 1.6 }
                  }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Intelligent Advisor Insights</AlertTitle>
                    {data?.ai_advice}
                  </Alert>
                  
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>Risk Mitigation Strategy</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                      <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: '12px' }}>
                        <Box sx={{ p: 1, backgroundColor: alpha(theme.palette.primary.main, 0.1), borderRadius: '8px' }}>
                          <SecurityIcon color="primary" />
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>High Beta Warning</Typography>
                          <Typography variant="caption" color="text.secondary">Reduce tech weights to lower sensitivity.</Typography>
                        </Box>
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: '12px' }}>
                        <Box sx={{ p: 1, backgroundColor: alpha(theme.palette.warning.main, 0.1), borderRadius: '8px' }}>
                          <BoltIcon color="warning" />
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>Hedge Strategy</Typography>
                          <Typography variant="caption" color="text.secondary">Consider $SH or $VIX calls for protection.</Typography>
                        </Box>
                      </Paper>
                    </Box>
                  </Box>
                </CardContent>
              </GlassCard>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </MainLayout>
  );
};
