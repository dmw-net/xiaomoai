<template>
  <section class="login-screen" :class="{ swapped, transitioning }">
    <!-- Layout swap toggle -->
    <button class="swap-btn" type="button" @click="toggleLayout" :title="swapped ? '换回去' : '换个布局'">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M5 8.5C7 5.5 12.5 4.5 18.5 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <polyline points="15.5,4.5 18.5,7.5 15.5,10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19 15.5C17 18.5 11.5 19.5 5.5 16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <polyline points="8.5,13.5 5.5,16.5 8.5,19.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- Form panel -->
    <div class="form-panel">
      <form class="login-form" @submit.prevent="onSubmit">
        <div class="form-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.5 7.5L19 6L14.5 9.5L18 14L12.5 11.5L12 17L11.5 11.5L6 14L9.5 9.5L5 6L10.5 7.5L12 2Z" fill="currentColor"/>
            <path d="M19 16L19.8 18.2L22 19L19.8 19.8L19 22L18.2 19.8L16 19L18.2 18.2L19 16Z" fill="currentColor"/>
          </svg>
          <span>AI Study Buddy</span>
        </div>

        <h1 class="form-title">{{ isRegister ? '新同学，欢迎' : '回来了' }}</h1>
        <p class="form-subtitle">{{ isRegister ? '注册一个号，开始学点东西' : '登录后继续你的对话' }}</p>

        <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>

        <label class="field">
          <span class="field-label">用户名</span>
          <input
            v-model="form.username"
            type="text"
            placeholder="起个名字"
            :disabled="loading"
            autocomplete="username"
          />
        </label>

        <label class="field">
          <span class="field-label">密码</span>
          <input
            v-model="form.password"
            type="password"
            placeholder="至少 8 位"
            :disabled="loading"
            autocomplete="current-password"
          />
        </label>

        <label v-if="isRegister" class="field">
          <span class="field-label">昵称</span>
          <input
            v-model="form.nickname"
            type="text"
            placeholder="选填"
            :disabled="loading"
          />
        </label>

        <button class="submit-btn" type="submit" :disabled="!canSubmit || loading">
          {{ loading ? '稍等...' : (isRegister ? '注册' : '登录') }}
        </button>

        <button class="mode-link" type="button" @click="toggleMode">
          {{ isRegister ? '有号了？去登录' : '没号？去注册' }}
        </button>

        <details class="theme-picker">
          <summary class="theme-trigger">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="16" cy="10" r="1.5" fill="currentColor"/><circle cx="9" cy="15" r="1.5" fill="currentColor"/></svg>
            <span>{{ currentThemeOption.label }}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="margin-left:auto;opacity:0.5"><polyline points="6,9 12,15 18,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </summary>
          <div class="theme-dropdown">
            <button
              v-for="theme in themeOptions"
              :key="theme.name"
              class="theme-item"
              type="button"
              :class="{ active: currentTheme === theme.name }"
              @click="pickTheme(theme.name, $event)"
            >
              <span>{{ theme.label }}</span>
              <small>{{ theme.description }}</small>
            </button>
          </div>
        </details>
      </form>
    </div>

    <!-- Visual panel -->
    <div class="visual-panel">
      <div class="visual-grid" aria-hidden="true">
        <!-- Floating knowledge fragments -->
        <div class="frag frag-code">public static void</div>
        <div class="frag frag-algo">O(n log n)</div>
        <div class="frag frag-data">SELECT * FROM</div>
        <div class="frag frag-math">∫ f(x)dx</div>
        <div class="frag frag-tag">递归</div>
        <div class="frag frag-tag frag-tag-2">二叉树</div>
        <div class="frag frag-tag frag-tag-3">TCP/IP</div>
        <div class="frag frag-brace">{ }</div>
        <div class="frag frag-arrow">&lt;/&gt;</div>
        <div class="frag frag-dot dot-1"></div>
        <div class="frag frag-dot dot-2"></div>
        <div class="frag frag-dot dot-3"></div>
        <div class="frag frag-dot dot-4"></div>
        <div class="frag frag-line line-1"></div>
        <div class="frag frag-line line-2"></div>
      </div>

      <div class="visual-hero">
        <h2 class="hero-title">学点<br/>小知识</h2>
        <p class="hero-sub">问 AI，学技术，搞懂知识</p>
      </div>

      <div class="visual-footer">
        <span>AI Study Buddy</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';
