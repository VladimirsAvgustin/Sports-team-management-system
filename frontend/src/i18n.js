import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import lv from './locales/lv.json'

const SUPPORTED_LOCALES = new Set(['en', 'lv'])
const storedLocale = localStorage.getItem('locale')
const DEFAULT_LOCALE = SUPPORTED_LOCALES.has(storedLocale) ? storedLocale : 'lv'

const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: 'en',
  messages: {
    en,
    lv
  }
})

export default i18n
