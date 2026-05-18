<template>
  <div class="dm-container">
    <!-- DM Header -->
    <div class="dm-header">
      <div class="dm-title">
        <div class="dm-avatar">
          {{ getInitials(username) }}
        </div>
        <div>
          <h3>{{ username }}</h3>
        </div>
      </div>
    </div>

    <!-- Messages Container -->
    <div class="messages-container" ref="messagesContainer">
      <div v-if="sortedMessages.length === 0" class="empty-state">
        <p>{{ $t('chatPage.noMessages') }}</p>
      </div>

      <div
        v-for="message in sortedMessages"
        :key="message.id"
        :class="['message', { 'own-message': message.sender_id === currentUserId }]"
      >
        <div class="message-header">
          <span class="message-author">
            {{ message.sender_id === currentUserId ? currentUserLabel : username }}
          </span>
          <span class="message-time">{{ formatTime(message.created_at) }}</span>
        </div>
        <div class="message-content">
          <p v-if="message.message" class="message-text">{{ message.message }}</p>
          <a
            v-if="getAttachment(message)"
            class="message-attachment"
            :href="getAttachment(message).objectUrl || '#'"
            :download="isImageAttachment(getAttachment(message)) ? null : getAttachment(message).name"
            target="_blank"
            rel="noopener"
            @click="handleAttachmentClick($event, getAttachment(message))"
          >
            <img
              v-if="isImageAttachment(getAttachment(message)) && getAttachment(message).objectUrl"
              :src="getAttachment(message).objectUrl"
              :alt="getAttachment(message).name"
              class="attachment-image"
            />
            <span v-else class="attachment-file-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="attachment-file-symbol">
                <path
                  d="M8.5 12.5l6.9-6.9a3.2 3.2 0 014.5 4.5l-8.4 8.4a5 5 0 01-7.1-7.1l8.8-8.8"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </span>
            <span class="attachment-meta">
              <strong>{{ getAttachment(message).name }}</strong>
              <small>{{ formatFileSize(getAttachment(message).size) }}</small>
            </span>
          </a>
        </div>
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
            d="M8.5 12.5l6.9-6.9a3.2 3.2 0 014.5 4.5l-8.4 8.4a5 5 0 01-7.1-7.1l8.8-8.8"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
      </button>
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
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
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'

