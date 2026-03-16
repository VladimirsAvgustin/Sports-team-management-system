<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-content">
          <h1 class="hero-title">
            <span class="title-line">Welcome to</span>
            <span class="title-highlight">TeamFlow</span>
          </h1>
          <p class="hero-subtitle">
            The ultimate platform for sports team management, scheduling, and communication
          </p>
          <div class="hero-stats" v-if="isLoggedIn">
            <div class="stat">
              <div class="stat-number">{{ userData.teamCount }}</div>
              <div class="stat-label">Teams</div>
            </div>
            <div class="stat">
              <div class="stat-number">{{ userData.upcomingEvents }}</div>
              <div class="stat-label">Upcoming Events</div>
            </div>
            <div class="stat">
              <div class="stat-number">{{ userData.playerCount }}</div>
              <div class="stat-label">Players</div>
            </div>
          </div>
          <div class="hero-actions">
            <button v-if="!isLoggedIn" class="btn btn-primary btn-large" @click="showLoginModal">
              Get Started
            </button>
            <div v-else class="action-buttons">
              <button class="btn btn-primary" @click="goToDashboard">
                <span class="btn-icon">📊</span>
                Dashboard
              </button>
              <button class="btn btn-secondary" @click="goToCreateTeam">
                <span class="btn-icon">➕</span>
                Create Team
              </button>
              <button class="btn btn-outline" @click="goToSchedule">
                <span class="btn-icon">📅</span>
                Schedule
              </button>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <img :src="logo" alt="TeamFlow Dashboard" class="hero-image" />
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <div class="section-header">
          <h2>Everything You Need to Manage Your Team</h2>
          <p>Powerful tools designed specifically for sports teams</p>
        </div>

        <div class="features-grid">
          <!-- For logged out users -->
          <div class="feature-card" v-if="!isLoggedIn">
            <div class="feature-icon">🔐</div>
            <h3>Secure Login</h3>
            <p>Access your team dashboard with secure authentication</p>
            <button class="btn btn-outline" @click="showLoginModal">Login Now</button>
          </div>

          <!-- Schedule Card -->
          <div class="feature-card featured-card">
            <div class="feature-icon">📅</div>
            <h3>Smart Scheduling</h3>
            <p v-if="!isLoggedIn">Organize practices, games, and team events with ease</p>
            <div v-else class="schedule-preview">
              <h4>Upcoming Events</h4>
              <div class="event-list">
                <div v-for="event in upcomingEvents" :key="event.id" class="event-item">
                  <div class="event-date">{{ formatEventDate(event.date) }}</div>
                  <div class="event-details">
                    <div class="event-title">{{ event.title }}</div>
                    <div class="event-meta">{{ event.time }} • {{ event.location }}</div>
                  </div>
                </div>
                <div v-if="upcomingEvents.length === 0" class="no-events">
                  No upcoming events scheduled
                </div>
              </div>
            </div>
            <button class="btn btn-primary" @click="goToSchedule">
              View Schedule
            </button>
          </div>

          <!-- Registration Card -->
          <div class="feature-card" v-if="!isLoggedIn">
            <div class="feature-icon">👥</div>
            <h3>Team Registration</h3>
            <p>Register your team and start managing in minutes</p>
            <button class="btn btn-primary" @click="goToRegistration">Register Team</button>
          </div>

          <!-- Additional features for logged in users -->
          <div class="feature-card" v-if="isLoggedIn">
            <div class="feature-icon">🏀</div>
            <h3>Team Management</h3>
            <p>Manage players, positions, and team rosters</p>
            <button class="btn btn-outline" @click="goToTeamManagement">Manage Teams</button>
          </div>

          <div class="feature-card" v-if="isLoggedIn">
            <div class="feature-icon">📊</div>
            <h3>Advanced Statistics</h3>
            <p>Track player performance and team progress</p>
            <button class="btn btn-outline" @click="goToStatistics">View Stats</button>
          </div>

          <div class="feature-card" v-if="isLoggedIn">
            <div class="feature-icon">💬</div>
            <h3>Team Communication</h3>
            <p>Send announcements and messages to your team</p>
            <button class="btn btn-outline" @click="goToMessages">Open Messages</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent Activity -->
    <section v-if="isLoggedIn && recentActivity.length > 0" class="recent-activity">
      <div class="container">
        <div class="section-header">
          <h2>Recent Activity</h2>
          <p>Latest updates from your teams</p>
        </div>
        <div class="activity-feed">
          <div v-for="activity in recentActivity" :key="activity.id" class="activity-item">
            <div class="activity-avatar">
              {{ getInitials(activity.user) }}
            </div>
            <div class="activity-content">
              <div class="activity-text">
                <strong>{{ activity.user }}</strong> {{ activity.action }}
              </div>
              <div class="activity-time">{{ activity.time }}</div>
            </div>
            <div class="activity-badge" :class="activity.type">
              {{ activity.type }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            <h4>TeamFlow</h4>
            <p>Making team management simple and effective</p>
          </div>
          <div class="footer-section">
            <h5>Product</h5>
            <ul>
              <li><a href="#">Features</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">API</a></li>
            </ul>
          </div>
          <div class="footer-section">
            <h5>Support</h5>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">Status</a></li>
            </ul>
          </div>
          <div class="footer-section">
            <h5>Legal</h5>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2025 TeamFlow. All rights reserved.</p>
        </div>
      </div>
    </footer>

    <!-- Login Modal -->
    <LoginModal 
      v-if="showModal"
      @close="closeModal"
      @login="handleLogin"
    />
  </div>
</template>

<script>
import logo from '@/assets/sport_system_logo.png';
import LoginModal from '@/components/LoginModal.vue';

export default {
  name: 'HomePage',
  components: {
    LoginModal,
  },
  data() {
    return {
      logo,
      showModal: false,
      isLoggedIn: false,
      userData: {
        name: '',
        teamCount: 0,
        upcomingEvents: 0,
        playerCount: 0
      },
      upcomingEvents: [],
      recentActivity: []
    };
  },
  mounted() {
    this.checkAuthStatus();
    if (this.isLoggedIn) {
      this.loadUserData();
    }
  },
  watch: {
    isLoggedIn(newValue) {
      if (newValue) {
        this.loadUserData();
      } else {
        // Clear data when logged out
        this.userData = {
          name: '',
          teamCount: 0,
          upcomingEvents: 0,
          playerCount: 0
        };
        this.upcomingEvents = [];
        this.recentActivity = [];
      }
    }
  },
  methods: {
    checkAuthStatus() {
      const user = localStorage.getItem('user');
      this.isLoggedIn = !!user;
      if (this.isLoggedIn && user) {
        try {
          const userData = JSON.parse(user);
          this.userData.name = userData.name || ((userData.name || '') + ' ' + (userData.surname || '')).trim() || 'User';
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    },

    async loadUserData() {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, cannot load user data');
        return;
      }

      try {
        // Load user statistics
        await this.loadUserStats();
        
        // Load upcoming events
        await this.loadUpcomingEvents();
        
        // Load recent activity
        await this.loadRecentActivity();
        
      } catch (error) {
        console.error('Error loading user data:', error);
        // Fall back to empty data if API fails
        this.userData = {
          name: this.userData.name || 'User',
          teamCount: 0,
          upcomingEvents: 0,
          playerCount: 0
        };
        this.upcomingEvents = [];
        this.recentActivity = [];
      }
    },

    async loadUserStats() {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/user/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }

      const stats = await response.json();
      this.userData = {
        ...this.userData,
        teamCount: stats.teamCount,
        upcomingEvents: stats.upcomingEvents,
        playerCount: stats.playerCount
      };
    },

    async loadUpcomingEvents() {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/user/upcoming-events', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch upcoming events');
      }

      const events = await response.json();
      this.upcomingEvents = events.map(event => ({
        id: event.id,
        title: event.title,
        date: new Date(event.date),
        time: event.time,
        location: event.location,
        team: event.team,
        type: event.type
      }));
    },

    async loadRecentActivity() {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/user/recent-activity', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recent activity');
      }

      const activities = await response.json();
      this.recentActivity = activities;
    },

    formatEventDate(date) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
      } else {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
    },

    getInitials(name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
    },

    showLoginModal() {
      this.showModal = true;
    },

    closeModal() {
      this.showModal = false;
    },

    async handleLogin(email, password) {
      console.log('Login attempt:', email);
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          alert('Login failed: ' + (data.error || 'Unknown error'));
          return;
        }

        // Store token and user data
        localStorage.setItem('token', data.token);
        
        // Fetch user details
        const userResponse = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          localStorage.setItem('user', JSON.stringify(userData.user));
          this.userData.name = userData.user.name + ' ' + userData.user.surname;
        }

        this.isLoggedIn = true;
        this.closeModal();
        
        // Load fresh data after login
        await this.loadUserData();

        alert(`Welcome back, ${this.userData.name}!`);
      } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: Network error');
      }
    },

    // Navigation methods
    goToRegistration() {
      this.$router.push('/register');
    },

    goToDashboard() {
      this.$router.push('/profile');
    },

    goToCreateTeam() {
      this.$router.push('/create-team');
    },

    goToSchedule() {
      if (this.isLoggedIn) {
        this.$router.push('/team-schedule/1');
      } else {
        this.showLoginModal();
      }
    },

    goToTeamManagement() {
      this.$router.push('/profile');
    },

    goToStatistics() {
      alert('Statistics dashboard coming soon!');
    },

    goToMessages() {
      alert('Team messaging feature coming soon!');
    }
  }
};
</script>

