import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://docker.itspectrum.fr:88/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});