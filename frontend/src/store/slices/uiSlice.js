import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: false,
  loading: false,
  notifications: [],
  theme: 'light',
  modal: {
    isOpen: false,
    type: null,
    data: null
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload,
        timestamp: new Date().toISOString()
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    openModal: (state, action) => {
      state.modal = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload.data || null
      };
    },
    closeModal: (state) => {
      state.modal = {
        isOpen: false,
        type: null,
        data: null
      };
    }
  }
});

export const {
  setSidebarOpen,
  setLoading,
  addNotification,
  removeNotification,
  clearNotifications,
  setTheme,
  openModal,
  closeModal
} = uiSlice.actions;

export default uiSlice.reducer;