<style scoped>
/* Scoped styles */
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  transition: all 0.3s ease;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Hero Section */
.hero {
  padding: 80px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.hero-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 24px;
}

.title-line {
  display: block;
}

.title-highlight {
  background: linear-gradient(135deg, #ffd89b, #19547b);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.25rem;
  margin-bottom: 32px;
  opacity: 0.9;
  line-height: 1.6;
}

.hero-stats {
  display: flex;
  gap: 40px;
  margin-bottom: 40px;
}

.stat {
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.hero-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-image {
  max-width: 100%;
  height: auto;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  font-size: 1rem;
}

.btn-large {
  padding: 16px 32px;
  font-size: 1.1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #0073e6, #005bb5);
  color: white;
  box-shadow: 0 4px 15px rgba(0, 115, 230, 0.3);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

.btn-outline {
  background: transparent;
  color: #0073e6;
  border: 2px solid #0073e6;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 115, 230, 0.4);
}

.btn-icon {
  font-size: 1.2rem;
}

/* Features Section */
.features {
  padding: 80px 0;
  background: white;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #1e293b, #475569);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.section-header p {
  font-size: 1.2rem;
  color: #64748b;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.feature-card {
  background: white;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.3s;
  text-align: center;
}

.featured-card {
  border: 2px solid #0073e6;
  transform: scale(1.02);
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1e293b;
}

.feature-card p {
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 24px;
}

/* Schedule Preview */
.schedule-preview {
  text-align: left;
}

.schedule-preview h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1e293b;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e2e8f0;
}

.event-item:last-child {
  border-bottom: none;
}

.event-date {
  font-weight: 600;
  color: #0073e6;
  min-width: 80px;
  font-size: 0.9rem;
}

.event-details {
  flex: 1;
}

.event-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.event-meta {
  font-size: 0.8rem;
  color: #64748b;
}

.no-events {
  text-align: center;
  color: #64748b;
  font-style: italic;
  padding: 20px 0;
}

/* Recent Activity */
.recent-activity {
  padding: 60px 0;
  background: white;
}

.activity-feed {
  max-width: 800px;
  margin: 0 auto;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 12px;
  transition: all 0.3s;
}

.activity-item:hover {
  border-color: #0073e6;
  box-shadow: 0 4px 15px rgba(0, 115, 230, 0.1);
}

.activity-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0073e6, #005bb5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-weight: 500;
  margin-bottom: 4px;
}

.activity-time {
  font-size: 0.8rem;
  color: #64748b;
}

.activity-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.activity-badge.event {
  background: #dbeafe;
  color: #1e40af;
}

.activity-badge.team {
  background: #dcfce7;
  color: #166534;
}

.activity-badge.stats {
  background: #fef3c7;
  color: #92400e;
}

/* Footer */
.footer {
  background: #0f172a;
  color: white;
  padding: 60px 0 20px;
}

.footer-content {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}

.footer-section h4 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #60a5fa, #3b82f6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.footer-section h5 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #cbd5e1;
}

