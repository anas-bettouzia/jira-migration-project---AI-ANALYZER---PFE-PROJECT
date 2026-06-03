// src/services/authService.ts
import { api } from '../core/api';
import type { AuthResponse } from '../shared/types/auth';

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/login', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la connexion :", error);
      throw error;
    }
  },

  googleLogin: async (credential: string): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/google', {
        credential,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la connexion Google :', error);
      throw error;
    }
  },

  register: async (email: string, password: string): Promise<{ message: string }> => {
    try {
      const response = await api.post<{ message: string }>('/register', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'inscription :", error);
      throw error;
    }
  },
};