import axios from 'axios';
import { API_CONFIG, getApiUrl, setToken, setUser } from '../config/api';
import { getTheme, setTheme, THEME_OPTIONS } from '../config/theme';
import type { ThemeName } from '../config/theme';

const emit = defineEmits<{ (e: 'login-success'): void }>();

const isRegister = ref(false);
const loading = ref(false);
const errorMsg = ref('');
const currentTheme = ref<ThemeName>(getTheme());
const themeOptions = THEME_OPTIONS;
const currentThemeOption = computed(() =>
  themeOptions.find(t => t.name === currentTheme.value) || themeOptions[0]
);

const form = reactive({ username: '', password: '', nickname: '' });
const canSubmit = computed(() => form.username.trim().length > 0 && form.password.length >= 8);

const swapped = ref(false);
const transitioning = ref(false);

function toggleLayout() {
  if (transitioning.value) return;
  transitioning.value = true;
  setTimeout(() => {
    swapped.value = !swapped.value;
    nextTick(() => { transitioning.value = false; });
  }, 200);
}

function toggleMode() { isRegister.value = !isRegister.value; errorMsg.value = ''; }

function pickTheme(theme: ThemeName, event?: MouseEvent) {
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
    const data = res.data as {
      token: string;
      userId: number;
      username: string;
      nickname: string;
      qq?: string;
      avatarUrl?: string;
      resolvedAvatarUrl?: string;
    };
    setToken(data.token);
    setUser({
      userId: data.userId,
      username: data.username,
      nickname: data.nickname,
      qq: data.qq,
      avatarUrl: data.avatarUrl,
      resolvedAvatarUrl: data.resolvedAvatarUrl,
    });
    emit('login-success');
  } catch (err: any) {
    errorMsg.value = err?.response?.data?.error || '出了点问题，再试试';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* ====== Layout ====== */
.login-screen {
  --form-column: clamp(360px, 35vw, 480px);
  --seam-left: var(--form-column);
  display: grid;
  grid-template-columns: var(--form-column) minmax(0, 1fr);
  min-height: 100dvh;
  overflow: hidden;
  position: relative;
}

/* ====== Form Panel ====== */
.form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  background: var(--panel-strong);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
  z-index: 2;
  transition: opacity 0.19s cubic-bezier(0.16, 1, 0.3, 1), transform 0.19s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.19s ease;
}

.login-form {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--fg);
  font-size: 15px;
  font-weight: 800;
  margin-bottom: 48px;
  opacity: 0.7;
}

.form-title {
  font-size: clamp(28px, 5vw, 38px);
  font-weight: 1000;
  line-height: 1.1;
  margin: 0 0 8px;
  color: var(--fg);
}

.form-subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
  margin: 0 0 32px;
  line-height: 1.5;
}

.form-error {
  padding: 10px 14px;
  border: 2px dashed var(--orange);
  border-radius: 10px;
  background: rgba(255, 107, 53, 0.12);
  color: var(--fg);
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
}

