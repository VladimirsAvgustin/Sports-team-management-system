<template>
  <div v-if="show" class="modal" @click.self="closeModal">
    <div class="modal-content" @click.stop>
      <span class="close-btn" @click="closeModal">&times;</span>
      <h2>Login</h2>
      <form @submit.prevent="submitLogin">
        <label for="username">Username:</label>
        <input v-model="username" type="text" required>
        
        <label for="password">Password:</label>
        <input v-model="password" type="password" required>

        <button type="submit" class="btn">Login</button>
        
        <p v-if="errorMessage" style="color:red;">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  props: ["show"],
  data() {
    return {
      username: "",
      password: "",
      errorMessage: "",
    };
  },
  methods: {
    closeModal() {
      this.$emit("close");
    },
    async submitLogin() {
      try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          this.errorMessage = data.error || 'Ошибка входа';
        } else {
          alert(`Добро пожаловать, ${data.user.username}!`);
          this.closeModal();
        }
      } catch (error) {
        console.error(error);
        this.errorMessage = 'Сервер недоступен';
      }
    },
  },
};
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px; /* чтобы был зазор вокруг модалки */
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 10px;
  width: 350px;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  pointer-events: auto; /* разрешаем клики только на модалке */
  position: relative;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  color: red;
  font-size: 24px;
  cursor: pointer;
}
</style>
