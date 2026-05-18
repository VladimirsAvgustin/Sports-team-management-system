<template>
  <div class="contact-page">
    <div class="contact-shell">
      <section class="contact-hero">
        <div class="hero-copy">
          <p class="eyebrow">{{ $t('contact.title') }}</p>
          <h1>{{ $t('contact.title') }}</h1>
          <p class="hero-description">{{ $t('contact.subtitle') }}</p>
        </div>

        <div class="hero-side">
          <div class="hero-card">
            <span class="hero-card-label">{{ $t('contact.email') }}</span>
            <strong>{{ supportEmail }}</strong>
            <a :href="`mailto:${supportEmail}`" class="hero-card-link">
              {{ $t('contact.sendEmail') }}
            </a>
          </div>
          <div class="hero-card soft">
            <span class="hero-card-label">{{ $t('contact.location') }}</span>
            <strong>{{ $t('contact.address') }}</strong>
          </div>
        </div>
      </section>

      <section class="contact-grid">
        <article class="panel form-panel">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">{{ $t('contact.sendMessage') }}</p>
              <h2>{{ $t('contact.sendMessage') }}</h2>
            </div>
            <span class="panel-chip">{{ $t('contact.readEveryMessage') }}</span>
          </div>

          <form @submit.prevent="submitForm" class="contact-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="name">{{ $t('contact.form.name') }}</label>
                <input id="name" v-model="form.name" type="text" :placeholder="$t('contact.form.yourName')" required />
              </div>

              <div class="form-group">
                <label for="email">{{ $t('contact.form.email') }}</label>
                <input id="email" v-model="form.email" type="email" :placeholder="emailPlaceholder" required />
              </div>
            </div>

            <div class="form-group">
              <label for="subject">{{ $t('contact.form.subject') }}</label>
              <select id="subject" v-model="form.subject" required>
                <option value="" disabled>{{ $t('contact.form.selectTopic') }}</option>
                <option value="general">{{ $t('contact.faq.general') }}</option>
                <option value="bug">{{ $t('contact.faq.bug') }}</option>
                <option value="feature">{{ $t('contact.faq.feature') }}</option>
                <option value="account">{{ $t('contact.faq.account') }}</option>
                <option value="other">{{ $t('contact.faq.other') }}</option>
              </select>
            </div>

            <div class="form-group">
              <label for="message">{{ $t('contact.form.message') }}</label>
              <textarea id="message" v-model="form.message" rows="6" :placeholder="$t('contact.form.tellUs')" required></textarea>
            </div>

            <div class="form-footer">
              <button type="submit" class="submit-btn" :disabled="sending">
                {{ sending ? $t('contact.form.sending') : $t('contact.form.sendMessage') }}
              </button>

              <div class="form-feedback">
                <p v-if="sent" class="success-msg">{{ $t('contact.messageSent') }}</p>
                <p v-if="errorMsg" class="error-msg">{{ $t('contact.messageError') }}: {{ errorMsg }}</p>
              </div>
            </div>
          </form>
        </article>

        <aside class="panel faq-panel">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">{{ $t('contact.faq.title') }}</p>
              <h2>{{ $t('contact.faq.title') }}</h2>
            </div>
          </div>

          <div class="faq-list">
            <div
              v-for="(item, i) in faqs"
              :key="i"
              class="faq-item"
              :class="{ open: openFaq === i }"
            >
              <button type="button" class="faq-question" @click="toggleFaq(i)">
                <span>{{ item.q }}</span>
                <span class="faq-toggle">{{ openFaq === i ? '-' : '+' }}</span>
              </button>
              <div v-show="openFaq === i" class="faq-answer">
                {{ item.a }}
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const supportEmail = 'teamflow@gmail.com'
const emailPlaceholder = computed(() => t('contact.form.yourEmail'))

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

