<template>
  <main class="app">
    <Login v-if="!isLoggedIn" @login-success="onLoginSuccess" />
    <Chat v-else @logout="onLogout" />
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Login from './components/Login.vue';
import Chat from './components/Chat.vue';
import { hasToken, logout } from './config/api';
import { applyTheme } from './config/theme';

const isLoggedIn = ref(hasToken());

applyTheme();

function onLoginSuccess() {
  isLoggedIn.value = true;
}

function onLogout() {
  logout();
  isLoggedIn.value = false;
}
</script>

<style scoped>
.app {
  min-height: 100vh;
}
</style>