export default {
  name: 'DirectMessageComponent',
  props: {
    userId: {
      type: Number,
      required: true
    },
    username: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    const { locale } = useI18n()
    
    const newMessage = ref('')
    const messagesContainer = ref(null)
    const fileInput = ref(null)
    const selectedFile = ref(null)
    const uploadError = ref('')
    const isUploading = ref(false)
    const attachmentLoadErrors = ref({})

    const messages = computed(() => chatStore.dmMessages)
    const sortedMessages = computed(() => {
      return [...messages.value].sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      )
    })
    const isConnected = computed(() => chatStore.isConnected)
    const currentUserId = computed(() => authStore.user?.id)
    const copy = computed(() => locale.value === 'en'
      ? {
          attachment: 'Attachment',
          currentUser: 'You',
          uploadFileError: 'Failed to upload file',
          loadFileError: 'Failed to load file'
        }
      : {
          attachment: 'Pielikums',
          currentUser: 'Jūs',
          uploadFileError: 'Neizdevās augšupielādēt failu',
          loadFileError: 'Neizdevās ielādēt failu'
        })
    const currentUserLabel = computed(() => copy.value.currentUser)
    const dateLocale = computed(() => (locale.value === 'en' ? 'en-US' : 'lv-LV'))

    const sendMessage = async () => {
      const text = newMessage.value.trim()
      if (!text && !selectedFile.value) return

      try {
        isUploading.value = true
        uploadError.value = ''
        const attachment = selectedFile.value
          ? await chatStore.uploadAttachment(selectedFile.value)
          : null

        chatStore.sendDM(props.userId, text, attachment)
        newMessage.value = ''
        removeSelectedFile()
      } catch (error) {
        uploadError.value = error.message || copy.value.uploadFileError
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
        objectUrl: chatStore.getAttachmentObjectUrl(url),
        name: message.attachment_name || message.attachmentName || copy.value.attachment,
        type: message.attachment_type || message.attachmentType || '',
        size: message.attachment_size || message.attachmentSize || 0
      }
    }

    const isImageAttachment = (attachment) => attachment?.type?.startsWith('image/')

    const loadMessageAttachments = (messageList) => {
      const urls = [...new Set(
        messageList
          .map((message) => {
            const attachment = getAttachment(message)
            return isImageAttachment(attachment) ? attachment.url : null
          })
          .filter(Boolean)
      )]

      urls.forEach((url) => {
        chatStore.loadAttachmentObjectUrl(url).catch((error) => {
          attachmentLoadErrors.value[url] = error.message || copy.value.loadFileError
        })
      })
    }

    const handleAttachmentClick = async (event, attachment) => {
      if (!attachment || attachment.objectUrl) return

      event.preventDefault()

      try {
        const objectUrl = await chatStore.loadAttachmentObjectUrl(attachment.url)
        if (isImageAttachment(attachment)) {
          window.open(objectUrl, '_blank', 'noopener')
        } else {
          const link = document.createElement('a')
          link.href = objectUrl
          link.download = attachment.name
          link.click()
        }
      } catch (error) {
        attachmentLoadErrors.value[attachment.url] = error.message || copy.value.loadFileError
      }
    }

    const formatFileSize = (size) => {
      const bytes = Number(size) || 0
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const getInitials = (name) => {
      if (!name) return '?'
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      const now = new Date()
      const diffInHours = (now - date) / (1000 * 60 * 60)

      if (diffInHours < 24) {
        return date.toLocaleTimeString(dateLocale.value, {
          hour: '2-digit',
          minute: '2-digit'
        })
      } else if (diffInHours < 168) { // 7 days
        return date.toLocaleDateString(dateLocale.value, {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      } else {
        return date.toLocaleDateString(dateLocale.value, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    }

    // Watch for messages changes and scroll to bottom
    watch(messages, () => {
      chatStore.scrollToBottom()
    }, { deep: true })

    watch(sortedMessages, (messageList) => {
      loadMessageAttachments(messageList)
    }, { immediate: true, deep: true })

    onMounted(async () => {
      // Open DM conversation
      await chatStore.openDM(props.userId, props.username)
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
      isConnected,
      currentUserId,
      currentUserLabel,
      sendMessage,
      openFilePicker,
      handleFileChange,
      removeSelectedFile,
      getAttachment,
      isImageAttachment,
      handleAttachmentClick,
      formatFileSize,
      getInitials,
      formatTime
    }
  }
}
</script>

<style scoped>
.dm-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--card-bg, #fff);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.dm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.dm-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dm-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
}

.dm-title h3 {
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
  border: 1px solid #e2e8f0;
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
  color: currentColor;
}

.attachment-file-symbol {
  width: 20px;
  height: 20px;
  display: block;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  width: 20px;
  height: 20px;
  display: block;
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
html.dark-mode .dm-container {
  background: #1e1e1e;
}

html.dark-mode .dm-container .messages-container {
  background: #121212;
}

html.dark-mode .dm-container .message {
  background: #2d2d2d;
  color: #e0e0e0;
  border-color: #444;
}

html.dark-mode .dm-container .own-message {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  color: white;
  border-color: #5a67d8;
}

html.dark-mode .dm-container .own-message .message-author {
  color: rgba(255, 255, 255, 0.9);
}

html.dark-mode .dm-container .message-author {
  color: #b0b0b0;
}

html.dark-mode .dm-container .message-input-container {
  background: #1e1e1e;
  border-color: #333;
}

html.dark-mode .dm-container .message-input {
  background: #2d2d2d;
  border-color: #444;
  color: #e0e0e0;
}

html.dark-mode .dm-container .message-input::placeholder {
  color: #888;
}

html.dark-mode .dm-container .message-input:disabled {
  background: #1a1a1a;
}

html.dark-mode .dm-container .attach-btn {
  background: #2d2d2d;
  border-color: #444;
  color: #e0e0e0;
}

html.dark-mode .dm-container .message-attachment {
  background: rgba(255, 255, 255, 0.08);
}

html.dark-mode .dm-container .attachment-preview {
  background: rgba(102, 126, 234, 0.16);
  color: #e0e0e0;
}

html.dark-mode .dm-container .empty-state {
  color: #888;
}
</style>
