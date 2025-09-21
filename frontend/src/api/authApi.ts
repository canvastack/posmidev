import { apiClient } from './client';
import { AuthResponse, LoginForm, RegisterForm, User } from '../types';

export const authApi = {
  login: async (data: LoginForm): Promise<AuthResponse> => {
    const response = await apiClient.post('/login', data);
    return response.data;
  },

  register: async (data: RegisterForm): Promise<AuthResponse> => {
    const response = await apiClient.post('/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/logout');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/user');
    return response.data;
  },
};