<template>
  <div class="chat-page">
    <div class="chat-layout">
      <!-- Sidebar with chat rooms list -->
      <div class="chat-sidebar">
        <div class="sidebar-header">
          <h2>Chats</h2>
          <button class="refresh-btn" @click="loadChats" title="Refresh">
            🔄
          </button>
        </div>

        <!-- Tabs for Team Chats and Direct Messages -->
        <div class="chat-tabs">
          <button 
            :class="['tab-btn', { active: activeTab === 'teams' }]"
            @click="activeTab = 'teams'"
          >
            Teams
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'dms' }]"
            @click="activeTab = 'dms'"
          >
            Direct
            <span v-if="totalUnreadDMs > 0" class="tab-badge">{{ totalUnreadDMs }}</span>
          </button>
        </div>

        <!-- Team Chats List -->
        <div v-if="activeTab === 'teams'" class="rooms-list">
          <div v-if="rooms.length === 0" class="empty-rooms">
            <p>No team chats yet</p>
            <p class="hint">Join a team to start chatting!</p>
          </div>

          <div
            v-for="room in rooms"
            :key="room.id"
            :class="['room-item', { active: selectedRoomId === room.id && !selectedDMUser }]"
            @click="selectRoom(room.id)"
          >
            <div class="room-icon">
              <span>{{ getInitials(room.team_name || room.name) }}</span>
            </div>
            <div class="room-info">
              <h4>{{ room.team_name || room.name }}</h4>
              <p class="last-message" v-if="room.last_message">
                {{ truncate(room.last_message, 40) }}
              </p>
              <p class="no-messages" v-else>No messages yet</p>
            </div>
            <div class="room-meta">
              <span class="message-time" v-if="room.last_message_time">
                {{ formatTime(room.last_message_time) }}
              </span>
              <span class="message-count" v-if="room.message_count">
                {{ room.message_count }}
              </span>
            </div>
          </div>
        </div>

        <!-- Direct Messages List -->
        <div v-else class="rooms-list">
          <div class="new-dm-btn-container">
            <button @click="showNewDMModal = true" class="new-dm-btn">
              ➕ New Message
            </button>
          </div>

          <div v-if="dmConversations.length === 0" class="empty-rooms">
            <p>No conversations yet</p>
            <p class="hint">Start a new conversation!</p>
          </div>

          <div
            v-for="conv in dmConversations"
            :key="conv.user_id"
            :class="['room-item', { active: selectedDMUser === conv.user_id }]"
            @click="selectDM(conv.user_id, conv.username)"
          >
            <div class="room-icon">
              <span>{{ getInitials(conv.username) }}</span>
            </div>
            <div class="room-info">
              <h4>{{ conv.username }}</h4>
              <p class="last-message" v-if="conv.last_message">
                {{ truncate(conv.last_message, 40) }}
              </p>
              <p class="no-messages" v-else>No messages yet</p>
            </div>
            <div class="room-meta">
              <span class="message-time" v-if="conv.last_message_time">
                {{ formatTime(conv.last_message_time) }}
              </span>
              <span v-if="conv.unread_count > 0" class="unread-badge">
                {{ conv.unread_count }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main chat area -->
      <div class="chat-main">
        <div v-if="!selectedRoomId && !selectedDMUser" class="no-chat-selected">
          <div class="empty-state">
            <span class="empty-icon">💬</span>
            <h3>Select a chat to start messaging</h3>
            <p>Choose a team chat or direct message from the sidebar</p>
          </div>
        </div>

        <ChatComponent
          v-else-if="selectedRoomId"
          :room-id="selectedRoomId"
          :key="'room-' + selectedRoomId"
        />

        <DirectMessageComponent
          v-else-if="selectedDMUser"
          :user-id="selectedDMUser"
          :username="selectedDMUsername"
          :key="'dm-' + selectedDMUser"
        />
      </div>
    </div>

    <!-- New DM Modal -->
    <div v-if="showNewDMModal" class="modal-overlay" @click="showNewDMModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>New Message</h3>
          <button @click="showNewDMModal = false" class="close-modal">✕</button>
        </div>
        <div class="modal-body">
          <input 
            v-model="userSearch" 
            placeholder="Search users..." 
            class="search-input"
          >
          <div class="users-list">
            <div
              v-for="user in filteredUsers"
              :key="user.id"
              class="user-item"
              @click="startNewDM(user)"
            >
              <div class="user-avatar">
                {{ getInitials(user.username) }}
              </div>
              <div class="user-info">
                <h4>{{ user.username }}</h4>
                <p>{{ user.email }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'
import ChatComponent from '../components/ChatComponent.vue'
import DirectMessageComponent from '../components/DirectMessageComponent.vue'

export default {
  name: 'ChatPage',
  components: {
    ChatComponent,
    DirectMessageComponent
  },
  setup() {
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    
    const selectedRoomId = ref(null)
    const selectedDMUser = ref(null)
    const selectedDMUsername = ref(null)
    const activeTab = ref('teams')
    const showNewDMModal = ref(false)
    const userSearch = ref('')

    const rooms = computed(() => chatStore.rooms)
    const dmConversations = computed(() => chatStore.dmConversations)

    const totalUnreadDMs = computed(() => {
      return dmConversations.value.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
    })

    const filteredUsers = computed(() => {
      if (!userSearch.value) return chatStore.allUsers
      const search = userSearch.value.toLowerCase()
      return chatStore.allUsers.filter(u => 
        u.username.toLowerCase().includes(search) || 
        u.email.toLowerCase().includes(search)
      )
    })

    const selectRoom = (roomId) => {
      selectedRoomId.value = roomId
      selectedDMUser.value = null
      selectedDMUsername.value = null
    }

    const selectDM = (userId, username) => {
      selectedDMUser.value = userId
      selectedDMUsername.value = username
      selectedRoomId.value = null
      chatStore.openDM(userId, username)
    }

    const startNewDM = (user) => {
      selectDM(user.id, user.username)
      showNewDMModal.value = false
      userSearch.value = ''
      activeTab.value = 'dms'
    }

    const loadChats = async () => {
      await chatStore.fetchRooms()
      await chatStore.fetchDMConversations()
      await chatStore.fetchAllUsers()
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

    const truncate = (text, length) => {
      if (!text) return ''
      return text.length > length ? text.substring(0, length) + '...' : text
    }

    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      const now = new Date()
      const diffInHours = (now - date) / (1000 * 60 * 60)

      if (diffInHours < 1) {
        return 'Just now'
      } else if (diffInHours < 24) {
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      } else if (diffInHours < 168) { // 7 days
        return date.toLocaleDateString('en-US', { weekday: 'short' })
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
      }
    }

    onMounted(async () => {
      // Connect to socket
      if (!chatStore.isConnected) {
        chatStore.connect()
      }

      // Load all chats
      await loadChats()

      // Auto-select first room or conversation
      if (rooms.value.length > 0) {
        selectedRoomId.value = rooms.value[0].id
      } else if (dmConversations.value.length > 0) {
        activeTab.value = 'dms'
        selectDM(dmConversations.value[0].user_id, dmConversations.value[0].username)
      }
    })

    onUnmounted(() => {
      chatStore.leaveRoom()
      chatStore.closeDM()
    })

    return {
      selectedRoomId,
      selectedDMUser,
      selectedDMUsername,
      activeTab,
      showNewDMModal,
      userSearch,
      rooms,
      dmConversations,
      totalUnreadDMs,
      filteredUsers,
      selectRoom,
      selectDM,
      startNewDM,
      loadChats,
      getInitials,
      truncate,
      formatTime
    }
  }
}
</script>

<style scoped>
.chat-page {
  min-height: calc(100vh - 80px);
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.chat-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  height: calc(100vh - 120px);
}

/* Sidebar */
.chat-sidebar {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #1e293b;
}

.refresh-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background 0.2s;
}

.refresh-btn:hover {
  background: #f1f5f9;
}

.rooms-list {
  flex: 1;
  overflow-y: auto;
}

.empty-rooms {
  padding: 2rem 1.5rem;
  text-align: center;
  color: #64748b;
}

.empty-rooms .hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.room-item {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f1f5f9;
}

.room-item:hover {
  background: #f8fafc;
}

.room-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-left: 3px solid #667eea;
}

