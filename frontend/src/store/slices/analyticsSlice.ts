// src/store/slices/analyticsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { analyticsService, AnalyticsResponse, BenchmarkComparison } from '../../services/analyticsService';

interface AnalyticsState {
  analytics: AnalyticsResponse | null;
  benchmarkComparison: BenchmarkComparison | null;
  isLoading: boolean;
  isLoadingBenchmark: boolean;
  error: string | null;
  benchmarkError: string | null;
  lastUpdated: string | null;
}

const initialState: AnalyticsState = {
  analytics: null,
  benchmarkComparison: null,
  isLoading: false,
  isLoadingBenchmark: false,
  error: null,
  benchmarkError: null,
  lastUpdated: null,
};

export const fetchAnalytics = createAsyncThunk(
  'analytics/fetchAnalytics',
  async (userId: number, { rejectWithValue }) => {
    try {
      const data = await analyticsService.getPortfolioAnalytics(userId);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchBenchmarkComparison = createAsyncThunk(
  'analytics/fetchBenchmarkComparison',
  async (
    { userId, timeframe }: { userId: number; timeframe: '1M' | '6M' | '1Y' | '3Y' | 'MAX' },
    { rejectWithValue }
  ) => {
    try {
      const data = await analyticsService.getBenchmarkComparison(userId, timeframe);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.benchmarkError = null;
    },
    clearAnalytics: (state) => {
      state.analytics = null;
      state.benchmarkComparison = null;
      state.error = null;
      state.benchmarkError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Analytics
      .addCase(fetchAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.analytics = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Benchmark Comparison
      .addCase(fetchBenchmarkComparison.pending, (state) => {
        state.isLoadingBenchmark = true;
        state.benchmarkError = null;
      })
      .addCase(fetchBenchmarkComparison.fulfilled, (state, action) => {
        state.isLoadingBenchmark = false;
        state.benchmarkComparison = action.payload;
      })
      .addCase(fetchBenchmarkComparison.rejected, (state, action) => {
        state.isLoadingBenchmark = false;
        state.benchmarkError = action.payload as string;
      });
  },
});

export const { clearError, clearAnalytics } = analyticsSlice.actions;
export default analyticsSlice.reducer;