.field-label {
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.field input {
  width: 100%;
  height: 46px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  outline: none;
  padding: 0 14px;
  color: var(--fg);
  background: rgba(255, 255, 255, 0.04);
  font-size: 15px;
  font-weight: 600;
  transition: border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.field input:focus {
  border-color: var(--cyan);
  box-shadow: 0 0 0 3px rgba(0, 245, 212, 0.15);
}

.field input::placeholder {
  color: rgba(255, 255, 255, 0.25);
  font-weight: 400;
}

.submit-btn {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 10px;
  color: var(--bg);
  background: var(--fg);
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  margin-top: 8px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mode-link {
  width: 100%;
  height: 40px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
  transition: color 0.15s ease;
}

.mode-link:hover {
  color: var(--fg);
}

/* ---- Theme picker ---- */
.theme-picker {
  position: relative;
  margin-top: 24px;
}

.theme-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: rgba(255, 255, 255, 0.35);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  list-style: none;
  transition: color 0.15s ease;
}

.theme-trigger::-webkit-details-marker { display: none; }
.theme-trigger:hover { color: rgba(255, 255, 255, 0.6); }

.theme-dropdown {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  display: grid;
  gap: 4px;
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(20, 20, 30, 0.96);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  animation: panel-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.theme-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  transition: background 0.12s ease;
}

.theme-item:hover { background: rgba(255, 255, 255, 0.06); }
.theme-item small { color: rgba(255, 255, 255, 0.35); font-size: 11px; font-weight: 500; }
.theme-item.active { color: var(--bg); background: var(--fg); }
.theme-item.active small { color: rgba(0, 0, 0, 0.5); }

/* ====== Visual Panel ====== */
.visual-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-width: 0;
  background:
    radial-gradient(ellipse at 30% 40%, rgba(255, 58, 242, 0.18), transparent 50%),
    radial-gradient(ellipse at 70% 70%, rgba(0, 245, 212, 0.14), transparent 50%),
    repeating-linear-gradient(45deg, transparent 0 20px, rgba(255, 230, 0, 0.03) 20px 40px),
    var(--bg);
  transition: opacity 0.19s cubic-bezier(0.16, 1, 0.3, 1), transform 0.19s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.19s ease;
}

/* Grid pattern overlay */
.visual-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}

.visual-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* ---- Floating fragments ---- */
.frag {
  position: absolute;
  font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
  color: rgba(255, 255, 255, 0.08);
  font-weight: 700;
  pointer-events: none;
  user-select: none;
}

.frag-code {
  top: 14%;
  left: 12%;
  font-size: 14px;
  transform: rotate(-3deg);
  animation: drift 18s cubic-bezier(0.37, 0, 0.63, 1) infinite;
}

.frag-algo {
  top: 28%;
  right: 18%;
  font-size: 22px;
  color: rgba(0, 245, 212, 0.12);
  transform: rotate(2deg);
  animation: drift 22s cubic-bezier(0.37, 0, 0.63, 1) infinite reverse;
}

.frag-data {
  bottom: 32%;
  left: 8%;
  font-size: 13px;
  transform: rotate(-1deg);
  animation: drift 20s cubic-bezier(0.37, 0, 0.63, 1) infinite;
  animation-delay: -5s;
}

.frag-math {
  top: 55%;
  right: 25%;
  font-size: 26px;
  color: rgba(255, 230, 0, 0.1);
  transform: rotate(5deg);
  animation: drift 25s cubic-bezier(0.37, 0, 0.63, 1) infinite reverse;
  animation-delay: -8s;
}

.frag-tag {
  display: inline-block;
  padding: 4px 12px;
  border: 2px solid rgba(255, 58, 242, 0.15);
  border-radius: 999px;
  font-size: 13px;
  font-family: "Outfit", sans-serif;
  font-weight: 800;
  color: rgba(255, 58, 242, 0.15);
  top: 42%;
  left: 22%;
  animation: drift 16s cubic-bezier(0.37, 0, 0.63, 1) infinite;
  animation-delay: -3s;
}

.frag-tag-2 {
  top: 18%;
  left: 55%;
  border-color: rgba(0, 245, 212, 0.15);
  color: rgba(0, 245, 212, 0.15);
  animation-delay: -7s;
  animation-duration: 20s;
}

.frag-tag-3 {
  bottom: 22%;
  right: 15%;
  border-color: rgba(255, 230, 0, 0.12);
  color: rgba(255, 230, 0, 0.12);
  animation-delay: -11s;
  animation-duration: 24s;
}

.frag-brace {
  top: 70%;
  left: 40%;
  font-size: 48px;
  color: rgba(123, 47, 255, 0.1);
  transform: rotate(-8deg);
  animation: drift 30s cubic-bezier(0.37, 0, 0.63, 1) infinite;
}

