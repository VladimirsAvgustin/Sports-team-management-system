import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token
  },

  actions: {
    async login(username, password) {
      try {
        const res = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Ошибка входа');
        }

        this.token = data.token;
        localStorage.setItem('token', data.token);

        // Сразу загружаем пользователя после логина
        await this.fetchUser();

      } catch (error) {
        console.error('Ошибка при входе:', error);
        throw error;
      }
    },

    async fetchUser() {
      if (!this.token) {
        console.log('Нет токена, пропускаем загрузку пользователя');
        return;
      }

      try {
        const res = await fetch('http://localhost:3000/api/auth/me', {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        });

        if (!res.ok) {
          // Если 401 - токен недействителен
          if (res.status === 401) {
            console.log('Токен недействителен, выполняем logout');
            this.logout();
            return;
          }
          throw new Error('Ошибка получения пользователя');
        }

        const data = await res.json();
        this.user = data.user;
        localStorage.setItem('user', JSON.stringify(this.user));

      } catch (error) {
        console.error('Ошибка при загрузке пользователя:', error);
        this.logout();
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
})
