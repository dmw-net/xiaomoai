<template>
  <section class="login-screen">
    <div class="login-shape shape-one" aria-hidden="true">学</div>
    <div class="login-shape shape-two" aria-hidden="true">学习</div>

    <form class="login-card" @submit.prevent="onSubmit">
      <div class="login-mark">AI</div>
      <p class="login-kicker">STUDY BUDDY</p>
      <h1>欢迎回来</h1>
      <p class="login-subtitle">{{ isRegister ? '注册账号，开启新的学习旅程' : '登录以继续你的历史对话' }}</p>

      <div v-if="errorMsg" class="login-error">{{ errorMsg }}</div>

      <label class="form-group">
        <span>用户名</span>
        <input
          v-model="form.username"
          type="text"
          placeholder="请输入用户名"
          :disabled="loading"
          autocomplete="username"
        />
      </label>

      <label class="form-group">
        <span>密码</span>
        <input
          v-model="form.password"
          type="password"
          placeholder="至少 4 位"
          :disabled="loading"
          autocomplete="current-password"
        />
      </label>

      <label v-if="isRegister" class="form-group">
        <span>昵称</span>
        <input
          v-model="form.nickname"
          type="text"
          placeholder="可选"
          :disabled="loading"
        />
      </label>

      <button class="login-btn" type="submit" :disabled="!canSubmit || loading">
        {{ loading ? '加载中...' : (isRegister ? '注册' : '登录') }}
      </button>

      <button class="mode-switch" type="button" @click="toggleMode">
        {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
      </button>

      <details class="login-theme-menu">
        <summary class="login-theme-trigger">
          <span>主题</span>
          <strong>{{ currentThemeOption.label }}</strong>
        </summary>
        <div class="login-theme-panel" aria-label="选择主题">
          <button
            v-for="theme in themeOptions"
            :key="theme.name"
            class="login-theme-option"
            type="button"
            :class="{ active: currentTheme === theme.name }"
            :aria-pressed="currentTheme === theme.name"
            :title="theme.description"
            @click="onSelectTheme(theme.name, $event)"
          >
            <span>{{ theme.label }}</span>
            <small>{{ theme.description }}</small>
          </button>
        </div>
      </details>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import axios from 'axios';
import { API_CONFIG, getApiUrl, setToken, setUser } from '../config/api';
import { getTheme, setTheme, THEME_OPTIONS } from '../config/theme';
import type { ThemeName } from '../config/theme';

const emit = defineEmits<{
  (e: 'login-success'): void;
}>();

const isRegister = ref(false);
const loading = ref(false);
const errorMsg = ref('');
const currentTheme = ref<ThemeName>(getTheme());
const themeOptions = THEME_OPTIONS;
const currentThemeOption = computed(() =>
  themeOptions.find(theme => theme.name === currentTheme.value) || themeOptions[0]
);

const form = reactive({
  username: '',
  password: '',
  nickname: '',
});

const canSubmit = computed(() => form.username.trim().length > 0 && form.password.length >= 4);

function toggleMode() {
  isRegister.value = !isRegister.value;
  errorMsg.value = '';
}

function onSelectTheme(theme: ThemeName, event?: MouseEvent) {
  currentTheme.value = theme;
  setTheme(theme);
  (event?.currentTarget as HTMLElement | null)?.closest('details')?.removeAttribute('open');
}

async function onSubmit() {
  if (!canSubmit.value || loading.value) return;

  loading.value = true;
  errorMsg.value = '';

  const endpoint = isRegister.value ? API_CONFIG.ENDPOINTS.AUTH_REGISTER : API_CONFIG.ENDPOINTS.AUTH_LOGIN;

  try {
    const res = await axios.post(getApiUrl(endpoint), {
      username: form.username.trim(),
      password: form.password,
      nickname: isRegister.value ? form.nickname.trim() || form.username.trim() : undefined,
    });

    const data = res.data as { token: string; userId: number; username: string; nickname: string };
    setToken(data.token);
    setUser({ userId: data.userId, username: data.username, nickname: data.nickname });
    emit('login-success');
  } catch (err: any) {
    errorMsg.value = err?.response?.data?.error || '操作失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-screen {
  position: relative;
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 28px;
  overflow: hidden;
}

.login-screen::before {
  content: "CHAT";
  position: absolute;
  left: 50%;
  top: 50%;
  color: rgba(255, 58, 242, 0.14);
  font-size: min(28vw, 260px);
  font-weight: 1000;
  transform: translate(-50%, -50%) rotate(-8deg);
  text-shadow: 10px 10px 0 rgba(0, 245, 212, 0.16), 20px 20px 0 rgba(255, 230, 0, 0.12);
  pointer-events: none;
}

.login-shape {
  position: absolute;
  z-index: 1;
  font-size: 64px;
  color: var(--yellow);
  text-shadow: 4px 4px 0 var(--magenta), 8px 8px 0 var(--cyan);
  animation: float 6s ease-in-out infinite;
}

.shape-one {
  left: 12%;
  top: 18%;
}

.shape-two {
  right: 12%;
  bottom: 16%;
  color: var(--cyan);
  animation-delay: -2s;
}

.login-card {
  position: relative;
  z-index: 2;
  width: min(460px, 94vw);
  padding: 34px;
  border: 6px solid var(--yellow);
  border-radius: 34px 16px 34px 16px;
  background:
    radial-gradient(circle at 14% 18%, rgba(0, 245, 212, 0.18), transparent 30%),
    repeating-linear-gradient(135deg, transparent 0 12px, rgba(255, 58, 242, 0.1) 12px 24px),
    rgba(13, 13, 26, 0.9);
  box-shadow: 12px 12px 0 var(--cyan), 24px 24px 0 var(--magenta), 0 0 70px rgba(123, 47, 255, 0.48);
}

.login-mark {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border: 5px solid var(--cyan);
  border-radius: 24px;
  color: var(--bg);
  background: linear-gradient(135deg, var(--yellow), var(--orange), var(--magenta));
  font-size: 24px;
  font-weight: 1000;
  box-shadow: 7px 7px 0 var(--purple);
}

.login-kicker {
  margin: 24px 0 6px;
  color: var(--yellow);
  font-size: 13px;
  font-weight: 1000;
  letter-spacing: 0.2em;
}

.login-card h1 {
  margin: 0;
  font-size: clamp(46px, 10vw, 72px);
  line-height: 0.95;
  font-weight: 1000;
  text-shadow: 3px 3px 0 var(--purple), 6px 6px 0 var(--magenta), 9px 9px 0 var(--cyan);
}

.login-subtitle {
  margin: 18px 0 24px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 16px;
  font-weight: 800;
  line-height: 1.65;
}

.login-error {
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 4px dashed var(--orange);
  border-radius: 18px;
  background: rgba(255, 107, 53, 0.18);
  color: var(--fg);
  font-weight: 900;
}

.form-group {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.form-group span {
  color: var(--cyan);
  font-size: 13px;
  font-weight: 1000;
  letter-spacing: 0.1em;
}

.form-group input {
  width: 100%;
  height: 54px;
  border: 4px solid var(--magenta);
  border-radius: 999px;
  outline: none;
  padding: 0 18px;
  color: var(--fg);
  background: rgba(45, 27, 78, 0.72);
  font-size: 16px;
  font-weight: 850;
}

.form-group input:focus {
  border-color: var(--yellow);
  box-shadow: 0 0 0 4px rgba(0, 245, 212, 0.34), 0 0 30px rgba(255, 58, 242, 0.42);
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.46);
}

.login-btn,
.mode-switch {
  width: 100%;
  min-height: 54px;
  border: 4px solid var(--yellow);
  border-radius: 999px;
  color: var(--fg);
  background: linear-gradient(90deg, var(--magenta), var(--purple), var(--cyan), var(--magenta));
  background-size: 250% 250%;
  font-weight: 1000;
  cursor: pointer;
  box-shadow: 7px 7px 0 var(--orange);
  transition: transform 0.24s ease, box-shadow 0.24s ease;
  animation: gradient-shift 5s ease infinite;
}

.login-btn:hover:not(:disabled),
.mode-switch:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 10px 10px 0 var(--yellow), 18px 18px 0 var(--magenta);
}

.login-btn:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.mode-switch {
  margin-top: 14px;
  border-color: var(--cyan);
  background: rgba(45, 27, 78, 0.72);
  animation: none;
}

.login-theme-switcher {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
  padding: 8px;
  border: 4px solid var(--cyan);
  border-radius: 22px;
  background: rgba(45, 27, 78, 0.58);
}

.login-theme-choice {
  min-height: 42px;
  border: 4px solid var(--magenta);
  border-radius: 999px;
  color: var(--fg);
  background: rgba(45, 27, 78, 0.74);
  font-weight: 1000;
  cursor: pointer;
}

.login-theme-choice.active {
  border-color: var(--yellow);
  color: var(--bg);
  background: var(--yellow);
  box-shadow: 4px 4px 0 var(--magenta);
}

.login-theme-menu {
  position: relative;
  margin-top: 16px;
}

.login-theme-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 40px;
  padding: 8px 12px;
  border: 2px solid rgba(0, 245, 212, 0.62);
  border-radius: 14px;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(45, 27, 78, 0.54);
  cursor: pointer;
  font-size: 13px;
  font-weight: 850;
  list-style: none;
}

