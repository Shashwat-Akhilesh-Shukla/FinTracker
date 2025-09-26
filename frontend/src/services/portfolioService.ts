// frontend/src/services/portfolioService.ts
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../constants/api';

const handleApiError = (error: any, defaultMessage: string) => {
  console.error(defaultMessage, error);
  throw new Error(error?.response?.data?.detail || defaultMessage);
};

export const portfolioService = {
  getPortfolioSummary: async () => {
    try {
      console.log('Fetching portfolio summary...');
      const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.SUMMARY);
      console.log('Portfolio summary response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching portfolio summary:', error);
      throw error;
    }
  },

  getHoldings: async () => {
    try {
      console.log('Fetching holdings...');
      const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.HOLDINGS);
      console.log('Holdings response:', response.data);
      
      // Transform the data if needed to match the frontend Holding type
      const holdings = response.data.map((holding: any) => ({
        id: holding.id,
        symbol: holding.symbol,
        name: holding.name,
        shares: holding.shares,
        avg_cost: holding.avg_cost,
        current_price: holding.current_price,
        market_value: holding.market_value,
        day_change: holding.day_change,
        day_change_percent: holding.day_change_percent,
        total_return: holding.total_return,
        total_return_percent: holding.total_return_percent,
        weight: holding.weight,
        sector: holding.sector,
        industry: holding.industry,
        last_price_update: holding.last_updated
      }));
      
      return holdings;
    } catch (error) {
      console.error('Error fetching holdings:', error);
      throw error;
    }
  },

  addHolding: async (data: { symbol: string; shares: number; avg_cost: number }) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.PORTFOLIO.HOLDINGS, data);
      return response.data;
    } catch (error: any) {
      handleApiError(error, 'Failed to add holding');
    }
  },

  getTransactions: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.TRANSACTIONS);
      return response.data;
    } catch (error: any) {
      handleApiError(error, 'Failed to fetch transactions');
    }
  },

  getPortfolioHistory: async (timeframe: string) => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.PORTFOLIO.HISTORY}?timeframe=${timeframe}`);
      return response.data;
    } catch (error: any) {
      handleApiError(error, 'Failed to fetch portfolio history');
    }
  },

  getPortfolioMetrics: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.METRICS);
      return response.data;
    } catch (error: any) {
      handleApiError(error, 'Failed to fetch portfolio metrics');
    }
  },

  updateHolding: async (id: number, data: { shares?: number; avg_cost?: number }) => {
    try {
      // Map camelCase to snake_case for backend compatibility
      const payload = {
        shares: data.shares,
        avg_cost: data.avg_cost
      };
      const response = await apiClient.put(`${API_ENDPOINTS.PORTFOLIO.HOLDINGS}/${id}`, payload);
      return response.data;
    } catch (error: any) {
      handleApiError(error, 'Failed to update holding');
    }
  },

  deleteHolding: async (id: number) => {
    try {
      await apiClient.delete(`${API_ENDPOINTS.PORTFOLIO.HOLDINGS}/${id}`);
    } catch (error: any) {
      handleApiError(error, 'Failed to delete holding');
    }
  },

  addTransaction: async (data: { 
    symbol: string;
    type: 'BUY' | 'SELL';
    shares: number;
    price: number;
    date?: string;
  }) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.PORTFOLIO.TRANSACTIONS, data);
      return response.data;
    } catch (error: any) {
      handleApiError(error, 'Failed to add transaction');
    }
  }
};
