import { defineStore } from 'pinia'
import axios from 'axios'
import { useRouter } from 'vue-router'

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
          throw new Error(data.error || 'Login error');
        }

        this.token = data.token;
        localStorage.setItem('token', data.token);

        // Immediately load user after login
        await this.fetchUser();

      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    async fetchUser() {
      if (!this.token) {
        console.log('No token, skipping user loading');
        return;
      }

      try {
        const res = await fetch('http://localhost:3000/api/auth/me', {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        });

        if (!res.ok) {
          // If 401 - token is invalid
          if (res.status === 401) {
            console.log('Token is invalid, performing logout');
            this.logout();
            return;
          }
          throw new Error('Error fetching user');
        }

        const data = await res.json();
        this.user = data.user;
        localStorage.setItem('user', JSON.stringify(this.user));

      } catch (error) {
        console.error('Error loading user:', error);
        this.logout();
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/')
    }
  }
})