const faqs = computed(() => [1, 2, 3, 4, 5, 6].map((index) => ({
  q: t(`contact.faq.qa${index}`),
  a: t(`contact.faq.aa${index}`)
})))

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
      throw new Error(data.error || (locale.value === 'lv' ? 'Neizdevās nosūtīt' : 'Failed to send'))
    }

    sent.value = true
    form.value = { name: '', email: '', subject: '', message: '' }
    setTimeout(() => {
      sent.value = false
    }, 4000)
  } catch (err) {
    console.error('Error sending message:', err)
    errorMsg.value = err.message || (locale.value === 'lv'
      ? 'Kaut kas nogāja greizi. Lūdzu, mēģiniet vēlreiz.'
      : 'Something went wrong. Please try again.')
    setTimeout(() => {
      errorMsg.value = ''
    }, 5000)
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.contact-page {
  --page-bg: var(--background-color);
  --page-surface: var(--card-bg);
  --page-border: var(--border-color);
  --page-text: var(--text-color);
  --page-muted: var(--text-secondary);
  --page-accent: #0b72e7;
  --page-accent-soft: rgba(11, 114, 231, 0.14);
  min-height: calc(100vh - 40px);
  background:
    radial-gradient(circle at top left, rgba(11, 114, 231, 0.12), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 20%),
    var(--page-bg);
  color: var(--page-text);
}

.dark-mode .contact-page {
  --page-accent: #6fb2ff;
  --page-accent-soft: rgba(74, 144, 226, 0.22);
  background:
    radial-gradient(circle at top left, rgba(74, 144, 226, 0.22), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 18%),
    var(--page-bg);
}

.contact-shell {
  max-width: 1240px;
  margin: 0 auto;
  padding: 1.5rem;
}

.contact-hero,
.panel {
  background: var(--page-surface);
  border: 1px solid var(--page-border);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.contact-hero {
  display: grid;
  grid-template-columns: 1.2fr 360px;
  gap: 1rem;
  padding: 1.6rem;
  border-radius: 30px;
  background: linear-gradient(135deg, var(--page-accent-soft), transparent 65%), var(--page-surface);
}

.eyebrow,
.panel-kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
  color: var(--page-muted);
}

.hero-copy h1 {
  margin: 0.35rem 0 0.75rem;
  font-size: clamp(2rem, 3vw, 3.2rem);
  line-height: 1;
}

.hero-description {
  max-width: 58ch;
  margin: 0;
  color: var(--page-muted);
}

.panel-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: var(--page-accent-soft);
  color: var(--page-accent);
  font-weight: 700;
  font-size: 0.84rem;
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hero-card {
  border: 1px solid var(--page-border);
  border-radius: 22px;
  padding: 1rem 1.1rem;
  background: var(--page-surface);
}

.hero-card.soft {
  background: linear-gradient(135deg, var(--page-accent-soft), transparent 70%), var(--page-surface);
}

.hero-card-label {
  display: block;
  color: var(--page-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
}

.hero-card strong {
  display: block;
  margin: 0.35rem 0;
  font-size: 1.05rem;
}

.hero-card p {
  margin: 0;
  color: var(--page-muted);
}

.hero-card-link {
  display: inline-block;
  margin-top: 0.25rem;
  color: var(--page-accent);
  text-decoration: none;
  font-weight: 700;
}

.contact-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.contact-grid {
  grid-template-columns: 1.15fr 0.85fr;
  align-items: start;
}

.panel {
  border-radius: 26px;
  padding: 1.25rem;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}

.panel-head h2 {
  margin: 0.25rem 0 0;
  font-size: 1.45rem;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--page-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.95rem 1rem;
  border: 1px solid var(--page-border);
  border-radius: 16px;
  background: var(--page-bg);
  color: var(--page-text);
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--page-accent);
  box-shadow: 0 0 0 3px rgba(11, 114, 231, 0.12);
}

.form-group textarea {
  min-height: 150px;
  resize: vertical;
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.submit-btn {
  border: none;
  border-radius: 16px;
  padding: 0.95rem 1.4rem;
  background: linear-gradient(135deg, #0b72e7, #0f4dbf);
  color: white;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(11, 114, 231, 0.28);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-feedback {
  flex: 1;
  min-width: 240px;
}

.success-msg,
.error-msg {
  margin: 0;
  font-weight: 700;
}

.success-msg {
  color: #198754;
}

.error-msg {
  color: #d63a3a;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.faq-item {
  border: 1px solid var(--page-border);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
}

.faq-item.open {
  border-color: rgba(11, 114, 231, 0.35);
  box-shadow: 0 10px 20px rgba(11, 114, 231, 0.08);
}

.faq-question {
  width: 100%;
  border: none;
  background: transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.1rem;
  color: var(--page-text);
  font-size: 0.96rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.faq-toggle {
  color: var(--page-accent);
  font-size: 1.2rem;
  line-height: 1;
}

.faq-answer {
  padding: 0 1.1rem 1rem;
  color: var(--page-muted);
  line-height: 1.6;
}

@media (max-width: 1080px) {
  .contact-hero,
  .contact-grid {
    grid-template-columns: 1fr;
  }

  .hero-side {
    flex-direction: row;
  }
}

@media (max-width: 768px) {
  .contact-shell {
    padding: 1rem;
  }

  .contact-hero,
  .panel {
    border-radius: 22px;
  }

  .hero-side {
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-footer {
    align-items: stretch;
  }

  .submit-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .contact-shell {
    padding: 0.75rem;
  }

  .contact-hero,
  .panel {
    padding: 1rem;
  }

  .hero-copy h1 {
    font-size: 1.85rem;
  }

  .faq-question,
  .faq-answer {
    padding-left: 0.95rem;
    padding-right: 0.95rem;
  }
}
</style>
