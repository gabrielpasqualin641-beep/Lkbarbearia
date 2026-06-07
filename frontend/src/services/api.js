import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api',
  withCredentials: true, // Crucial para permitir o envio automático de cookies HttpOnly
});

// Interceptor de requisição para injetar JWT do localStorage se necessário
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
