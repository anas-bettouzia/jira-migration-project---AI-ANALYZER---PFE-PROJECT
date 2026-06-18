import { create } from 'zustand';
import type { AuthUser } from '../shared/types/auth';

const readStoredUser = (): AuthUser | null => {
  const storedUser = localStorage.getItem('authUser');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem('authUser');
    return null;
  }
};

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setToken: (token: string | null, user?: AuthUser) => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: readStoredUser(),
  isAuthenticated: Boolean(localStorage.getItem('token')),

  setToken: (token, user) => {
    if (token) {
      localStorage.setItem('token', token);
      if (user) localStorage.setItem('authUser', JSON.stringify(user));
      set({ token, user: user ?? readStoredUser(), isAuthenticated: true });
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('authUser');
      set({ token: null, user: null, isAuthenticated: false });
    }
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('authUser', JSON.stringify(user));
      set({ user });
      return;
    }

    localStorage.removeItem('authUser');
    set({ user: null });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authUser');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
