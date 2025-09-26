/**
 * Redux store configuration that:
 * - Sets up global state management
 * - Combines all feature reducers
 * - Configures middleware and dev tools
 * - Exports type definitions for TypeScript
 */

// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { composeWithDevTools } from '@redux-devtools/extension'
import { authSlice } from './slices/authSlice';
import { portfolioSlice } from './slices/portfolioSlice';
import { marketSlice } from './slices/marketSlice';
import analyticsReducer from './slices/analyticsSlice';
import themeReducer from './slices/themeSlice';
import { apiSlice } from './api/apiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    portfolio: portfolioSlice.reducer,
    market: marketSlice.reducer,
    api: apiSlice.reducer,
    analytics: analyticsReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(apiSlice.middleware),
  
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
