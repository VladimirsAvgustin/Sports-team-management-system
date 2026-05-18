const SUPPORTED_LOCALES = new Set(['en', 'lv'])

export const getCurrentLocale = () => {
  if (typeof localStorage === 'undefined') {
    return 'lv'
  }

  const storedLocale = localStorage.getItem('locale')
  return SUPPORTED_LOCALES.has(storedLocale) ? storedLocale : 'lv'
}

const setAcceptLanguageHeader = (headers) => {
  const nextHeaders = new Headers(headers || undefined)
  nextHeaders.set('Accept-Language', getCurrentLocale())
  return nextHeaders
}

export const withLocaleHeaders = (headers = undefined) => {
  return setAcceptLanguageHeader(headers)
}

export const getLocalizedFallback = (english, latvian) => {
  return getCurrentLocale() === 'en' ? english : latvian
}

export const setupApiLocale = (axiosInstance) => {
  axiosInstance.interceptors.request.use((config) => {
    config.headers = config.headers || {}
    config.headers['Accept-Language'] = getCurrentLocale()
    return config
  })

  if (typeof window === 'undefined' || window.__teamFlowLocaleFetchPatched) {
    return
  }

  const originalFetch = window.fetch.bind(window)

  window.fetch = (input, init = {}) => {
    const requestHeaders = typeof Request !== 'undefined' && input instanceof Request
      ? input.headers
      : undefined
    const headers = setAcceptLanguageHeader(init.headers || requestHeaders)

    return originalFetch(input, {
      ...init,
      headers
    })
  }

  window.__teamFlowLocaleFetchPatched = true
}
