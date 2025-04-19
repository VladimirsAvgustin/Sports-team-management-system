<template>
  <div>
    <h2>Registered Users</h2>
    <ul>
      <li v-for="user in users" :key="user.uid">
        {{ user.username }} ({{ user.email }})
      </li>
    </ul>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { db, collection, getDocs } from "../firebase";

export default {
  setup() {
    const users = ref([]);

    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      users.value = querySnapshot.docs.map(doc => doc.data());
    };

    onMounted(fetchUsers);

    return { users };
  },
};
</script>
