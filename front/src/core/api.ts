// src/core/api.ts
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export const api = axios.create({
  baseURL: 'http://docker.itspectrum.fr:88/api',
});

// Intercepteur de REQUÊTE : Ajoute le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur de RÉPONSE : Gère les erreurs 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Le token est expiré ou invalide
      console.warn('Session expirée, déconnexion...');
      useAuthStore.getState().logout(); // Utilise Zustand en dehors de React
      // Optionnel : rediriger vers la page d'accueil/login
      if (window.location.pathname !== '/') {
        window.location.href = '/'; 
      }
    }
    return Promise.reject(error);
  }
);