.room-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: #1e293b;
}

.last-message {
  margin: 0;
  font-size: 0.875rem;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-messages {
  margin: 0;
  font-size: 0.875rem;
  color: #94a3b8;
  font-style: italic;
}

.room-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.message-time {
  font-size: 0.75rem;
  color: #94a3b8;
}

.message-count {
  background: #667eea;
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-weight: 600;
}

/* Main chat area */
.chat-main {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.no-chat-selected {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-state {
  text-align: center;
  color: #64748b;
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

/* Tabs */
.chat-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
}

.tab-btn {
  flex: 1;
  padding: 1rem;
  background: none;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tab-btn:hover {
  color: #667eea;
  background: #f8fafc;
}

.tab-btn.active {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #667eea;
}

.tab-badge {
  display: inline-block;
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  margin-left: 0.5rem;
  min-width: 20px;
  text-align: center;
}

/* New DM Button */
.new-dm-btn-container {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.new-dm-btn {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.new-dm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Unread Badge */
.unread-badge {
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1e293b;
}

.close-modal {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-modal:hover {
  background: #f1f5f9;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #667eea;
}

.users-list {
  max-height: 400px;
  overflow-y: auto;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-item:hover {
  background: #f8fafc;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.user-info h4 {
  margin: 0 0 0.25rem 0;
  color: #1e293b;
}

.user-info p {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

/* Scrollbar styling */
.rooms-list::-webkit-scrollbar {
  width: 6px;
}

.rooms-list::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.rooms-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.rooms-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive */
@media (max-width: 768px) {
  .chat-layout {
    grid-template-columns: 1fr;
  }

  .chat-sidebar {
    display: none;
  }

  .chat-page {
    padding: 1rem;
  }
}
</style>