.frag-arrow {
  bottom: 45%;
  right: 10%;
  font-size: 32px;
  color: rgba(255, 107, 53, 0.1);
  transform: rotate(6deg);
  animation: drift 19s cubic-bezier(0.37, 0, 0.63, 1) infinite reverse;
  animation-delay: -4s;
}

/* Decorative dots */
.frag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--magenta);
  opacity: 0.15;
}

.dot-1 { top: 20%; left: 35%; animation: dot-float 8s cubic-bezier(0.37, 0, 0.63, 1) infinite; }
.dot-2 { top: 65%; right: 30%; width: 12px; height: 12px; background: var(--cyan); opacity: 0.1; animation: dot-float 10s cubic-bezier(0.37, 0, 0.63, 1) infinite reverse; }
.dot-3 { bottom: 15%; left: 55%; width: 6px; height: 6px; background: var(--yellow); opacity: 0.18; animation: dot-float 12s cubic-bezier(0.37, 0, 0.63, 1) infinite; animation-delay: -3s; }
.dot-4 { top: 40%; right: 45%; width: 10px; height: 10px; background: var(--orange); opacity: 0.12; animation: dot-float 9s cubic-bezier(0.37, 0, 0.63, 1) infinite reverse; animation-delay: -6s; }

/* Decorative lines */
.frag-line {
  height: 2px;
  border-radius: 1px;
  opacity: 0.08;
}

.line-1 {
  width: 120px;
  background: var(--cyan);
  top: 35%;
  left: 5%;
  transform: rotate(-15deg);
  animation: drift 28s cubic-bezier(0.37, 0, 0.63, 1) infinite;
}

.line-2 {
  width: 80px;
  background: var(--magenta);
  bottom: 40%;
  right: 8%;
  transform: rotate(25deg);
  animation: drift 22s cubic-bezier(0.37, 0, 0.63, 1) infinite reverse;
  animation-delay: -9s;
}

/* Hero text */
.visual-hero {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 0 40px;
}

.hero-title {
  font-size: clamp(48px, 8vw, 96px);
  font-weight: 1000;
  line-height: 1;
  color: var(--fg);
  text-shadow:
    3px 3px 0 var(--purple),
    6px 6px 0 var(--magenta),
    9px 9px 0 var(--cyan);
  margin: 0 0 16px;
  animation: hero-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: 0.2s;
}

.hero-sub {
  font-size: clamp(14px, 2vw, 18px);
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  margin: 0;
  animation: hero-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: 0.4s;
}

.visual-footer {
  position: absolute;
  bottom: 24px;
  right: 28px;
  z-index: 2;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.15);
  letter-spacing: 0.1em;
}

/* ====== Swap Button ====== */
.swap-btn {
  position: absolute;
  top: 50%;
  left: var(--seam-left);
  z-index: 10;
  width: 40px;
  height: 40px;
  transform: translate(-50%, -50%);
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  background: rgba(13, 13, 26, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: left 0.38s cubic-bezier(0.16, 1, 0.3, 1), color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
}

.swap-btn:hover {
  color: var(--fg);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%) scale(1.12) rotate(180deg);
  box-shadow: 0 0 20px rgba(0, 245, 212, 0.15);
}

.swap-btn:active {
  transform: translate(-50%, -50%) scale(0.95) rotate(180deg);
}

/* ====== Swapped State ====== */
.login-screen.swapped {
  --seam-left: calc(100% - var(--form-column));
  grid-template-columns: minmax(0, 1fr) var(--form-column);
}

.login-screen.swapped .form-panel {
  border-right-color: transparent;
}

.login-screen.swapped .visual-panel {
  order: -1;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
}

/* ====== Swap Transition ====== */
.login-screen.transitioning .form-panel,
.login-screen.transitioning .visual-panel {
  opacity: 0;
  transform: scale(0.99);
  transition-duration: 0.19s;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* ====== Animations ====== */
@keyframes drift {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(8px, -12px) rotate(2deg); }
  50% { transform: translate(-4px, 6px) rotate(-1deg); }
  75% { transform: translate(6px, 10px) rotate(1deg); }
}

