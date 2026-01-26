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
        const res = await fetch('/api/auth/login', {
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
        const res = await fetch('/api/auth/me', {
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
      // Navigate to home page after logout
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/';
      }
    },

    // Initialize auth state from localStorage
    async initializeAuth() {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        this.token = token;
        try {
          this.user = JSON.parse(user);
          // Verify token is still valid
          await this.fetchUser();
        } catch (error) {
          console.error('Error initializing auth:', error);
          this.logout();
        }
      }
    }
  }
})