.footer-section ul {
  list-style: none;
  padding: 0;
}

.footer-section li {
  margin-bottom: 8px;
}

.footer-section a {
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.3s;
}

.footer-section a:hover {
  color: #60a5fa;
}

.footer-bottom {
  border-top: 1px solid #334155;
  padding-top: 20px;
  text-align: center;
  color: #94a3b8;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-container {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 40px;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-stats {
    justify-content: center;
    gap: 30px;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .footer-content {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}

@media (max-width: 480px) {
  .hero-stats {
    flex-direction: column;
    gap: 20px;
  }

  .stat-number {
    font-size: 2rem;
  }
}
</style>

<style>
/* Dark Mode Styles - Global (unscoped) */
html.dark-mode .home-page {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #e2e8f0;
}

html.dark-mode .features {
  background: #1e293b;
}

html.dark-mode .section-header h2 {
  background: linear-gradient(135deg, #f8fafc, #cbd5e1);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

html.dark-mode .section-header p {
  color: #94a3b8;
}

html.dark-mode .feature-card {
  background: #334155;
  border-color: #475569;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

html.dark-mode .feature-card h3 {
  color: #f1f5f9;
}

html.dark-mode .feature-card p {
  color: #cbd5e1;
}

html.dark-mode .featured-card {
  border-color: #3b82f6;
}

html.dark-mode .btn-outline {
  color: #60a5fa;
  border-color: #60a5fa;
}

html.dark-mode .schedule-preview h4 {
  color: #f1f5f9;
}

html.dark-mode .event-item {
  border-bottom-color: #475569;
}

html.dark-mode .event-title {
  color: #f1f5f9;
}

html.dark-mode .event-meta {
  color: #94a3b8;
}

html.dark-mode .no-events {
  color: #94a3b8;
}

html.dark-mode .recent-activity {
  background: #1e293b;
}

html.dark-mode .activity-item {
  background: #334155;
  border-color: #475569;
}

html.dark-mode .activity-text {
  color: #f1f5f9;
}

html.dark-mode .activity-time {
  color: #94a3b8;
}

html.dark-mode .activity-badge.event {
  background: #1e3a8a;
  color: #dbeafe;
}

html.dark-mode .activity-badge.team {
  background: #14532d;
  color: #dcfce7;
}

html.dark-mode .activity-badge.stats {
  background: #78350f;
  color: #fef3c7;
}
</style>