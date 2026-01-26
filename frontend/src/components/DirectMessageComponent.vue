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
          <span class="online-status" v-if="isConnected">
            <span class="status-dot"></span> Online
          </span>
        </div>
      </div>
    </div>

    <!-- Messages Container -->
    <div class="messages-container" ref="messagesContainer">
      <div v-if="sortedMessages.length === 0" class="empty-state">
        <p>No messages yet. Start the conversation!</p>
      </div>

      <div
        v-for="message in sortedMessages"
        :key="message.id"
        :class="['message', { 'own-message': message.sender_id === currentUserId }]"
      >
        <div class="message-header">
          <span class="message-author">
            {{ message.sender_id === currentUserId ? 'You' : username }}
          </span>
          <span class="message-time">{{ formatTime(message.created_at) }}</span>
        </div>
        <div class="message-content">
          {{ message.message }}
        </div>
      </div>
    </div>

    <!-- Message Input -->
    <div class="message-input-container">
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
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
import { ref, computed, watch, onMounted } from 'vue'
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
    
    const newMessage = ref('')
    const messagesContainer = ref(null)

    const messages = computed(() => chatStore.dmMessages)
    const sortedMessages = computed(() => {
      return [...messages.value].sort((a, b) => 
        new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt)
      )
    })
    const isConnected = computed(() => chatStore.isConnected)
    const currentUserId = computed(() => authStore.user?.id)

    const sendMessage = () => {
      if (newMessage.value.trim()) {
        chatStore.sendDM(props.userId, newMessage.value)
        newMessage.value = ''
      }
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

    // Watch for messages changes and scroll to bottom
    watch(messages, () => {
      chatStore.scrollToBottom()
    }, { deep: true })

    onMounted(async () => {
      // Open DM conversation
      await chatStore.openDM(props.userId, props.username)
    })

    return {
      newMessage,
      messagesContainer,
      messages,
      sortedMessages,
      isConnected,
      currentUserId,
      sendMessage,
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
  background: white;
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
  padding: 1.5rem;
  background: #f8fafc;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  font-size: 1rem;
}

.message {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 12px;
  max-width: 70%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.message-input-container {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 24px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.message-input:focus {
  border-color: #667eea;
}

.message-input:disabled {
  background: #f1f5f9;
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
  background: #f1f5f9;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
