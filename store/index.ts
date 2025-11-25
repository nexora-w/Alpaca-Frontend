import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './slices/walletSlice';
import securityReducer from './slices/securitySlice';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    security: securityReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

