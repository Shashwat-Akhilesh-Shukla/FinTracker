import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, BASE_URL } from '../constants/api';

export interface TargetAllocation {
  id?: number;
  category_name: string;
  target_percentage: number;
  category_type: string;
}

export interface RebalanceSuggestion {
  symbol: string;
  action: 'BUY' | 'SELL';
  shares: number;
  estimated_price: number;
  estimated_total: number;
  reason: string;
}

export interface SectorComparison {
  sector: string;
  current_percentage: number;
  target_percentage: number;
  difference_percentage: number;
  suggested_action_value: number;
}

export interface RebalanceData {
  portfolio_id: number;
  total_value: number;
  cash_balance: number;
  sector_comparisons: SectorComparison[];
  suggestions: RebalanceSuggestion[];
  summary: string;
}

export const useRebalancing = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<TargetAllocation[]>([]);
  const [rebalanceData, setRebalanceData] = useState<RebalanceData | null>(null);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.REBALANCE.GET_TARGETS}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTargets(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch targets');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTargets = async (newTargets: TargetAllocation[]) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.REBALANCE.SET_TARGETS}`, newTargets, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTargets(response.data);
      // Refresh suggestions after saving targets
      await fetchSuggestions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save targets');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.REBALANCE.GET_SUGGESTIONS}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRebalanceData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTargets();
    fetchSuggestions();
  }, [fetchTargets, fetchSuggestions]);

  return {
    loading,
    error,
    targets,
    rebalanceData,
    saveTargets,
    refresh: fetchSuggestions
  };
};
