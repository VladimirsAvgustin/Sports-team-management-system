<template>
  <div v-if="showInstallPrompt || isIOS" class="pwa-banner">
    <div class="pwa-content">
      <div class="pwa-icon">📱</div>
      <div class="pwa-text">
        <h3>{{ isIOS ? 'Add to Home Screen' : 'Install App' }}</h3>
        <p>{{ isIOS ? 'Quick access to the app on your phone' : 'Fast and easy access' }}</p>
      </div>
      
      <button 
        @click="installApp" 
        class="install-btn"
        aria-label="Install application"
      >
        📥 Install
      </button>

      <button 
        @click="toggleInstructions"
        class="help-btn"
        aria-label="Instructions"
        :title="showInstructions ? 'Hide instructions' : 'Show instructions'"
      >
        {{ showInstructions ? '▼' : '▶' }} Help
      </button>

      <button 
        @click="closeInstallPrompt" 
        class="close-btn"
        aria-label="Close"
      >
        ✕
      </button>
    </div>

    <!-- Instructions Section -->
    <div v-if="showInstructions" class="pwa-instructions">
      <div v-if="isIOS" class="instructions-content">
        <h4>iOS Installation</h4>
        <ol>
          <li>Open Safari menu (share icon ⬆️)</li>
          <li>Select "Add to Home Screen"</li>
          <li>Name the app and tap "Add"</li>
          <li>Open the app from your home screen</li>
        </ol>
      </div>
      <div v-else class="instructions-content">
        <h4>Android Installation</h4>
        <ol>
          <li v-if="!hasDeferredPrompt">Open browser menu (⋯ or ≡)</li>
          <li v-if="!hasDeferredPrompt">Select "Install app" or "Add to Home"</li>
          <li v-if="!hasDeferredPrompt">Confirm the installation</li>
          <li v-if="hasDeferredPrompt">Click the "📥 Install" button above</li>
          <li>App will appear on your home screen ✅</li>
        </ol>
        <p v-if="!hasDeferredPrompt" class="info-text">
          💡 If you don't see the install option, try opening in a different browser (Chrome recommended)
        </p>
      </div>
    </div>
  </div>

  <!-- Notification Banner -->
  <Teleport to="body">
    <Transition name="slide-up">
      <div v-if="showNotification" class="notification-banner" :class="notificationType">
        <span>{{ notificationMessage }}</span>
        <button @click="closeNotification" class="close-btn">✕</button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { usePWA } from '@/composables/usePWA'

const { showInstallPrompt, isIOS, isAndroid, hasDeferredPrompt, installApp: pwaInstallApp } = usePWA()

const showInstructions = ref(false)
const showNotification = ref(false)
const notificationMessage = ref('')
const notificationType = ref('info')
let dismissTimeout = null

const toggleInstructions = () => {
  showInstructions.value = !showInstructions.value
}

const closeInstallPrompt = () => {
  showInstallPrompt.value = false
  showInstructions.value = false
}

const installApp = async () => {
  try {
    console.log(`[Install] Method: ${hasDeferredPrompt.value ? 'native' : 'fallback'}`)
    
    await pwaInstallApp()
    
    // Show success notification
    showNotification.value = true
    notificationMessage.value = 'App installed successfully! ✅'
    notificationType.value = 'success'
    
    // Auto-close
    closeInstallPrompt()
    dismissTimeout = setTimeout(() => {
      showNotification.value = false
    }, 4000)
  } catch (err) {
    console.error('[Install Error]', err)
    showNotification.value = true
    notificationMessage.value = `Installation started. Check your notifications.`
    notificationType.value = 'info'
    dismissTimeout = setTimeout(() => {
      showNotification.value = false
    }, 4000)
  }
}

const closeNotification = () => {
  clearTimeout(dismissTimeout)
  showNotification.value = false
}
</script>

<style scoped>
.pwa-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
  margin: 8px;
  margin-bottom: 0;
  border-radius: 16px;
}

@keyframes slideUp {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.pwa-content {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
}

.pwa-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.pwa-text {
  flex: 1;
}

.pwa-text h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.2;
}

.pwa-text p {
  margin: 4px 0 0;
  font-size: 0.85rem;
  opacity: 0.9;
}

.install-btn,
.close-btn {
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  padding: 6px 12px;
  font-weight: 600;
  transition: all 0.2s;
  min-width: 44px;
  min-height: 44px;
  font-size: 14px;
  flex-shrink: 0;
}

.install-btn {
  background: rgba(255, 255, 255, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.8);
  font-size: 16px;
}

.install-btn:hover {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(255, 255, 255, 1);
}

.help-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  font-size: 12px;
  padding: 6px 10px;
  white-space: nowrap;
}

.help-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
}

.install-btn:active,
.close-btn:active {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(0.95);
}

.close-btn {
  padding: 4px 8px;
}

/* iOS Instructions */
.pwa-instructions {
  background: white;
  color: #333;
  margin-top: 8px;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s ease-out;
}

.instructions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.instructions-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #667eea;
}

.info-message {
  background: #e3f2fd;
  border-left: 3px solid #2196F3;
  padding: 10px 12px;
  margin: 8px 0;
  border-radius: 4px;
}

.info-text {
  margin: 0;
  font-size: 0.9rem;
  color: #1565c0;
  line-height: 1.5;
}

.instructions-list {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 0.9rem;
  line-height: 1.8;
}

.instructions-list li {
  margin-bottom: 10px;
  color: #444;
}

.instructions-list li strong {
  color: #667eea;
  font-weight: 600;
}

/* Notification Banner */
.notification-banner {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  max-width: 400px;
  margin: 0 auto;
  padding: 12px 16px;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease-out;
  z-index: 1001;
}

.notification-banner.success {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
}

.notification-banner.error {
  background: linear-gradient(135deg, #f44336 0%, #da190b 100%);
}

.notification-banner.info {
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
}

.notification-banner .close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  min-width: auto;
  padding: 4px 8px;
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100px);
  opacity: 0;
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .pwa-banner {
    margin: 0;
    padding: 12px;
    border-radius: 12px 12px 0 0;
  }

  .pwa-content {
    gap: 8px;
  }

  .pwa-icon {
    font-size: 28px;
  }

  .pwa-text h3 {
    font-size: 0.95rem;
  }

  .pwa-text p {
    font-size: 0.8rem;
  }

  .install-btn,
  .close-btn {
    padding: 4px 10px;
    font-size: 12px;
  }

  .notification-banner {
    left: 8px;
    right: 8px;
    bottom: 16px;
    font-size: 0.9rem;
  }
}
</style>