@keyframes dot-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@keyframes hero-in {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ====== Cyberpunk Theme ====== */
:global([data-theme="cyberpunk"] .form-panel) {
  background: rgba(10, 10, 15, 0.96);
  border-right-color: rgba(0, 255, 136, 0.15);
}

:global([data-theme="cyberpunk"] .form-title) {
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
}

:global([data-theme="cyberpunk"] .form-subtitle) {
  color: rgba(224, 224, 224, 0.4);
}

:global([data-theme="cyberpunk"] .field input) {
  border-color: rgba(0, 255, 136, 0.2);
  background: rgba(0, 255, 136, 0.03);
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .field input:focus) {
  border-color: #00ff88;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.15), 0 0 12px rgba(0, 255, 136, 0.1);
}

:global([data-theme="cyberpunk"] .submit-btn) {
  background: #00ff88;
  color: #0a0a0f;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

:global([data-theme="cyberpunk"] .mode-link) {
  color: rgba(224, 224, 224, 0.35);
}

:global([data-theme="cyberpunk"] .mode-link:hover) {
  color: #00ff88;
}

:global([data-theme="cyberpunk"] .visual-panel) {
  background:
    linear-gradient(rgba(0, 255, 136, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.02) 1px, transparent 1px),
    radial-gradient(ellipse at 30% 50%, rgba(255, 0, 255, 0.1), transparent 50%),
    radial-gradient(ellipse at 70% 60%, rgba(0, 212, 255, 0.08), transparent 50%),
    #0a0a0f;
  background-size: 50px 50px, 50px 50px, auto, auto, auto;
}

:global([data-theme="cyberpunk"] .visual-panel::before) {
  background:
    linear-gradient(rgba(0, 255, 136, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.04) 1px, transparent 1px);
  background-size: 50px 50px;
}

:global([data-theme="cyberpunk"] .hero-title) {
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
  animation-name: glitch-text;
  animation-duration: 4s;
  animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1);
  animation-iteration-count: infinite;
}

:global([data-theme="cyberpunk"] .frag-tag) {
  border-color: rgba(0, 255, 136, 0.2);
  color: rgba(0, 255, 136, 0.2);
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .frag-tag-2) {
  border-color: rgba(255, 0, 255, 0.2);
  color: rgba(255, 0, 255, 0.2);
}

:global([data-theme="cyberpunk"] .frag-tag-3) {
  border-color: rgba(0, 212, 255, 0.15);
  color: rgba(0, 212, 255, 0.15);
}

:global([data-theme="cyberpunk"] .frag-dot) { background: #00ff88; }
:global([data-theme="cyberpunk"] .frag-line) { background: #00d4ff; }

:global([data-theme="cyberpunk"] .theme-dropdown) {
  border-color: rgba(0, 255, 136, 0.2);
  background: rgba(10, 10, 15, 0.98);
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .theme-item.active) {
  background: #00ff88;
  color: #0a0a0f;
  border-radius: 2px;
}

:global([data-theme="cyberpunk"] .form-error) {
  border-color: rgba(255, 51, 102, 0.4);
  background: rgba(255, 51, 102, 0.1);
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .swap-btn) {
  background: rgba(10, 10, 15, 0.9);
  border-color: rgba(0, 255, 136, 0.25);
  color: rgba(0, 255, 136, 0.6);
}

:global([data-theme="cyberpunk"] .swap-btn:hover) {
  color: #00ff88;
  border-color: rgba(0, 255, 136, 0.5);
  box-shadow: 0 0 16px rgba(0, 255, 136, 0.2);
}

:global([data-theme="cyberpunk"] .login-screen.swapped .visual-panel) {
  border-left-color: rgba(0, 255, 136, 0.15);
}

@keyframes glitch-text {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-2px, 1px); }
  40% { transform: translate(2px, -1px); }
  60% { transform: translate(-1px, -1px); }
  80% { transform: translate(1px, 1px); }
}

/* ====== Clean Theme ====== */
:global([data-theme="clean"] .form-panel) {
  background: #ffffff;
  border-right-color: #e5e7eb;
}

:global([data-theme="clean"] .form-brand) {
  color: #202123; font-weight: 600; opacity: 1;
}

:global([data-theme="clean"] .form-title) {
  color: #202123; font-weight: 600;
  text-shadow: none;
}

:global([data-theme="clean"] .form-subtitle) {
  color: #6b7280;
}

:global([data-theme="clean"] .field-label) {
  color: #374151; font-weight: 500;
}

:global([data-theme="clean"] .field input) {
  border-color: #d1d5db;
  background: #ffffff;
  color: #202123; font-weight: 400;
}

:global([data-theme="clean"] .field input:focus) {
  border-color: #10a37f;
  box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.12);
}