.login-theme-trigger::-webkit-details-marker {
  display: none;
}

.login-theme-trigger::after {
  content: "▾";
  color: var(--cyan);
  font-size: 14px;
}

.login-theme-trigger strong {
  color: var(--yellow);
  font-size: 13px;
}

.login-theme-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 10;
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 2px solid var(--cyan);
  border-radius: 16px;
  background: rgba(13, 13, 26, 0.96);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.36);
}

.login-theme-option {
  display: grid;
  gap: 2px;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  color: var(--fg);
  background: rgba(45, 27, 78, 0.58);
  cursor: pointer;
  text-align: left;
  font-weight: 850;
}

.login-theme-option small {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.64);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.login-theme-option.active {
  border-color: var(--yellow);
  color: var(--bg);
  background: var(--yellow);
}

.login-theme-option.active small {
  color: rgba(13, 13, 26, 0.68);
}

/* ====== Cyberpunk 主题登录页覆盖 ====== */
:global([data-theme="cyberpunk"] .login-screen::before ){
  color: rgba(0, 255, 136, 0.1);
  text-shadow: -4px 0 #ff00ff, 4px 0 #00d4ff;
}

:global([data-theme="cyberpunk"] .login-shape ){
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
  animation-name: glitch;
  animation-duration: 3s;
}

