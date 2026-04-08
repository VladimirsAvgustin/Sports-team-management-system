import { ref, onMounted } from 'vue'

export function usePWA() {
  const deferredPrompt = ref(null)
  const showInstallPrompt = ref(false)
  const isIOS = ref(false)
  const isAndroid = ref(false)
  const isInstalled = ref(false)
  const debugInfo = ref('')
  const hasDeferredPrompt = ref(false)

  const log = (message) => {
    const timestamp = new Date().toLocaleTimeString()
    const fullMsg = `[PWA] ${timestamp}: ${message}`
    console.log(fullMsg)
    debugInfo.value = fullMsg
  }

  const handleBeforeInstallPrompt = (e) => {
    log('✅ beforeinstallprompt event FIRED!')
    e.preventDefault()
    deferredPrompt.value = e
    hasDeferredPrompt.value = true
    showInstallPrompt.value = true
  }

  const handleAppInstalled = () => {
    log('✅ appinstalled event FIRED!')
    deferredPrompt.value = null
    showInstallPrompt.value = false
    isInstalled.value = true
  }

  onMounted(async () => {
    log('🚀 PWA composable mounted')
    
    // Check if using HTTPS or localhost
    const isHttps = window.location.protocol === 'https:'
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const isLocalNetwork = window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.')
    
    log(`🔒 HTTPS=${isHttps}, Localhost=${isLocalhost}, LocalNetwork=${isLocalNetwork}`)
    
    // WARNING: Check if user is on local network without HTTPS
    if (!isHttps && !isLocalhost && isLocalNetwork) {
      log('⚠️⚠️⚠️ WARNING: HTTP on Local Network!')
      log('❌ PWA installation REQUIRES HTTPS on local networks!')
      log('📖 See: PWA_HTTPS_SETUP.md for setup instructions')
      log('💡 Quick fix: Run "npm run dev" from frontend folder after OpenSSL install')
    }
    
    if (!isHttps && !isLocalhost && !isLocalNetwork) {
      log('❌ WARNING: Not on HTTPS, localhost, or local network!')
      log('📡 PWA requires HTTPS for security')
    }
    
    // Check if already installed
    if (window.navigator.standalone === true) {
      isInstalled.value = true
      log('✅ App already installed (standalone mode)')
      return
    }

    // Detect platform
    isIOS.value = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    isAndroid.value = /Android/.test(navigator.userAgent)
    log(`📱 Device: iOS=${isIOS.value}, Android=${isAndroid.value}`)

    // Check manifest
    try {
      const manifestLink = document.querySelector('link[rel="manifest"]')
      if (manifestLink) {
        const response = await fetch(manifestLink.href)
        if (response.ok) {
          const manifest = await response.json()
          log(`✅ Manifest loaded: ${manifest.name}`)
          log(`   Display: ${manifest.display}, Scope: ${manifest.scope}`)
          log(`   Icons: ${manifest.icons?.length || 0}`)
        } else {
          log(`❌ Manifest loading failed: ${response.status}`)
        }
      } else {
        log('❌ No manifest link found')
      }
    } catch (e) {
      log(`❌ Manifest error: ${e.message}`)
    }

    // Register beforeinstallprompt listener
    if ('BeforeInstallPromptEvent' in window) {
      log('✅ BeforeInstallPromptEvent supported')
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    } else {
      log('⚠️ BeforeInstallPromptEvent NOT supported')
      if (!isHttps && !isLocalhost) {
        log('💡 This might be due to HTTP on local network. See PWA_HTTPS_SETUP.md')
      }
    }

    // Register appinstalled listener
    window.addEventListener('appinstalled', handleAppInstalled)

    // Service Worker registration
    if ('serviceWorker' in navigator) {
      try {
        log('🔧 Registering Service Worker...')
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        })
        log('✅ Service Worker registered')
        log(`   State: ${registration.installing ? 'installing' : registration.waiting ? 'waiting' : registration.active ? 'active' : 'unknown'}`)
        
        // Check for updates
        setInterval(() => {
          registration.update()
        }, 60000)
      } catch (err) {
        log(`❌ Service Worker failed: ${err.message}`)
      }
    } else {
      log('❌ Service Worker not supported')
    }

    // Fallback: Show install prompt even if beforeinstallprompt doesn't fire
    // This is needed for local networks and some devices
    setTimeout(() => {
      if (!isInstalled.value && (isAndroid.value || isIOS.value)) {
        if (!hasDeferredPrompt.value) {
          log('⚠️ Showing FALLBACK install prompt (beforeinstallprompt never fired)')
          log('   This is normal on local networks (192.168.x.x)')
          log('   User must manually: Browser Menu > Add to Home Screen')
          if (!isHttps && isLocalNetwork) {
            log('   💡 Make sure you\'re using HTTPS! Check PWA_HTTPS_SETUP.md')
          }
          showInstallPrompt.value = true
        } else {
          log('✅ beforeinstallprompt already fired, using native prompt')
        }
      } else {
        if (isInstalled.value) {
          log('ℹ️ App already installed, not showing prompt')
        } else {
          log('ℹ️ Not a mobile device, not showing prompt')
        }
      }
    }, 500)
  })

  const installApp = async () => {
    log('⏳ Install button clicked')
    
    if (deferredPrompt.value) {
      try {
        log('📋 Showing native install prompt')
        deferredPrompt.value.prompt()
        const { outcome } = await deferredPrompt.value.userChoice

        if (outcome === 'accepted') {
          log('✅ User ACCEPTED install')
          deferredPrompt.value = null
          hasDeferredPrompt.value = false
          showInstallPrompt.value = false
          isInstalled.value = true
        } else {
          log('❌ User DISMISSED install')
        }
      } catch (err) {
        log(`❌ Install error: ${err.message}`)
      }
    } else {
      // For manual installation: just provide user instructions
      log('⚠️ No native prompt available')
      log('ℹ️ User needs to manually install via browser menu')
      
      if (isIOS.value) {
        log('📱 iOS: Open Safari > Share button > Add to Home Screen')
      } else if (isAndroid.value) {
        log('📱 Android: Open browser menu (⋯) > Install app')
      }
    }
  }

  return {
    deferredPrompt,
    showInstallPrompt,
    isIOS,
    isAndroid,
    isInstalled,
    debugInfo,
    hasDeferredPrompt,
    installApp,
    getInstallInstructions: () => {
      if (isIOS.value) {
        return {
          title: 'Install App on iOS',
          instructions: [
            'Open Safari menu (share icon ⬆️)',
            'Select "Add to Home Screen"',
            'Enter app name',
            'Tap "Add"'
          ]
        }
      }
      return {
        title: 'Install App on Android',
        instructions: [
          'Click the "📥 Install" button',
          'App will be added to your home screen',
          'Use it like any other app'
        ]
      }
    },
    shareContent: async (data) => {
      if ('share' in navigator) {
        try {
          await navigator.share(data)
        } catch (err) {
          if (err.name !== 'AbortError') {
            log(`Share failed: ${err.message}`)
          }
        }
      }
    },
    requestNotificationPermission: async () => {
      if ('Notification' in window) {
        const permission = Notification.permission
        if (permission === 'granted') {
          return true
        }
        if (permission !== 'denied') {
          const result = await Notification.requestPermission()
          return result === 'granted'
        }
      }
      return false
    },
    sendNotification: (title, options = {}) => {
      if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            icon: '/launchericon-192x192.png',
            badge: '/launchericon-96x96.png',
            ...options
          })
        })
      }
    }
  }
}
