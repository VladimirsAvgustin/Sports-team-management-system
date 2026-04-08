import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import lv from './locales/lv.json'

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'lv',
  fallbackLocale: 'en',
  messages: {
    en,
    lv
  }
})

export default i18n