:global([data-theme="cyberpunk"] .login-card ){
  border-width: 2px;
  border-radius: 4px;
  background: rgba(10, 10, 15, 0.92);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.4), 0 0 30px rgba(0, 255, 136, 0.2);
}

:global([data-theme="cyberpunk"] .login-mark ){
  border-width: 2px;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
}

:global([data-theme="cyberpunk"] .login-card h1 ){
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
}

:global([data-theme="cyberpunk"] .login-error ){
  border-width: 2px;
  border-style: solid;
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .form-group input ){
  border-width: 2px;
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .login-btn),
:global([data-theme="cyberpunk"] .mode-switch),
:global([data-theme="cyberpunk"] .login-theme-choice ){
  border-width: 2px;
  border-radius: 4px;
  background: transparent;
  animation: none;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
}

:global([data-theme="cyberpunk"] .login-btn:hover:not(:disabled)),
:global([data-theme="cyberpunk"] .mode-switch:hover),
:global([data-theme="cyberpunk"] .login-theme-choice:hover ){
  background: var(--yellow);
  color: var(--bg);
  box-shadow: 0 0 16px rgba(0, 255, 136, 0.6);
  transform: none;
}

:global([data-theme="cyberpunk"] .login-theme-switcher ){
  border-width: 1px;
  border-radius: 4px;
  border-color: rgba(0, 255, 136, 0.45);
  background: rgba(18, 18, 26, 0.72);
  box-shadow: 0 0 14px rgba(0, 255, 136, 0.22);
  clip-path: polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px));
}

:global([data-theme="cyberpunk"] .login-card),
:global([data-theme="cyberpunk"] .login-mark),
:global([data-theme="cyberpunk"] .form-group input),
:global([data-theme="cyberpunk"] .login-btn),
:global([data-theme="cyberpunk"] .mode-switch),
:global([data-theme="cyberpunk"] .login-theme-choice ){
  clip-path: polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px));
}

:global([data-theme="cyberpunk"] .login-theme-choice.active ){
  color: var(--bg);
  background: var(--yellow);
  box-shadow: 0 0 14px rgba(0, 255, 136, 0.62);
}

:global([data-theme="cyberpunk"] .login-theme-trigger ){
  border: 1px solid rgba(0, 255, 136, 0.45);
  border-radius: 4px;
  color: #e0e0e0;
  background: rgba(18, 18, 26, 0.58);
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.2);
  clip-path: polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px));
}

:global([data-theme="cyberpunk"] .login-theme-trigger strong ){
  color: var(--yellow);
}

:global([data-theme="cyberpunk"] .login-theme-panel ){
  border: 1px solid rgba(0, 255, 136, 0.55);
  border-radius: 4px;
  background: rgba(10, 10, 15, 0.98);
  box-shadow: 0 0 18px rgba(0, 255, 136, 0.28);
}

