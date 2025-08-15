import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import taskSlice from './slices/taskSlice';
import userSlice from './slices/userSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    tasks: taskSlice,
    users: userSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
