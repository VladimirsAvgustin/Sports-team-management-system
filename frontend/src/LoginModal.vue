<template>
  <div v-if="show" class="modal" @click.self="closeModal">
    <div class="modal-content">
      <span class="close-btn" @click="closeModal">&times;</span>
      <h2>Login</h2>
      <form @submit.prevent="submitLogin">
        <label for="username">Username:</label>
        <input v-model="username" type="text" required>
        
        <label for="password">Password:</label>
        <input v-model="password" type="password" required>

        <button type="submit" class="btn">Login</button>
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
    };
  },
  methods: {
    closeModal() {
      this.$emit("close");
    },
    submitLogin() {
      alert(`Logging in as ${this.username}`);
      this.closeModal();
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
}
.modal-content {
  background: white;
  padding: 20px;
  border-radius: 10px;
  width: 350px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}
.close-btn {
  color: red;
  font-size: 24px;
  cursor: pointer;
  float: right;
}
</style>