:global([data-theme="cyberpunk"] .login-theme-option ){
  border-color: rgba(0, 212, 255, 0.5);
  border-radius: 4px;
  background: transparent;
  text-transform: uppercase;
}

:global([data-theme="cyberpunk"] .login-theme-option.active ){
  border-color: var(--yellow);
  color: var(--bg);
  background: var(--yellow);
}

/* ====== Clean / ChatGPT-like theme ====== */
:global([data-theme="clean"] .login-screen ){
  background: #f7f7f8;
}

:global([data-theme="clean"] .login-screen::before ){
  color: rgba(16, 163, 127, 0.06);
  text-shadow: none;
}

:global([data-theme="clean"] .login-shape ){
  display: none;
}

:global([data-theme="clean"] .login-card ){
  width: min(430px, 94vw);
  padding: 30px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.08);
}

:global([data-theme="clean"] .login-mark ){
  width: 54px;
  height: 54px;
  border: 0;
  border-radius: 12px;
  color: #ffffff;
  background: #10a37f;
  box-shadow: none;
}

:global([data-theme="clean"] .login-kicker ){
  color: #6b7280;
  letter-spacing: 0.12em;
}

:global([data-theme="clean"] .login-card h1 ){
  color: #202123;
  font-size: clamp(34px, 8vw, 48px);
  line-height: 1.08;
  text-shadow: none;
}

:global([data-theme="clean"] .login-subtitle ){
  color: #4b5563;
  font-weight: 450;
}

:global([data-theme="clean"] .login-error ){
  border: 1px solid #fecaca;
  border-radius: 12px;
  color: #991b1b;
  background: #fef2f2;
}

:global([data-theme="clean"] .form-group span ){
  color: #374151;
  letter-spacing: 0;
  font-weight: 650;
}

:global([data-theme="clean"] .form-group input ){
  border: 1px solid #d1d5db;
  border-radius: 12px;
  color: #202123;
  background: #ffffff;
  font-weight: 400;
}

:global([data-theme="clean"] .form-group input:focus ){
  border-color: #10a37f;
  box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.18);
}

:global([data-theme="clean"] .form-group input::placeholder ){
  color: #9ca3af;
}

:global([data-theme="clean"] .login-btn),
:global([data-theme="clean"] .mode-switch),
:global([data-theme="clean"] .login-theme-choice ){
  border: 1px solid #d1d5db;
  border-radius: 10px;
  color: #202123;
  background: #ffffff;
  box-shadow: none;
  animation: none;
  font-weight: 650;
}

:global([data-theme="clean"] .login-btn ){
  color: #ffffff;
  background: #10a37f;
  border-color: #10a37f;
}

:global([data-theme="clean"] .login-btn:hover:not(:disabled)),
:global([data-theme="clean"] .mode-switch:hover),
:global([data-theme="clean"] .login-theme-choice:hover ){
  border-color: #10a37f;
  box-shadow: none;
  transform: none;
}

:global([data-theme="clean"] .login-btn:hover:not(:disabled) ){
  background: #0f8f70;
}

:global([data-theme="clean"] .login-theme-switcher ){
  gap: 4px;
  padding: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f7f7f8;
}

:global([data-theme="clean"] .login-theme-choice ){
  min-height: 38px;
  border: 0;
}

:global([data-theme="clean"] .login-theme-choice.active ){
  color: #ffffff;
  background: #202123;
  box-shadow: none;
}

:global([data-theme="clean"] .login-theme-trigger ){
  min-height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  color: #4b5563;
  background: #ffffff;
  box-shadow: none;
  font-weight: 600;
}

:global([data-theme="clean"] .login-theme-trigger strong ){
  color: #202123;
}

:global([data-theme="clean"] .login-theme-trigger::after ){
  color: #6b7280;
}

:global([data-theme="clean"] .login-theme-panel ){
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

:global([data-theme="clean"] .login-theme-option ){
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  color: #202123;
  background: transparent;
  font-weight: 600;
}

:global([data-theme="clean"] .login-theme-option small ){
  color: #6b7280;
}

:global([data-theme="clean"] .login-theme-option:hover ){
  background: #f1f5f9;
}

:global([data-theme="clean"] .login-theme-option.active ){
  color: #ffffff;
  background: #202123;
}

:global([data-theme="clean"] .login-theme-option.active small ){
  color: rgba(255, 255, 255, 0.72);
}
</style>
