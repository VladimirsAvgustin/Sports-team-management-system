<template>
  <div class="chat-container">
    <!-- Chat Header -->
    <div class="chat-header">
      <div class="chat-title">
        <h3>{{ currentRoom?.name || 'Čats' }}</h3>
      </div>
      <button class="close-btn" @click="$emit('close')" v-if="showClose">
        ✕
      </button>
    </div>

    <!-- Messages Container -->
    <div class="messages-container" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        <p>{{ $t('chatPage.noMessages') }}</p>
      </div>

      <div
        v-for="message in sortedMessages"
        :key="message.id"
        :class="['message', { 'own-message': (message.userId || message.user_id) === currentUserId }]"
      >
        <div class="message-header">
          <span class="message-author">{{ message.username }}</span>
          <span class="message-time">{{ formatTime(message.createdAt || message.created_at) }}</span>
        </div>
        <div class="message-content">
          <p v-if="message.message" class="message-text">{{ message.message }}</p>
          <a
            v-if="getAttachment(message)"
            class="message-attachment"
            :href="getAttachment(message).url"
            target="_blank"
            rel="noopener"
          >
            <img
              v-if="isImageAttachment(getAttachment(message))"
              :src="getAttachment(message).url"
              :alt="getAttachment(message).name"
              class="attachment-image"
            />
            <span v-else class="attachment-file-icon">📎</span>
            <span class="attachment-meta">
              <strong>{{ getAttachment(message).name }}</strong>
              <small>{{ formatFileSize(getAttachment(message).size) }}</small>
            </span>
          </a>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="typingUsers.length > 0" class="typing-indicator">
        <span>{{ typingUsers.join(', ') }} {{ typingUsers.length > 1 ? $t('chatPage.areTyping') : $t('chatPage.isTyping') }}</span>
      </div>
    </div>

    <!-- Message Input -->
    <div class="message-input-container">
      <input
        ref="fileInput"
        type="file"
        class="file-input"
        @change="handleFileChange"
      />
      <button
        type="button"
        class="attach-btn"
        :disabled="!isConnected || isUploading"
        @click="openFilePicker"
        :title="$t('chatPage.attachFile')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" class="attach-icon">
          <path
            d="M21.44 11.05l-8.49 8.49a6 6 0 11-8.49-8.49l9.19-9.19a4 4 0 115.66 5.66L9.4 17.43a2 2 0 11-2.83-2.83l8.49-8.49"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
        </svg>
      </button>
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
        @input="handleTyping"
        @blur="handleStopTyping"
        :placeholder="$t('chatPage.typeMessage')"
        class="message-input"
        :disabled="!isConnected || isUploading"
      />
      <button
        @click="sendMessage"
        :disabled="(!newMessage.trim() && !selectedFile) || !isConnected || isUploading"
        class="send-btn"
      >
        <span>{{ isUploading ? $t('chatPage.uploading') : $t('buttons.send') }}</span>
      </button>
      <div v-if="selectedFile || uploadError" class="attachment-preview">
        <span v-if="selectedFile">{{ selectedFile.name }} · {{ formatFileSize(selectedFile.size) }}</span>
        <span v-else class="upload-error">{{ uploadError }}</span>
        <button v-if="selectedFile" type="button" @click="removeSelectedFile">
          {{ $t('chatPage.removeAttachment') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'

export default {
  name: 'ChatComponent',
  props: {
    roomId: {
      type: Number,
      required: true
    },
    showClose: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close'],
  setup(props) {
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    
    const newMessage = ref('')
    const messagesContainer = ref(null)
    const typingTimeout = ref(null)
    const fileInput = ref(null)
    const selectedFile = ref(null)
    const uploadError = ref('')
    const isUploading = ref(false)

    const messages = computed(() => chatStore.messages)
    const sortedMessages = computed(() => chatStore.sortedMessages)
    const currentRoom = computed(() => chatStore.currentRoom)
    const isConnected = computed(() => chatStore.isConnected)
    const typingUsers = computed(() => chatStore.typingUsers)
    const currentUserId = computed(() => authStore.user?.id)

    const sendMessage = async () => {
      const text = newMessage.value.trim()
      if (!text && !selectedFile.value) return

      try {
        isUploading.value = true
        uploadError.value = ''
        const attachment = selectedFile.value
          ? await chatStore.uploadAttachment(selectedFile.value)
          : null

        chatStore.sendMessage(text, attachment)
        newMessage.value = ''
        removeSelectedFile()
      } catch (error) {
        uploadError.value = error.message || 'Neizdevās augšupielādēt failu'
      } finally {
        isUploading.value = false
      }
    }

    const openFilePicker = () => {
      fileInput.value?.click()
    }

    const handleFileChange = (event) => {
      selectedFile.value = event.target.files?.[0] || null
      uploadError.value = ''
    }

    const removeSelectedFile = () => {
      selectedFile.value = null
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }

    const getAttachment = (message) => {
      const url = message.attachment_url || message.attachmentUrl
      if (!url) return null

      return {
        url,
        name: message.attachment_name || message.attachmentName || 'Pielikums',
        type: message.attachment_type || message.attachmentType || '',
        size: message.attachment_size || message.attachmentSize || 0
      }
    }

    const isImageAttachment = (attachment) => attachment?.type?.startsWith('image/')

    const formatFileSize = (size) => {
      const bytes = Number(size) || 0
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const handleTyping = () => {
      chatStore.startTyping()
      
      // Clear existing timeout
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
      }

      // Set new timeout to stop typing indicator
      typingTimeout.value = setTimeout(() => {
        chatStore.stopTyping()
      }, 3000)
    }

    const handleStopTyping = () => {
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
      }
      chatStore.stopTyping()
    }

    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      const now = new Date()
      const diffInHours = (now - date) / (1000 * 60 * 60)

      if (diffInHours < 24) {
        return date.toLocaleTimeString('lv-LV', {
          hour: '2-digit',
          minute: '2-digit'
        })
      } else if (diffInHours < 168) { // 7 days
        return date.toLocaleDateString('lv-LV', {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      } else {
        return date.toLocaleDateString('lv-LV', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    }

    // Watch for room changes
    watch(() => props.roomId, async (newRoomId) => {
      if (newRoomId) {
        console.log('ChatComponent: Room ID changed to', newRoomId)
        await chatStore.joinRoom(newRoomId)
      }
    }, { immediate: true })

    // Scroll to bottom when messages change
    watch(messages, () => {
      chatStore.scrollToBottom()
    }, { deep: true })

    onMounted(async () => {
      console.log('ChatComponent mounted with roomId:', props.roomId)
      // Connect to socket if not already connected
      if (!chatStore.isConnected) {
        chatStore.connect()
      }
      
      // Join the room
      if (props.roomId) {
        await chatStore.joinRoom(props.roomId)
      }
    })

    onUnmounted(() => {
      chatStore.leaveRoom()
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
      }
    })

    return {
      newMessage,
      messagesContainer,
      fileInput,
      selectedFile,
      uploadError,
      isUploading,
      messages,
      sortedMessages,
      currentRoom,
      isConnected,
      typingUsers,
      currentUserId,
      sendMessage,
      openFilePicker,
      handleFileChange,
      removeSelectedFile,
      getAttachment,
      isImageAttachment,
      formatFileSize,
      handleTyping,
      handleStopTyping,
      formatTime
    }
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--card-bg, #fff);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.chat-title h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.online-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  opacity: 0.9;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 1.5rem;
  background: var(--messages-bg, #f8fafc);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary, #94a3b8);
  font-size: 1rem;
}

.message {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--card-bg, #fff);
  border-radius: 12px;
  max-width: 70%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 0.5px solid #080808;
  color: var(--text-color);
}

.own-message {
  margin-left: auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.message-author {
  font-weight: 600;
}

.own-message .message-author {
  color: rgba(255, 255, 255, 0.9);
}

.message-time {
  opacity: 0.7;
  font-size: 0.75rem;
}

.message-content {
  word-wrap: break-word;
  line-height: 1.5;
}

.message-text {
  margin: 0;
}

.message-attachment {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding: 0.65rem;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.06);
  color: inherit;
  text-decoration: none;
}

.message-text + .message-attachment {
  margin-top: 0.7rem;
}

.attachment-image {
  width: min(220px, 100%);
  max-height: 180px;
  border-radius: 10px;
  object-fit: cover;
}

.attachment-file-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(102, 126, 234, 0.14);
}

.attachment-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.attachment-meta strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-meta small {
  opacity: 0.72;
}

.typing-indicator {
  padding: 0.5rem 1rem;
  color: var(--text-secondary, #64748b);
  font-size: 0.875rem;
  font-style: italic;
}

.message-input-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: var(--card-bg, #fff);
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.file-input {
  display: none;
}

.attach-btn {
  width: 46px;
  height: 46px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 50%;
  background: var(--input-bg, #fff);
  color: var(--text-color);
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
}

.attach-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #667eea;
}

.attach-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.attach-icon {
  width: 18px;
  height: 18px;
  display: block;
  margin: 0 auto;
}

.message-input {
  flex: 1;
  min-width: 160px;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color, #e2e8f0);
  border-radius: 24px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  background: var(--input-bg, #fff);
  color: var(--text-color);
}

.message-input:focus {
  border-color: #667eea;
}

.message-input:disabled {
  background: var(--disabled-bg, #f1f5f9);
  cursor: not-allowed;
}

.send-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.attachment-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  background: rgba(102, 126, 234, 0.1);
  color: var(--text-color);
  font-size: 0.9rem;
}

.attachment-preview button {
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  font-weight: 700;
}

.upload-error {
  color: #ef4444;
}

/* Scrollbar styling */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: var(--scrollbar-track, #f1f5f9);
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, #cbd5e1);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, #94a3b8);
}
</style>

<!-- Dark mode styles unscoped -->
<style>
html.dark-mode .chat-container {
  background: #1e1e1e;
}

html.dark-mode .messages-container {
  background: #121212;
}

html.dark-mode .message {
  background: #2d2d2d;
  color: #e0e0e0;
  border-color: #444;
}

html.dark-mode .own-message {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  color: white;
  border-color: #5a67d8;
}

html.dark-mode .own-message .message-author {
  color: rgba(255, 255, 255, 0.9);
}

html.dark-mode .message-author {
  color: #b0b0b0;
}

html.dark-mode .message-input-container {
  background: #1e1e1e;
  border-color: #333;
}

html.dark-mode .message-input {
  background: #2d2d2d;
  border-color: #444;
  color: #e0e0e0;
}

html.dark-mode .message-input::placeholder {
  color: #888;
}

html.dark-mode .message-input:disabled {
  background: #1a1a1a;
}

html.dark-mode .attach-btn {
  background: #2d2d2d;
  border-color: #444;
  color: #e0e0e0;
}

html.dark-mode .message-attachment {
  background: rgba(255, 255, 255, 0.08);
}

html.dark-mode .attachment-preview {
  background: rgba(102, 126, 234, 0.16);
  color: #e0e0e0;
}

html.dark-mode .typing-indicator {
  color: #888;
}

html.dark-mode .empty-state {
  color: #888;
}
</style>
