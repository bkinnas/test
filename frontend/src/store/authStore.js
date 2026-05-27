import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const user = await api.getMe();
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token').catch(() => {});
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { user, token } = await api.login({ email, password });
    await SecureStore.setItemAsync('auth_token', token);
    set({ user, token, isAuthenticated: true });
    return user;
  },

  register: async (data) => {
    const { user, token } = await api.register(data);
    await SecureStore.setItemAsync('auth_token', token);
    set({ user, token, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token').catch(() => {});
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
}));
