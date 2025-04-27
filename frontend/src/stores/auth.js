import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
  }),
  actions: {
    async login(username, password) {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }

      this.user = data.user;
      this.token = data.token;
      localStorage.setItem('token', data.token);
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
          // Если 401 - очищаем токен и юзера
          if (res.status === 401) {
            console.log('Токен недействителен, выполняем logout');
            this.logout();
            return;
          }
          throw new Error('Ошибка получения пользователя');
        }
    
        const data = await res.json();
        this.user = data.user;
    
      } catch (error) {
        console.error('Ошибка при загрузке пользователя:', error);
      }
    },
    
    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
    }
  },
  getters: {
    isAuthenticated: (state) => !!state.user
  }
});