import { api } from '../core/api';
import type { AuthResponse } from '../shared/types/auth';

// Les identifiants par défaut de ton backend
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

  // Tu pourras ajouter ici des méthodes pour logout ou rafraîchir le token
};