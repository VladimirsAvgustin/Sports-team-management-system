<template>
  <div class="chat-container">
    <!-- Chat Header -->
    <div class="chat-header">
      <div class="chat-title">
        <h3>{{ currentRoom?.name || 'Chat' }}</h3>
        <span class="online-status" v-if="isConnected">
          <span class="status-dot"></span> Online
        </span>
      </div>
      <button class="close-btn" @click="$emit('close')" v-if="showClose">
        ✕
      </button>
    </div>

    <!-- Messages Container -->
    <div class="messages-container" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        <p>No messages yet. Start the conversation!</p>
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
          {{ message.message }}
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="typingUsers.length > 0" class="typing-indicator">
        <span>{{ typingUsers.join(', ') }} {{ typingUsers.length > 1 ? 'are' : 'is' }} typing...</span>
      </div>
    </div>

    <!-- Message Input -->
    <div class="message-input-container">
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
        @input="handleTyping"
        @blur="handleStopTyping"
        placeholder="Type a message..."
        class="message-input"
        :disabled="!isConnected"
      />
      <button
        @click="sendMessage"
        :disabled="!newMessage.trim() || !isConnected"
        class="send-btn"
      >
        <span>Send</span>
      </button>
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

    const messages = computed(() => chatStore.messages)
    const sortedMessages = computed(() => chatStore.sortedMessages)
    const currentRoom = computed(() => chatStore.currentRoom)
    const isConnected = computed(() => chatStore.isConnected)
    const typingUsers = computed(() => chatStore.typingUsers)
    const currentUserId = computed(() => authStore.user?.id)

    const sendMessage = () => {
      if (newMessage.value.trim()) {
        chatStore.sendMessage(newMessage.value)
        newMessage.value = ''
      }
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
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      } else if (diffInHours < 168) { // 7 days
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      } else {
        return date.toLocaleDateString('en-US', {
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
      messages,
      sortedMessages,
      currentRoom,
      isConnected,
      typingUsers,
      currentUserId,
      sendMessage,
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

.typing-indicator {
  padding: 0.5rem 1rem;
  color: var(--text-secondary, #64748b);
  font-size: 0.875rem;
  font-style: italic;
}

.message-input-container {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: var(--card-bg, #fff);
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.message-input {
  flex: 1;
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

html.dark-mode .typing-indicator {
  color: #888;
}

html.dark-mode .empty-state {
  color: #888;
}
</style>