:global([data-theme="clean"] .field input::placeholder) {
  color: #9ca3af;
}

:global([data-theme="clean"] .submit-btn) {
  background: #10a37f;
  color: #ffffff; font-weight: 500;
}

:global([data-theme="clean"] .mode-link) {
  color: #9ca3af;
}

:global([data-theme="clean"] .mode-link:hover) {
  color: #202123;
}

:global([data-theme="clean"] .form-error) {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

:global([data-theme="clean"] .visual-panel) {
  background:
    radial-gradient(ellipse at 40% 30%, rgba(16, 163, 127, 0.06), transparent 50%),
    radial-gradient(ellipse at 70% 70%, rgba(37, 99, 235, 0.04), transparent 50%),
    #f0fdf4;
}

:global([data-theme="clean"] .visual-panel::before) {
  background:
    linear-gradient(rgba(16, 163, 127, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16, 163, 127, 0.04) 1px, transparent 1px);
  background-size: 60px 60px;
}

:global([data-theme="clean"] .hero-title) {
  color: #202123; font-weight: 700;
  text-shadow: none;
}

:global([data-theme="clean"] .hero-sub) {
  color: #6b7280;
}

:global([data-theme="clean"] .frag) { color: rgba(0, 0, 0, 0.04); }
:global([data-theme="clean"] .frag-tag) { border-color: rgba(16, 163, 127, 0.15); color: rgba(16, 163, 127, 0.15); }
:global([data-theme="clean"] .frag-tag-2) { border-color: rgba(37, 99, 235, 0.12); color: rgba(37, 99, 235, 0.12); }
:global([data-theme="clean"] .frag-tag-3) { border-color: rgba(16, 163, 127, 0.1); color: rgba(16, 163, 127, 0.1); }
:global([data-theme="clean"] .frag-dot) { background: #10a37f; opacity: 0.1; }
:global([data-theme="clean"] .frag-line) { background: #10a37f; }
:global([data-theme="clean"] .visual-footer) { color: rgba(0, 0, 0, 0.1); }

:global([data-theme="clean"] .theme-trigger) { color: #9ca3af; }
:global([data-theme="clean"] .theme-trigger:hover) { color: #6b7280; }

:global([data-theme="clean"] .theme-dropdown) {
  border-color: #e5e7eb;
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

:global([data-theme="clean"] .theme-item) { color: #202123; }
:global([data-theme="clean"] .theme-item small) { color: #6b7280; }
:global([data-theme="clean"] .theme-item:hover) { background: #f1f5f9; }
:global([data-theme="clean"] .theme-item.active) { background: #202123; color: #fff; }
:global([data-theme="clean"] .theme-item.active small) { color: rgba(255, 255, 255, 0.6); }

:global([data-theme="clean"] .swap-btn) {
  background: rgba(255, 255, 255, 0.92);
  border-color: #d1d5db;
  color: #6b7280;
}

:global([data-theme="clean"] .swap-btn:hover) {
  color: #202123;
  border-color: #10a37f;
  box-shadow: 0 0 12px rgba(16, 163, 127, 0.15);
}

:global([data-theme="clean"] .login-screen.swapped .visual-panel) {
  border-left-color: #e5e7eb;
}

/* ====== Responsive ====== */
@media (max-width: 860px) {
  .login-screen {
    --form-column: 100%;
    --seam-left: 100%;
    grid-template-columns: 1fr;
  }

  .swap-btn {
    display: none;
  }

  .visual-panel {
    display: none;
  }

  .form-panel {
    padding: 32px 20px;
    border-right: 0;
  }
}
</style>
