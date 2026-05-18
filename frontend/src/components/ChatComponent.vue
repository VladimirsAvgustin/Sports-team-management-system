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
    <div class="messages-container" ref="messagesContainer" @click="activeMessageMenuId = null">
      <div v-if="messages.length === 0" class="empty-state">
        <p>{{ $t('chatPage.noMessages') }}</p>
      </div>

      <div
        v-for="message in sortedMessages"
        :key="message.id"
        :data-message-id="message.id"
        :class="['message', { 'own-message': isOwnMessage(message) }]"
      >
        <div class="message-header">
          <span class="message-author">{{ message.username }}</span>
          <div class="message-header-actions">
            <span class="message-time">{{ formatTime(message.createdAt || message.created_at) }}</span>
            <div class="message-action-wrap">
              <button
                type="button"
                class="message-action-toggle"
                :aria-label="$t('chatPage.messageActions')"
                @click.stop="toggleMessageMenu(message.id)"
              >
                ...
              </button>
              <div v-if="activeMessageMenuId === message.id" class="message-action-menu">
                <button type="button" @click.stop="replyToMessage(message)">{{ $t('chatPage.reply') }}</button>
                <button
                  v-if="canDeleteMessage(message)"
                  type="button"
                  class="danger"
                  @click.stop="deleteMessage(message)"
                >
                  {{ $t('chatPage.deleteMessage') }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="message-content">
          <button
            v-if="getReply(message)"
            type="button"
            class="message-reply"
            @click="scrollToMessage(getReply(message).id)"
          >
            <strong>{{ getReply(message).username }}</strong>
            <span>{{ getReply(message).preview }}</span>
          </button>
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

      <!-- Typing Indicator -->
      <div v-if="typingUsers.length > 0" class="typing-indicator">
        <span>{{ typingUsers.join(', ') }} {{ typingUsers.length > 1 ? $t('chatPage.areTyping') : $t('chatPage.isTyping') }}</span>
      </div>
    </div>

    <!-- Message Input -->
    <div class="message-input-container">
      <div v-if="replyingTo" class="replying-preview">
        <span>
          <strong>{{ $t('chatPage.replyingTo') }} {{ replyingTo.username }}</strong>
          {{ replyingTo.preview }}
        </span>
        <button type="button" @click="cancelReply">{{ $t('chatPage.cancelReply') }}</button>
      </div>
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
import { useI18n } from 'vue-i18n'
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
    const { locale } = useI18n()
    
    const newMessage = ref('')
    const messagesContainer = ref(null)
    const typingTimeout = ref(null)
    const fileInput = ref(null)
    const selectedFile = ref(null)
    const uploadError = ref('')
    const isUploading = ref(false)
    const attachmentLoadErrors = ref({})
    const activeMessageMenuId = ref(null)
    const replyingTo = ref(null)

    const messages = computed(() => chatStore.messages)
    const sortedMessages = computed(() => chatStore.sortedMessages)
    const currentRoom = computed(() => chatStore.currentRoom)
    const isConnected = computed(() => chatStore.isConnected)
    const typingUsers = computed(() => chatStore.typingUsers)
    const currentUserId = computed(() => authStore.user?.id)
    const currentUserRole = computed(() => String(authStore.user?.role || '').toLowerCase())
    const isCoach = computed(() => currentUserRole.value === 'coach')
    const copy = computed(() => locale.value === 'en'
      ? {
          attachment: 'Attachment',
          message: 'Message',
          uploadFileError: 'Failed to upload file',
          loadFileError: 'Failed to load file'
        }
      : {
          attachment: 'Pielikums',
          message: 'Ziņojums',
          uploadFileError: 'Neizdevās augšupielādēt failu',
          loadFileError: 'Neizdevās ielādēt failu'
        })

    const sendMessage = async () => {
      const text = newMessage.value.trim()
      if (!text && !selectedFile.value) return

      try {
        isUploading.value = true
        uploadError.value = ''
        const attachment = selectedFile.value
          ? await chatStore.uploadAttachment(selectedFile.value)
          : null

        chatStore.sendMessage(text, attachment, replyingTo.value)
        newMessage.value = ''
        cancelReply()
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

    const getMessageUserId = (message) => message?.userId || message?.user_id

    const isOwnMessage = (message) => Number(getMessageUserId(message)) === Number(currentUserId.value)

    const canDeleteMessage = (message) => isOwnMessage(message) || isCoach.value

    const getMessagePreview = (message) => {
      const text = String(message?.message || '').trim()
      if (text) return text.length > 140 ? `${text.slice(0, 140)}...` : text

      const attachmentName = message?.attachment_name || message?.attachmentName
      return attachmentName || copy.value.attachment
    }

    const getReply = (message) => {
      const replyId = message?.reply_to_message_id || message?.replyToMessageId
      if (!replyId) return null

      const preview = String(
        message?.reply_to_message
        || message?.replyToMessage
        || message?.reply_to_attachment_name
        || message?.replyToAttachmentName
        || copy.value.attachment
      ).trim()

      return {
        id: replyId,
        username: message?.reply_to_username || message?.replyToUsername || copy.value.message,
        preview: preview.length > 140 ? `${preview.slice(0, 140)}...` : preview
      }
    }

    const toggleMessageMenu = (messageId) => {
      activeMessageMenuId.value = activeMessageMenuId.value === messageId ? null : messageId
    }

    const replyToMessage = (message) => {
      replyingTo.value = {
        id: message.id,
        username: message.username || copy.value.message,
        preview: getMessagePreview(message)
      }
      activeMessageMenuId.value = null
    }

    const cancelReply = () => {
      replyingTo.value = null
    }

    const deleteMessage = (message) => {
      activeMessageMenuId.value = null

      if (!canDeleteMessage(message)) {
        return
      }

      if (replyingTo.value?.id === message.id) {
        cancelReply()
      }

      chatStore.deleteMessage(message.id)
    }

    const scrollToMessage = (messageId) => {
      const target = messagesContainer.value?.querySelector(`[data-message-id="${messageId}"]`)
      if (!target) return

      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.classList.add('message-highlight')
      window.setTimeout(() => target.classList.remove('message-highlight'), 1100)
    }

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

    watch(sortedMessages, (messageList) => {
      loadMessageAttachments(messageList)
    }, { immediate: true, deep: true })

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
      activeMessageMenuId,
      replyingTo,
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
      isOwnMessage,
      canDeleteMessage,
      getReply,
      toggleMessageMenu,
      replyToMessage,
      cancelReply,
      deleteMessage,
      scrollToMessage,
      handleAttachmentClick,
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
  position: relative;
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
  gap: 0.75rem;
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

.message-header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
}

.message-action-wrap {
  position: relative;
}

.message-action-toggle {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.08);
  color: inherit;
  cursor: pointer;
  font-weight: 700;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
}

.message:hover .message-action-toggle,
.message:focus-within .message-action-toggle,
.message-action-toggle:focus {
  opacity: 1;
}

.own-message .message-action-toggle {
  background: rgba(255, 255, 255, 0.18);
}

.message-action-toggle:hover,
.message-action-toggle:focus {
  background: rgba(15, 23, 42, 0.14);
  outline: none;
}

.own-message .message-action-toggle:hover,
.own-message .message-action-toggle:focus {
  background: rgba(255, 255, 255, 0.28);
}

.message-action-menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 5;
  min-width: 132px;
  padding: 0.35rem;
  border-radius: 10px;
  background: var(--card-bg, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  color: var(--text-color, #0f172a);
}

.message-action-menu button {
  display: block;
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.message-action-menu button:hover,
.message-action-menu button:focus {
  background: rgba(102, 126, 234, 0.12);
  outline: none;
}

.message-action-menu .danger {
  color: #dc2626;
}

.message-content {
  word-wrap: break-word;
  line-height: 1.5;
}

.message-reply {
  display: block;
  width: 100%;
  margin: 0 0 0.55rem;
  padding: 0.55rem 0.65rem;
  border: none;
  border-left: 3px solid #667eea;
  border-radius: 8px;
  background: rgba(102, 126, 234, 0.12);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.own-message .message-reply {
  border-left-color: rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.16);
}

.message-reply strong,
.message-reply span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-reply strong {
  font-size: 0.78rem;
}

.message-reply span {
  opacity: 0.78;
  font-size: 0.82rem;
}

.message-highlight {
  animation: message-highlight 1.1s ease;
}

@keyframes message-highlight {
  0%, 100% {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  35% {
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.28);
  }
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

.replying-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border-left: 3px solid #667eea;
  border-radius: 10px;
  background: rgba(102, 126, 234, 0.1);
  color: var(--text-color);
  font-size: 0.9rem;
}

.replying-preview span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.replying-preview strong {
  margin-right: 0.35rem;
}

.replying-preview button {
  border: none;
  background: transparent;
  color: #667eea;
  cursor: pointer;
  font-weight: 700;
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

html.dark-mode .message-action-menu {
  background: #242424;
  border-color: #3a3a3a;
  color: #e0e0e0;
}

html.dark-mode .message-action-menu button:hover,
html.dark-mode .message-action-menu button:focus {
  background: rgba(102, 126, 234, 0.2);
}

html.dark-mode .message-reply,
html.dark-mode .replying-preview {
  background: rgba(102, 126, 234, 0.18);
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
