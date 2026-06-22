// src/services/authService.ts
import { api } from '../core/api';
import type { AuthResponse, AuthUser, ProfileUpdateResponse } from '../shared/types/auth';

export const authService = {
  login: async (email: string, password: string, recaptchaToken?: string): Promise<AuthResponse> => {
    try {
      const payload: Record<string, unknown> = { email, password };
      if (recaptchaToken) payload.recaptcha_token = recaptchaToken;
      const response = await api.post<AuthResponse>('/login', payload);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la connexion :', error);
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

  register: async (email: string, username: string, password: string, recaptchaToken?: string): Promise<{ message: string }> => {
    try {
      const payload: Record<string, unknown> = { email, username, password };
      if (recaptchaToken) payload.recaptcha_token = recaptchaToken;
      const response = await api.post<{ message: string }>('/register', payload);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'inscription :", error);
      throw error;
    }
  },

  getProfile: async (): Promise<AuthUser> => {
    try {
      const response = await api.get<AuthUser>('/me/profile');
      return response.data;
    } catch (error) {
      console.error('Erreur lors du chargement du profil :', error);
      throw error;
    }
  },

  updateProfile: async (email: string): Promise<ProfileUpdateResponse> => {
    try {
      const response = await api.put<ProfileUpdateResponse>('/me/profile', { email });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise a jour du profil :', error);
      throw error;
    }
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> => {
    try {
      const response = await api.put<{ message: string }>('/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe :', error);
      throw error;
    }
  },

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    try {
      const response = await api.post<{ message: string }>('/password/forgot', {
        email,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la demande de reinitialisation :', error);
      throw error;
    }
  },

  resetPassword: async (
    email: string,
    token: string,
    password: string
  ): Promise<{ message: string }> => {
    try {
      const response = await api.post<{ message: string }>('/password/reset', {
        email,
        token,
        password,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la reinitialisation du mot de passe :', error);
      throw error;
    }
  },
};
