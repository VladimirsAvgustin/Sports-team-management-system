import { defineStore } from 'pinia'
import { io } from 'socket.io-client'
import { useAuthStore } from './auth'

export const useChatStore = defineStore('chat', {
  state: () => ({
    socket: null,
    currentRoom: null,
    messages: [],
    rooms: [],
    typingUsers: [],
    isConnected: false,
    isTyping: false,
    // Direct Messages
    currentDM: null,
    dmMessages: [],
    dmConversations: [],
    allUsers: []
  }),

  getters: {
    sortedMessages: (state) => {
      return [...state.messages].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      )
    },
    
    unreadCount: (state) => {
      // Calculate unread messages (you can extend this with read receipts)
      return state.rooms.reduce((count, room) => count + (room.unread || 0), 0)
    }
  },

  actions: {
    // Initialize Socket.io connection
    connect() {
      const authStore = useAuthStore()
      
      if (!authStore.token || this.isConnected) {
        return
      }

      this.socket = io('http://localhost:3000', {
        auth: {
          token: authStore.token
        },
        transports: ['websocket', 'polling']
      })

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('Socket.io connected')
        this.isConnected = true
      })

      this.socket.on('disconnect', () => {
        console.log('Socket.io disconnected')
        this.isConnected = false
      })

      this.socket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error)
      })

      // Message event handlers
      this.socket.on('new_message', (message) => {
        if (this.currentRoom && message.roomId === this.currentRoom.id) {
          this.messages.push(message)
          this.scrollToBottom()
        }
        
        // Update last message in rooms list
        const roomIndex = this.rooms.findIndex(r => r.id === message.roomId)
        if (roomIndex !== -1) {
          this.rooms[roomIndex].last_message = message.message
          this.rooms[roomIndex].last_message_time = message.createdAt
        }
      })

      this.socket.on('user_joined', (data) => {
        console.log(data.message)
      })

      this.socket.on('user_left', (data) => {
        console.log(data.message)
      })

      this.socket.on('user_typing', (data) => {
        if (!this.typingUsers.includes(data.username)) {
          this.typingUsers.push(data.username)
        }
      })

      this.socket.on('user_stop_typing', (data) => {
        const index = this.typingUsers.indexOf(data.username)
        if (index > -1) {
          this.typingUsers.splice(index, 1)
        }
      })

      this.socket.on('message_error', (error) => {
        console.error('Message error:', error)
        alert('Failed to send message')
      })

      // Direct Message event handlers
      this.socket.on('new_dm', (dmData) => {
        if (this.currentDM && dmData.senderId === this.currentDM.userId) {
          this.dmMessages.push(dmData)
          this.scrollToBottom()
          // Mark as read immediately if chat is open
          this.markDMAsRead(dmData.senderId)
        }
        
        // Update or add to conversations list
        const convIndex = this.dmConversations.findIndex(c => c.user_id === dmData.senderId)
        if (convIndex !== -1) {
          this.dmConversations[convIndex].last_message = dmData.message
          this.dmConversations[convIndex].last_message_time = dmData.createdAt
          if (!this.currentDM || this.currentDM.userId !== dmData.senderId) {
            this.dmConversations[convIndex].unread_count++
          }
        } else {
          // Refresh conversations if new user
          this.fetchDMConversations()
        }
      })

      this.socket.on('dm_sent', (dmData) => {
        // Add sent message to current DM view
        if (this.currentDM && dmData.receiverId === this.currentDM.userId) {
          this.dmMessages.push(dmData)
          this.scrollToBottom()
        }
      })

      this.socket.on('dm_error', (error) => {
        console.error('DM error:', error)
        alert('Failed to send direct message')
      })
    },

    // Disconnect Socket.io
    disconnect() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.isConnected = false
      }
    },

    // Join a chat room
    async joinRoom(roomId) {
      if (!this.socket || !roomId) return

      // Leave current room if any
      if (this.currentRoom) {
        this.leaveRoom()
      }

      try {
        // Fetch room details
        const response = await fetch(`http://localhost:3000/api/chat/room/${roomId}/messages`, {
          headers: {
            'Authorization': `Bearer ${useAuthStore().token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch messages')
        }

        this.messages = await response.json()
        this.currentRoom = this.rooms.find(r => r.id === roomId)
        
        // Join room via socket
        this.socket.emit('join_room', roomId)
        
      } catch (error) {
        console.error('Error joining room:', error)
      }
    },

    // Leave current room
    leaveRoom() {
      if (this.socket && this.currentRoom) {
        this.socket.emit('leave_room', this.currentRoom.id)
        this.currentRoom = null
        this.messages = []
        this.typingUsers = []
      }
    },

    // Send a message
    sendMessage(message) {
      if (!this.socket || !this.currentRoom || !message.trim()) {
        return
      }

      this.socket.emit('send_message', {
        roomId: this.currentRoom.id,
        message: message.trim()
      })

      // Stop typing indicator
      this.stopTyping()
    },

    // Typing indicators
    startTyping() {
      if (!this.socket || !this.currentRoom || this.isTyping) return

      this.isTyping = true
      this.socket.emit('typing', { roomId: this.currentRoom.id })
    },

    stopTyping() {
      if (!this.socket || !this.currentRoom || !this.isTyping) return

      this.isTyping = false
      this.socket.emit('stop_typing', { roomId: this.currentRoom.id })
    },

    // Fetch all chat rooms
    async fetchRooms() {
      try {
        const response = await fetch('http://localhost:3000/api/chat/rooms', {
          headers: {
            'Authorization': `Bearer ${useAuthStore().token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch rooms')
        }

        this.rooms = await response.json()
      } catch (error) {
        console.error('Error fetching rooms:', error)
      }
    },

    // Get or create room for a team
    async getTeamRoom(teamId) {
      try {
        const response = await fetch(`http://localhost:3000/api/chat/team/${teamId}/room`, {
          headers: {
            'Authorization': `Bearer ${useAuthStore().token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to get team room')
        }

        const room = await response.json()
        
        // Add to rooms list if not already there
        if (!this.rooms.find(r => r.id === room.id)) {
          this.rooms.push(room)
        }

        return room
      } catch (error) {
        console.error('Error getting team room:', error)
        return null
      }
    },

    // Scroll to bottom of messages
    scrollToBottom() {
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-container')
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        }
      }, 100)
    },

    // ========== Direct Message Methods ==========

    // Fetch all users for DM
    async fetchAllUsers() {
      try {
        const response = await fetch('http://localhost:3000/api/chat/users', {
          headers: {
            'Authorization': `Bearer ${useAuthStore().token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }

        this.allUsers = await response.json()
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    },

    // Fetch DM conversations
    async fetchDMConversations() {
      try {
        const response = await fetch('http://localhost:3000/api/chat/dm-conversations', {
          headers: {
            'Authorization': `Bearer ${useAuthStore().token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch DM conversations')
        }

        this.dmConversations = await response.json()
      } catch (error) {
        console.error('Error fetching DM conversations:', error)
      }
    },

    // Open DM with a user
    async openDM(userId, username) {
      try {
        const response = await fetch(`http://localhost:3000/api/chat/dm/${userId}`, {
          headers: {
            'Authorization': `Bearer ${useAuthStore().token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch DM messages')
        }

        this.dmMessages = await response.json()
        this.currentDM = { userId, username }
        this.currentRoom = null // Close any team chat room
        
        // Mark messages as read
        await this.markDMAsRead(userId)
        
      } catch (error) {
        console.error('Error opening DM:', error)
      }
    },

    // Send direct message
    sendDM(receiverId, message) {
      if (!this.socket || !message.trim()) {
        return
      }

      this.socket.emit('send_dm', {
        receiverId,
        message: message.trim()
      })
    },

    // Mark DMs as read
    async markDMAsRead(userId) {
      try {
        await fetch(`http://localhost:3000/api/chat/dm/mark-read/${userId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${useAuthStore().token}`
          }
        })
        
        // Update local conversation unread count
        const conv = this.dmConversations.find(c => c.user_id === userId)
        if (conv) {
          conv.unread_count = 0
        }
      } catch (error) {
        console.error('Error marking DMs as read:', error)
      }
    },

    // Close DM
    closeDM() {
      this.currentDM = null
      this.dmMessages = []
    }
  }
})
