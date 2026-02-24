<template>
  <div class="contact-page">
    <!-- Hero Section -->
    <section class="contact-hero">
      <div class="hero-content">
        <h1>Get in Touch</h1>
        <p>Have questions or feedback? We'd love to hear from you.</p>
      </div>
    </section>

    <div class="contact-body">
      <!-- Contact Info Cards -->
      <div class="info-cards">
        <div class="info-card">
          <h3>Email</h3>
          <p>teamflow@gmail.com</p>
          <a href="mailto:vladimiravgustin123@gmail.com" class="info-link">Send email →</a>
        </div>
        <div class="info-card">
          <h3>Location</h3>
          <p>Rīga, Latvia</p>
        </div>
      </div>

      <!-- Contact Form + FAQ -->
      <div class="contact-grid">
        <!-- Form -->
        <div class="form-section">
          <h2>Send us a message</h2>
          <form @submit.prevent="submitForm" class="contact-form">
            <div class="form-group">
              <label for="name">Name</label>
              <input id="name" v-model="form.name" type="text" placeholder="Your name" required />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" v-model="form.email" type="email" placeholder="your@email.com" required />
            </div>
            <div class="form-group">
              <label for="subject">Subject</label>
              <select id="subject" v-model="form.subject" required>
                <option value="" disabled>Select a topic</option>
                <option value="general">General Question</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="account">Account Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label for="message">Message</label>
              <textarea id="message" v-model="form.message" rows="5" placeholder="Tell us what's on your mind..." required></textarea>
            </div>
            <button type="submit" class="submit-btn" :disabled="sending">
              {{ sending ? 'Sending...' : 'Send Message' }}
            </button>
            <p v-if="sent" class="success-msg">✓ Message sent! We'll get back to you soon.</p>
            <p v-if="errorMsg" class="error-msg">✗ {{ errorMsg }}</p>
          </form>
        </div>

        <!-- FAQ -->
        <div class="faq-section">
          <h2>Frequently Asked Questions</h2>
          <div class="faq-list">
            <div 
              v-for="(item, i) in faqs" 
              :key="i" 
              class="faq-item"
              :class="{ open: openFaq === i }"
              @click="toggleFaq(i)"
            >
              <div class="faq-question">
                <span>{{ item.q }}</span>
                <span class="faq-toggle">{{ openFaq === i ? '−' : '+' }}</span>
              </div>
              <div class="faq-answer" v-show="openFaq === i">
                {{ item.a }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const form = ref({
  name: '',
  email: '',
  subject: '',
  message: ''
})
const sending = ref(false)
const sent = ref(false)
const errorMsg = ref('')
const openFaq = ref(null)

const faqs = [
  { q: 'How do I create a team?', a: 'Register as a Coach, then click "Create Team" in the navigation bar. You\'ll need to choose a name and a unique team code.' },
  { q: 'How do players join a team?', a: 'Players can join using the team code. Click "Join Team" in the nav bar and enter the code provided by your coach.' },
  { q: 'Can a coach join an existing team?', a: 'Yes! A coach without a team can join another team using the team code, just like players.' },
  { q: 'How does attendance tracking work?', a: 'Before each practice, players mark whether they can attend. If they can\'t, they provide a reason. Coaches see a summary of all responses.' },
  { q: 'Can I change my role after registering?', a: 'Currently, roles are set at registration. Contact support if you need to change your role.' },
  { q: 'Is the team chat real-time?', a: 'Yes! The chat uses WebSocket connections for instant messaging. You can also send direct messages to teammates.' },
]

const toggleFaq = (index) => {
  openFaq.value = openFaq.value === index ? null : index
}

const submitForm = async () => {
  sending.value = true
  errorMsg.value = ''
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.value.name,
        email: form.value.email,
        subject: form.value.subject,
        message: form.value.message
      })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to send')
    }
    sent.value = true
    form.value = { name: '', email: '', subject: '', message: '' }
    setTimeout(() => { sent.value = false }, 4000)
  } catch (err) {
    console.error('Error sending message:', err)
    errorMsg.value = err.message || 'Something went wrong. Please try again.'
    setTimeout(() => { errorMsg.value = '' }, 5000)
  } finally {
    sending.value = false
  }
}
</script>

<style>
.contact-page {
  min-height: 100vh;
}

/* Hero */
.contact-hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80px 20px 60px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.contact-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.hero-content {
  position: relative;
  z-index: 1;
}

.contact-hero h1 {
  color: white;
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 10px;
}

.contact-hero p {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.15rem;
  margin: 0;
}

/* Body */
.contact-body {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 20px 60px;
}

/* Info Cards */
.info-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: -40px;
  position: relative;
  z-index: 2;
  margin-bottom: 50px;
}

.info-card {
  background: var(--card-bg, #fff);
  border-radius: 16px;
  padding: 30px 25px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.info-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.info-icon {
  font-size: 2.2rem;
  margin-bottom: 12px;
}

.info-card h3 {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-color, #1a1a2e);
}

.info-card p {
  margin: 0 0 12px;
  color: var(--text-secondary, #666);
  font-size: 0.95rem;
}

.info-link {
  color: #667eea;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;
}

.info-link:hover {
  color: #764ba2;
}

/* Grid */
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: start;
}

/* Form */
.form-section h2,
.faq-section h2 {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 24px;
  color: var(--text-color, #1a1a2e);
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color, #555);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px 14px;
  border: 1.5px solid var(--border-color, #ddd);
  border-radius: 10px;
  font-size: 0.95rem;
  font-family: inherit;
  background: var(--card-bg, #fff);
  color: var(--text-color, #333);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.submit-btn {
  padding: 14px 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
  align-self: flex-start;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.35);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-msg {
  color: #4caf50;
  font-weight: 600;
  font-size: 0.95rem;
  margin: 0;
}

.error-msg {
  color: #f44336;
  font-weight: 600;
  font-size: 0.95rem;
  margin: 0;
}

/* FAQ */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.faq-item {
  background: var(--card-bg, #fff);
  border: 1.5px solid var(--border-color, #e8e8e8);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.faq-item:hover {
  border-color: #667eea;
}

.faq-item.open {
  border-color: #667eea;
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.1);
}

.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  font-weight: 600;
  color: var(--text-color, #333);
  font-size: 0.95rem;
  gap: 12px;
}

.faq-toggle {
  font-size: 1.3rem;
  color: #667eea;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
  font-weight: 300;
}

.faq-answer {
  padding: 0 18px 16px;
  color: var(--text-secondary, #666);
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Dark mode */
.dark-mode .info-card {
  background: #1e1e1e;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.dark-mode .info-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}

.dark-mode .info-card h3 {
  color: #f4f4f4;
}

.dark-mode .info-card p {
  color: #aaa;
}

.dark-mode .form-group input,
.dark-mode .form-group select,
.dark-mode .form-group textarea {
  background: #1e1e1e;
  border-color: #444;
  color: #f4f4f4;
}

.dark-mode .faq-item {
  background: #1e1e1e;
  border-color: #333;
}

.dark-mode .faq-item:hover,
.dark-mode .faq-item.open {
  border-color: #667eea;
}

.dark-mode .faq-question {
  color: #f4f4f4;
}

.dark-mode .faq-answer {
  color: #aaa;
}

.dark-mode .submit-btn:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
}

/* Responsive */
@media (max-width: 768px) {
  .info-cards {
    grid-template-columns: 1fr;
    margin-top: -30px;
  }

  .contact-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .contact-hero h1 {
    font-size: 1.8rem;
  }
}
</style>
