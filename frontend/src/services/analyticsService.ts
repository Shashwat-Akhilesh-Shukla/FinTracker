// src/services/analyticsService.ts
import { apiClient } from './apiClient';

export interface PerformanceMetrics {
  sharpe_ratio: number;
  alpha: number;
  beta: number;
  volatility: number;
  max_drawdown: number;
  sortino_ratio: number;
}

export interface SectorAllocation {
  sector: string;
  percentage: number;
  value: number;
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
}

export interface AnalyticsResponse {
  user_id: number;
  performance_metrics: PerformanceMetrics;
  sector_allocation: SectorAllocation[];
  correlation_matrix: CorrelationMatrix | null;
  diversification_score: number;
  last_updated: string;
}

export interface BenchmarkData {
  date: string;
  portfolio_value: number;
  benchmark_value: number;
}

export interface BenchmarkComparison {
  timeframe: string;
  portfolio_data: BenchmarkData[];
  benchmark_returns: Record<string, number>;
}

export const analyticsService = {
  getPortfolioAnalytics: async (userId: number): Promise<AnalyticsResponse> => {
    try {
      const response = await apiClient.get(`/quant/analytics/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch portfolio analytics:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch analytics');
    }
  },

  getBenchmarkComparison: async (
    userId: number,
    timeframe: '1M' | '6M' | '1Y' | '3Y' | 'MAX'
  ): Promise<BenchmarkComparison> => {
    try {
      const response = await apiClient.get(
        `/quant/benchmark-comparison/${userId}?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch benchmark comparison:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch benchmark data');
    }
  },

  getHealthCheck: async () => {
    try {
      const response = await apiClient.get('/api/v1/health');
      return response.data;
    } catch (error: any) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
};
