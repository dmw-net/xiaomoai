<template>
  <section class="chat-shell">
    <div class="decor decor-one" aria-hidden="true">&lt;/&gt;</div>
    <div class="decor decor-two" aria-hidden="true">O(n log n)</div>
    <div class="decor decor-three" aria-hidden="true">{ }</div>
    <div class="decor decor-four" aria-hidden="true">递归</div>
    <div class="decor decor-five" aria-hidden="true">SELECT *</div>
    <div class="decor decor-six" aria-hidden="true">∫ f(x)dx</div>

    <aside class="history-panel" :class="{ open: sidebarOpen }" @click.self="sidebarOpen = false">
      <div class="brand-block">
        <div class="brand-mark"><Icon icon="sparkles" :size="28" /></div>
        <div>
          <h1>AI 学习伙伴</h1>
          <p>{{ userInfo?.nickname || userInfo?.username || '未登录' }}</p>
        </div>
      </div>

      <button class="new-chat" type="button" @click="onNewChat">
        <Icon icon="plus" :size="20" />
        <span>新对话</span>
      </button>

      <div class="history-heading">
        <span>对话历史</span>
        <small>{{ conversations.length }}</small>
      </div>

      <div class="history-list">
        <div
          v-for="conversation in conversations"
          :key="conversation.id"
          class="history-item"
          :class="{ active: conversation.id === activeConversationId }"
        >
          <button class="history-main" type="button" @click="selectConversation(conversation.id)">
            <span class="history-title">{{ conversation.title }}</span>
            <span class="history-time">{{ formatTime(conversation.updatedAt) }}</span>
          </button>
          <button
            class="history-delete"
            type="button"
            aria-label="删除对话"
            title="删除对话"
            @click.stop="deleteConversation(conversation.id)"
          >
            <Icon icon="close" :size="16" />
          </button>
        </div>

        <div v-if="!historyLoading && conversations.length === 0" class="history-empty">
          还没有聊天记录
        </div>
      </div>

      <details class="theme-menu">
        <summary class="theme-trigger">
          <Icon icon="palette" :size="16" />
          <span>主题</span>
          <strong>{{ currentThemeOption.label }}</strong>
          <Icon icon="chevron-down" :size="14" />
        </summary>
        <div class="theme-panel" aria-label="选择主题">
          <button
            v-for="theme in themeOptions"
            :key="theme.name"
            class="theme-option"
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

      <button class="logout" type="button" @click="emit('logout')">
        <Icon icon="logout" :size="18" />
        <span>退出登录</span>
      </button>
    </aside>

    <main class="chat-main">
      <header class="chat-topbar">
        <button class="sidebar-toggle" type="button" @click="sidebarOpen = !sidebarOpen">
          <Icon icon="menu" :size="22" />
        </button>
        <div class="topbar-info">
          <p class="eyebrow">AI STUDY BUDDY</p>
          <h2>{{ activeConversation?.title || '新对话' }}</h2>
        </div>
        <div class="status-pill" :class="{ live: loading }">
          <span class="status-dot" :class="{ pulsing: loading }"></span>
          {{ loading ? '思考中' : '就绪' }}
        </div>
      </header>

      <div ref="scrollContainer" class="message-stage">
        <section v-if="messagesLoading" class="empty-state compact">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
          <p>加载对话中...</p>
        </section>

        <section v-else-if="messages.length === 0" class="empty-state">
          <div class="empty-badge"><Icon icon="sparkles" :size="16" /></div>
          <h3>开始新对话</h3>
          <p>问点什么试试？</p>
          <div class="prompt-grid">
            <button
              v-for="prompt in starterPrompts"
              :key="prompt"
              type="button"
              @click="usePrompt(prompt)"
            >
              {{ prompt }}
            </button>
          </div>
        </section>

        <div
          v-for="(message, index) in messages"
          :key="message.id || index"
          class="message-row"
          :class="message.role"
          style="animation: msg-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards"
          :style="{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }"
        >
          <div class="avatar">
            <Icon :icon="message.role === 'user' ? 'user' : 'bot'" :size="22" />
          </div>
          <article class="message-bubble">
            <div v-if="message.role === 'assistant' && message.content" class="md-content" v-html="renderMarkdown(message.content)"></div>
            <div v-else-if="message.role === 'assistant' && !message.content" class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
            <p v-if="message.role === 'user'">{{ message.content || '...' }}</p>
          </article>
        </div>
      </div>

      <form class="composer" @submit.prevent="onSend">
        <div class="composer-inner">
          <textarea
            ref="textareaRef"
            v-model="inputText"
            rows="1"
            :disabled="loading"
            placeholder="问点什么..."
            @keydown.enter.exact.prevent="onSend"
            @input="autoResize"
          />
          <button
            v-if="loading"
            class="stop-btn"
            type="button"
            title="停止生成"
            @click="stopGeneration()"
          >
            <Icon icon="stop" :size="18" />
          </button>
          <button v-else class="send" type="submit" :disabled="!canSend">
            <Icon icon="send" :size="18" />
          </button>
        </div>
      </form>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { marked } from 'marked';
import Icon from './Icon.vue';
import { API_CONFIG, getApiUrl, getToken, getUser } from '../config/api';
import { getTheme, setTheme, THEME_OPTIONS } from '../config/theme';
import type { UserInfo } from '../config/api';
import type { ThemeName } from '../config/theme';

type Role = 'user' | 'assistant';

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id?: number;
  role: Role;
  content: string;
  createdAt?: string;
}

marked.setOptions({ gfm: true, breaks: true });

const emit = defineEmits<{ (e: 'logout'): void }>();

const userInfo = ref<UserInfo | null>(getUser());
const conversations = ref<Conversation[]>([]);
const messages = ref<ChatMessage[]>([]);
const activeConversationId = ref<number | null>(null);
const inputText = ref('');
const loading = ref(false);
const historyLoading = ref(false);
const messagesLoading = ref(false);
const sidebarOpen = ref(false);
const scrollContainer = ref<HTMLDivElement | null>(null);
const userNearBottom = ref(true);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const abortController = ref<AbortController | null>(null);
const userStopped = ref(false);
const currentTheme = ref<ThemeName>(getTheme());
const themeOptions = THEME_OPTIONS;
const currentThemeOption = computed(() =>
  themeOptions.find(t => t.name === currentTheme.value) || themeOptions[0]
);

const starterPrompts = [
  '帮我找找最新 AIAgent 学习教程',
  '解释一下快速排序算法',
  '推荐一些面试技巧',
];

const activeConversation = computed(() =>
  conversations.value.find(item => item.id === activeConversationId.value) || null
);
const canSend = computed(() => inputText.value.trim().length > 0 && !loading.value);

function renderMarkdown(content: string): string {
  if (!content) return '';
  return marked.parse(content) as string;
}

function onSelectTheme(theme: ThemeName, event?: MouseEvent) {
  currentTheme.value = theme;
  setTheme(theme);
  (event?.currentTarget as HTMLElement | null)?.closest('details')?.removeAttribute('open');
}

/* ---- Auto-resize textarea ---- */
function autoResize() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function resetTextarea() {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
  }
}

/* ---- Code block copy buttons ---- */
function injectCopyButtons() {
  const container = scrollContainer.value;
  if (!container) return;
  const blocks = container.querySelectorAll('pre');
  blocks.forEach(pre => {
    if (pre.querySelector('.code-copy-btn')) return;
    pre.style.position = 'relative';

    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.title = '复制代码';
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15V5C5 3.9 5.9 3 7 3H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent || '';
      try {
        await navigator.clipboard.writeText(code);
        btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="4,12 9,17 20,6" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        setTimeout(() => {
          btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15V5C5 3.9 5.9 3 7 3H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
        }, 2000);
      } catch { /* ignore */ }
    });

    pre.appendChild(btn);
  });
}

function onScroll() {
  const el = scrollContainer.value;
  if (!el) return;
  userNearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}

onMounted(async () => {
  await loadConversations();
  if (conversations.value.length > 0) {
    await selectConversation(conversations.value[0].id);
  }
  scrollContainer.value?.addEventListener('scroll', onScroll, { passive: true });
});

onUnmounted(() => {
  closeStream();
  scrollContainer.value?.removeEventListener('scroll', onScroll);
});

watch(messages, async () => {
  await nextTick();
  if (userNearBottom.value) scrollToBottom();
}, { deep: true });

watch(messages, async () => {
  await nextTick();
  if (!loading.value) injectCopyButtons();
});

/* ---- HTTP helper ---- */
async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && response.headers.get('X-Auth-Error') === 'true') {
    emit('logout');
    throw new Error('Unauthorized');
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/* ---- Conversation CRUD ---- */
async function loadConversations() {
  historyLoading.value = true;
  try {
    conversations.value = await requestJson<Conversation[]>(getApiUrl(API_CONFIG.ENDPOINTS.CONVERSATIONS));
  } finally {
    historyLoading.value = false;
  }
}

async function selectConversation(conversationId: number) {
  closeStream();
  activeConversationId.value = conversationId;
  sidebarOpen.value = false;
  messagesLoading.value = true;
  userNearBottom.value = true;
  try {
    messages.value = await requestJson<ChatMessage[]>(
      getApiUrl(`${API_CONFIG.ENDPOINTS.CONVERSATIONS}/${conversationId}/messages`)
    );
    await nextTick();
    injectCopyButtons();
    scrollToBottom();
  } finally {
    messagesLoading.value = false;
  }
}

function onNewChat() {
  closeStream();
  activeConversationId.value = null;
  messages.value = [];
  inputText.value = '';
  sidebarOpen.value = false;
  resetTextarea();
}

async function deleteConversation(conversationId: number) {
  await requestJson<void>(
    getApiUrl(`${API_CONFIG.ENDPOINTS.CONVERSATIONS}/${conversationId}`),
    { method: 'DELETE' }
  );
  conversations.value = conversations.value.filter(item => item.id !== conversationId);
  if (activeConversationId.value === conversationId) onNewChat();
}

function usePrompt(prompt: string) {
  inputText.value = prompt;
  autoResize();
}

/* ---- Send / Stream ---- */
async function onSend() {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  userNearBottom.value = true;
  const conversation = await ensureConversation(text);
  if (!conversation) return;

  messages.value.push({ role: 'user', content: text });
  inputText.value = '';
  resetTextarea();
  messages.value.push({ role: 'assistant', content: '' });

  await nextTick();
  scrollToBottom();
  await openStream(conversation.id, text, messages.value.length - 1);
}

async function ensureConversation(firstMessage: string): Promise<Conversation | null> {
  if (activeConversationId.value) return activeConversation.value;
  const conversation = await requestJson<Conversation>(
    getApiUrl(API_CONFIG.ENDPOINTS.CONVERSATIONS),
    { method: 'POST', body: JSON.stringify({ title: buildTitle(firstMessage) }) }
  );
  conversations.value = [conversation, ...conversations.value];
  activeConversationId.value = conversation.id;
  return conversation;
}

async function openStream(conversationId: number, text: string, messageIndex: number) {
  loading.value = true;
  closeStream(false);

  const controller = new AbortController();
  abortController.value = controller;

  const token = getToken();
  const url = getApiUrl(API_CONFIG.ENDPOINTS.CHAT, {
    conversationId: String(conversationId),
    message: text,
  });

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401 && response.headers.get('X-Auth-Error') === 'true') {
        emit('logout'); return;
      }
      setAssistantMessage(messageIndex, response.status === 401
        ? 'AI 服务不可用，检查 API Key'
        : `请求失败 (${response.status})`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { setAssistantMessage(messageIndex, '读不了响应流'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) applySsePart(part, messageIndex);
    }
    if (buffer) applySsePart(buffer, messageIndex);
    await loadConversations();
  } catch (err: any) {
    if (err.name === 'AbortError' && userStopped.value) {
      const msg = messages.value[messageIndex];
      const content = (msg?.content || '').trim();
      if (content) {
        setAssistantMessage(messageIndex, content + '\n\n---\n*已停止生成，你可以继续提问或让我完善上面的内容。*');
      } else {
        setAssistantMessage(messageIndex, '已停止生成。你可以继续提问，或点击发送让我重新回答。');
      }
    } else if (err.name !== 'AbortError') {
      setAssistantMessage(messageIndex, '网络开小差了，再试试');
    }
  } finally {
    loading.value = false;
    abortController.value = null;
    userStopped.value = false;
    resetTextarea();
    await nextTick();
    injectCopyButtons();
  }
}

function applySsePart(part: string, messageIndex: number) {
  const lines = part.split(/\r?\n/);
  let eventName = 'message';
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    if (line.startsWith('data:')) dataLines.push(line.slice(5));
  }
  const data = dataLines.join('\n');
  if (!data || data === '[DONE]') return;
  if (eventName === 'error') {
    setAssistantMessage(messageIndex, data);
  } else if (messageIndex >= 0 && messageIndex < messages.value.length) {
    messages.value[messageIndex].content += data;
  }
}

function setAssistantMessage(messageIndex: number, content: string) {
  if (messageIndex >= 0 && messageIndex < messages.value.length) {
    messages.value[messageIndex].content = content;
  }
}

function closeStream(resetLoading = true) {
  if (abortController.value) {
    abortController.value.abort();
    abortController.value = null;
  }
  if (resetLoading) loading.value = false;
}

function stopGeneration() {
  userStopped.value = true;
  closeStream();
}

function scrollToBottom() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTo({ top: scrollContainer.value.scrollHeight, behavior: 'smooth' });
  }
}

function buildTitle(text: string) {
  const firstLine = text.replace(/\s+/g, ' ').trim();
  return firstLine.length > 36 ? `${firstLine.slice(0, 36)}...` : firstLine;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}
</script>

<style scoped>
.chat-shell {
  position: relative;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  height: 100dvh;
  overflow: hidden;
}

.chat-shell::before,
.chat-shell::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.chat-shell::before {
  background:
    conic-gradient(from 90deg at 1px 1px, transparent 90deg, rgba(0, 245, 212, 0.08) 0) 0 0 / 44px 44px,
    radial-gradient(circle at 70% 20%, rgba(255, 107, 53, 0.16), transparent 34%);
  mix-blend-mode: screen;
}

.chat-shell::after {
  background: linear-gradient(90deg, rgba(255, 58, 242, 0.16), transparent 35%, rgba(255, 230, 0, 0.1));
}

.decor {
  position: absolute;
  z-index: 3;
  color: var(--yellow);
  font-size: 28px;
  font-weight: 300;
  opacity: 0.18;
  text-shadow: 2px 2px 0 var(--magenta);
  animation: float 7s cubic-bezier(0.37, 0, 0.63, 1) infinite;
  pointer-events: none;
  font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
  letter-spacing: 0.05em;
}

.decor-one { top: 8%; left: 30%; font-size: 36px; opacity: 0.14; }
.decor-two { right: 6%; top: 10%; font-size: 22px; color: var(--cyan); animation-delay: -2s; opacity: 0.16; }
.decor-three { right: 20%; bottom: 10%; font-size: 32px; color: var(--orange); animation-delay: -4s; opacity: 0.15; }
.decor-four { top: 38%; left: 38%; font-size: 24px; color: var(--magenta); animation-delay: -1s; opacity: 0.12; font-family: inherit; }
.decor-five { right: 8%; bottom: 30%; font-size: 20px; color: var(--cyan); animation-delay: -3s; opacity: 0.13; }
.decor-six { top: 62%; left: 28%; font-size: 26px; color: var(--yellow); animation-delay: -5s; opacity: 0.12; }

.history-panel,
.chat-main {
  position: relative;
  z-index: 5;
}

.history-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100dvh;
  padding: 12px;
  border-right: 3px dashed var(--yellow);
  background:
    repeating-linear-gradient(135deg, transparent 0 12px, rgba(255, 58, 242, 0.12) 12px 24px),
    rgba(13, 13, 26, 0.88);
  box-shadow: 8px 0 0 rgba(255, 58, 242, 0.5), 16px 0 0 rgba(0, 245, 212, 0.18);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 3px solid var(--magenta);
  border-radius: 18px 10px 18px 10px;
  background: var(--panel);
  box-shadow: 4px 4px 0 var(--cyan), 8px 8px 0 var(--purple);
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 3px solid var(--yellow);
  border-radius: 14px;
  color: var(--bg);
  background: linear-gradient(135deg, var(--yellow), var(--cyan), var(--magenta));
  font-weight: 1000;
  box-shadow: var(--shadow-glow);
}

.brand-block h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 1000;
  letter-spacing: 0;
  text-shadow: 1px 1px 0 var(--purple), 2px 2px 0 var(--magenta);
}

.brand-block p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.74);
  font-size: 12px;
  font-weight: 800;
}

/* ---- Shared button base ---- */
.new-chat,
.logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  border: 3px solid var(--yellow);
  border-radius: 999px;
  color: var(--fg);
  background: linear-gradient(90deg, var(--magenta), var(--purple), var(--cyan), var(--magenta));
  background-size: 250% 250%;
  font-weight: 1000;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(255, 58, 242, 0.32), 5px 5px 0 var(--orange);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: gradient-shift 5s cubic-bezier(0.37, 0, 0.63, 1) infinite;
}

.new-chat:hover,
.logout:hover {
  transform: translateY(-2px) scale(1.02) rotate(-1deg);
  box-shadow: 0 0 24px rgba(0, 245, 212, 0.42), 7px 7px 0 var(--yellow), 12px 12px 0 var(--magenta);
}

.logout {
  background: rgba(45, 27, 78, 0.82);
  background-image: none;
  border-color: var(--orange);
  animation: none;
}

.history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--yellow);
  font-weight: 1000;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-shadow: 1px 1px 0 var(--purple);
}

.history-heading small {
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  border: 2px solid var(--cyan);
  border-radius: 999px;
  color: var(--fg);
  background: var(--purple);
  font-size: 12px;
}

.history-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow: auto;
  padding: 4px 6px 10px 0;
}

.history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px;
  gap: 6px;
  align-items: stretch;
}

.history-main,
.history-delete {
  border: 2px solid var(--cyan);
  color: var(--fg);
  background: rgba(45, 27, 78, 0.78);
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease;
}

.history-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 7px 10px;
  border-radius: 12px;
  text-align: left;
}

.history-item:nth-child(2n) .history-main {
  border-color: var(--orange);
  border-style: dashed;
}

.history-item.active .history-main {
  border-color: var(--yellow);
  background: rgba(123, 47, 255, 0.72);
  box-shadow: 3px 3px 0 var(--magenta);
}

.history-main:hover,
.history-delete:hover {
  transform: scale(1.02) rotate(1deg);
  border-color: var(--magenta);
}

.history-title {
  width: 100%;
  overflow: hidden;
  font-weight: 800;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  color: rgba(255, 255, 255, 0.68);
  font-size: 11px;
  font-weight: 700;
}

.history-delete {
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--yellow);
}

.history-empty {
  padding: 14px;
  border: 3px dotted var(--magenta);
  border-radius: 14px;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(45, 27, 78, 0.54);
  text-align: center;
  font-weight: 900;
}

/* ---- Theme picker ---- */
.theme-menu { position: relative; }

.theme-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 6px 10px;
  border: 2px solid rgba(0, 245, 212, 0.62);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(45, 27, 78, 0.54);
  cursor: pointer;
  font-size: 12px;
  font-weight: 850;
  list-style: none;
}

.theme-trigger::-webkit-details-marker { display: none; }

.theme-trigger > :last-child { margin-left: auto; }

.theme-trigger strong { color: var(--yellow); font-size: 13px; }

.theme-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 30;
  display: grid;
  gap: 4px;
  padding: 6px;
  border: 2px solid var(--cyan);
  border-radius: 12px;
  background: rgba(13, 13, 26, 0.96);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.36);
  animation: panel-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.theme-option {
  display: grid;
  gap: 1px;
  min-height: 38px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  color: var(--fg);
  background: rgba(45, 27, 78, 0.58);
  cursor: pointer;
  text-align: left;
  font-weight: 850;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease;
}

.theme-option:hover {
  transform: translateX(4px);
  background: rgba(45, 27, 78, 0.82);
}

.theme-option small {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.64);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-option.active {
  border-color: var(--yellow);
  color: var(--bg);
  background: var(--yellow);
}

.theme-option.active small { color: rgba(13, 13, 26, 0.68); }

/* ---- Main area ---- */
.chat-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100dvh;
  padding: 12px 18px;
  overflow: hidden;
}

.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  border: 3px solid var(--cyan);
  border-radius: 16px;
  background: rgba(13, 13, 26, 0.74);
  box-shadow: 5px 5px 0 var(--magenta), 10px 10px 0 var(--yellow);
}

.sidebar-toggle {
  display: none;
  width: 40px;
  height: 40px;
  border: 3px solid var(--yellow);
  border-radius: 12px;
  color: var(--fg);
  background: var(--purple);
  cursor: pointer;
  place-items: center;
}

.eyebrow {
  margin: 0 0 2px;
  color: var(--yellow);
  font-size: 11px;
  font-weight: 1000;
  letter-spacing: 0.15em;
}

.chat-topbar h2 {
  max-width: min(62vw, 760px);
  margin: 0;
  overflow: hidden;
  font-size: clamp(16px, 2.5vw, 24px);
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 1px 1px 0 var(--purple), 2px 2px 0 var(--magenta), 3px 3px 0 var(--cyan);
}

/* ---- Status pill with dot indicator ---- */
.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 6px 12px;
  border: 3px dashed var(--orange);
  border-radius: 999px;
  color: var(--bg);
  background: var(--yellow);
  font-weight: 900;
  font-size: 13px;
  box-shadow: 3px 3px 0 var(--magenta);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg);
}

.status-dot.pulsing {
  animation: dot-pulse 1s cubic-bezier(0.37, 0, 0.63, 1) infinite;
}

.status-pill.live {
  background: var(--cyan);
}

/* ---- Message area ---- */
.message-stage {
  min-height: 0;
  overflow-y: auto;
  padding: 24px 10px 20px;
  scroll-behavior: smooth;
}

.empty-state {
  max-width: 860px;
  margin: 8vh auto 0;
  padding: 34px;
  border: 5px solid var(--magenta);
  border-radius: 32px 16px 32px 16px;
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 230, 0, 0.16), transparent 32%),
    repeating-linear-gradient(45deg, transparent 0 12px, rgba(0, 245, 212, 0.08) 12px 24px),
    rgba(45, 27, 78, 0.78);
  box-shadow: 10px 10px 0 var(--cyan), 20px 20px 0 var(--yellow);
}

.empty-state.compact {
  max-width: 420px;
  text-align: center;
}

.empty-badge {
  display: inline-flex;
  padding: 8px 14px;
  border: 4px solid var(--cyan);
  border-radius: 999px;
  color: var(--bg);
  background: var(--yellow);
  font-weight: 1000;
  box-shadow: 4px 4px 0 var(--magenta);
}

.empty-state h3 {
  margin: 20px 0 10px;
  font-size: clamp(34px, 6vw, 72px);
  line-height: 1;
  font-weight: 1000;
  text-shadow: 3px 3px 0 var(--purple), 6px 6px 0 var(--magenta), 9px 9px 0 var(--cyan);
}

.empty-state p {
  max-width: 620px;
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.7;
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 28px;
}

.prompt-grid button {
  min-height: 86px;
  border: 4px solid var(--cyan);
  border-radius: 22px;
  padding: 14px;
  color: var(--fg);
  background: linear-gradient(90deg, var(--magenta), var(--purple), var(--cyan), var(--magenta));
  background-size: 250% 250%;
  font-weight: 1000;
  cursor: pointer;
  box-shadow: 0 0 24px rgba(255, 58, 242, 0.42), 7px 7px 0 var(--orange);
  text-align: left;
  line-height: 1.45;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.prompt-grid button:nth-child(2) {
  border-color: var(--yellow);
  box-shadow: 7px 7px 0 var(--magenta);
  transform: translateY(8px) rotate(1deg);
}

.prompt-grid button:nth-child(3) {
  border-color: var(--orange);
  box-shadow: 7px 7px 0 var(--cyan);
}

.prompt-grid button:hover {
  transform: translateY(-3px) scale(1.03) rotate(-1deg);
  box-shadow: 0 0 36px rgba(0, 245, 212, 0.52), 10px 10px 0 var(--yellow), 18px 18px 0 var(--magenta);
}

/* ---- Message rows ---- */
.message-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 760px);
  gap: 14px;
  align-items: start;
  margin: 0 auto 16px;
  max-width: 920px;
}

.message-row.user {
  grid-template-columns: minmax(0, 760px) 54px;
}

.message-row.user .avatar {
  grid-column: 2;
  background: linear-gradient(135deg, var(--yellow), var(--orange));
}

.message-row.user .message-bubble {
  grid-column: 1;
  justify-self: end;
  border-color: var(--yellow);
  background: rgba(123, 47, 255, 0.78);
  box-shadow: 8px 8px 0 var(--cyan);
}

.avatar {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border: 4px solid var(--yellow);
  border-radius: 18px;
  color: var(--bg);
  background: linear-gradient(135deg, var(--cyan), var(--magenta));
  box-shadow: 4px 4px 0 var(--purple);
}

.message-bubble {
  max-width: 100%;
  padding: 18px 20px;
  border: 4px solid var(--magenta);
  border-radius: 24px;
  background: rgba(13, 13, 26, 0.76);
  box-shadow: 8px 8px 0 var(--yellow);
  overflow: hidden;
}

.message-bubble p {
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  letter-spacing: 0.01em;
}

.message-bubble :deep(.md-content) {
  color: rgba(255, 255, 255, 0.88);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.8;
  word-break: break-word;
  letter-spacing: 0.01em;
}

.message-bubble :deep(.md-content p:first-child) { margin-top: 0; }
.message-bubble :deep(.md-content p:last-child) { margin-bottom: 0; }

/* ---- Typing indicator ---- */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cyan);
  animation: typing-bounce 1.2s cubic-bezier(0.37, 0, 0.63, 1) infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.15s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.3s; }

/* ---- Composer ---- */
.composer {
  max-width: 980px;
  width: 100%;
  margin: 0 auto;
  padding: 8px 12px;
  border: 5px solid var(--yellow);
  border-radius: 30px;
  background:
    radial-gradient(circle at 92% 20%, rgba(255, 58, 242, 0.18), transparent 28%),
    rgba(13, 13, 26, 0.88);
  box-shadow: 8px 8px 0 var(--magenta), 16px 16px 0 var(--cyan);
}

.composer-inner {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.composer-inner textarea {
  flex: 1;
  min-height: 40px;
  max-height: 160px;
  resize: none;
  border: 4px solid var(--cyan);
  border-radius: 22px;
  outline: none;
  padding: 10px 16px;
  color: var(--fg);
  background: rgba(45, 27, 78, 0.72);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow-y: hidden;
}

.composer-inner textarea:focus {
  border-color: var(--magenta);
  box-shadow: 0 0 0 4px rgba(255, 230, 0, 0.35), 0 0 28px rgba(0, 245, 212, 0.42);
}

.composer-inner textarea::placeholder { color: rgba(255, 255, 255, 0.48); }

.send,
.stop-btn {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: 4px solid var(--yellow);
  border-radius: 50%;
  color: var(--fg);
  background: linear-gradient(135deg, var(--magenta), var(--purple));
  cursor: pointer;
  box-shadow: 0 0 24px rgba(255, 58, 242, 0.42), 5px 5px 0 var(--orange);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.send:hover:not(:disabled),
.stop-btn:hover {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: 0 0 36px rgba(0, 245, 212, 0.52), 8px 8px 0 var(--yellow);
}

.send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.stop-btn {
  background: var(--orange);
  border-color: var(--orange);
  animation: pulse-stop 1.5s cubic-bezier(0.37, 0, 0.63, 1) infinite;
}

/* ====== Cyberpunk theme ====== */
:global([data-theme="cyberpunk"] .chat-shell::before) {
  background:
    linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mix-blend-mode: normal;
}

:global([data-theme="cyberpunk"] .chat-shell::after) {
  background: linear-gradient(90deg, rgba(255, 0, 255, 0.1), transparent 35%, rgba(0, 212, 255, 0.08));
}

:global([data-theme="cyberpunk"] .decor) {
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
  animation-name: glitch;
  animation-duration: 3s;
}

:global([data-theme="cyberpunk"] .history-panel) {
  border-right-style: solid;
  border-right-width: 2px;
  background: rgba(10, 10, 15, 0.92);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .brand-block) {
  border-width: 2px; border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
}

:global([data-theme="cyberpunk"] .brand-mark) {
  border-width: 2px; border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
}

:global([data-theme="cyberpunk"] .brand-block h1) {
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
}

:global([data-theme="cyberpunk"] .new-chat),
:global([data-theme="cyberpunk"] .logout) {
  border-width: 2px; border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
  animation: none; background: transparent;
  text-transform: uppercase; letter-spacing: 0.1em;
}

:global([data-theme="cyberpunk"] .new-chat:hover),
:global([data-theme="cyberpunk"] .logout:hover) {
  background: var(--yellow); color: var(--bg);
  box-shadow: 0 0 16px rgba(0, 255, 136, 0.6);
  transform: none;
}

:global([data-theme="cyberpunk"] .chat-topbar) {
  border-width: 2px; border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .chat-topbar h2) {
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
}

:global([data-theme="cyberpunk"] .status-pill) {
  border-width: 2px; border-style: solid; border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
}

:global([data-theme="cyberpunk"] .message-bubble) {
  border-width: 2px; border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.2);
}

:global([data-theme="cyberpunk"] .avatar) {
  border-width: 2px; border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .composer) {
  border-width: 2px; border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .composer-inner textarea) {
  border-width: 2px; border-radius: 4px;
}

:global([data-theme="cyberpunk"] .sidebar-toggle) {
  border-width: 2px; border-radius: 4px;
}

:global([data-theme="cyberpunk"] .history-main),
:global([data-theme="cyberpunk"] .history-delete) {
  border-width: 2px; border-radius: 4px;
}

:global([data-theme="cyberpunk"] .history-heading small) {
  border-width: 2px; border-radius: 4px;
}

:global([data-theme="cyberpunk"] .history-empty) {
  border-width: 2px; border-radius: 4px;
}

:global([data-theme="cyberpunk"] .empty-state) {
  border-width: 2px; border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .empty-badge) {
  border-width: 2px; border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
}

:global([data-theme="cyberpunk"] .empty-state h3) {
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
}

:global([data-theme="cyberpunk"] .prompt-grid button) { border-radius: 4px; }

:global([data-theme="cyberpunk"] .theme-trigger) {
  border: 1px solid rgba(0, 255, 136, 0.45); border-radius: 4px;
  color: #e0e0e0; background: rgba(18, 18, 26, 0.58);
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.2);
}

:global([data-theme="cyberpunk"] .theme-trigger strong) { color: var(--yellow); }

:global([data-theme="cyberpunk"] .theme-panel) {
  border: 1px solid rgba(0, 255, 136, 0.55); border-radius: 4px;
  background: rgba(10, 10, 15, 0.98);
  box-shadow: 0 0 18px rgba(0, 255, 136, 0.28);
}

:global([data-theme="cyberpunk"] .theme-option) {
  border-color: rgba(0, 212, 255, 0.5); border-radius: 4px;
  background: transparent; text-transform: uppercase;
}

:global([data-theme="cyberpunk"] .theme-option.active) {
  border-color: var(--yellow); color: var(--bg); background: var(--yellow);
}

:global([data-theme="cyberpunk"] .brand-block),
:global([data-theme="cyberpunk"] .chat-topbar),
:global([data-theme="cyberpunk"] .message-bubble),
:global([data-theme="cyberpunk"] .composer),
:global([data-theme="cyberpunk"] .empty-state),
:global([data-theme="cyberpunk"] .history-main),
:global([data-theme="cyberpunk"] .history-delete),
:global([data-theme="cyberpunk"] .new-chat),
:global([data-theme="cyberpunk"] .logout),
:global([data-theme="cyberpunk"] .prompt-grid button),
:global([data-theme="cyberpunk"] .composer-inner textarea),
:global([data-theme="cyberpunk"] .send),
:global([data-theme="cyberpunk"] .stop-btn) {
  clip-path: polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px));
}

:global([data-theme="cyberpunk"] .send),
:global([data-theme="cyberpunk"] .stop-btn) {
  border-radius: 4px;
}

/* ====== Clean theme ====== */
:global([data-theme="clean"] .chat-shell) {
  grid-template-columns: 292px minmax(0, 1fr);
  background: #f7f7f8;
}

:global([data-theme="clean"] .chat-shell::before),
:global([data-theme="clean"] .chat-shell::after),
:global([data-theme="clean"] .decor) { display: none; }

:global([data-theme="clean"] .history-panel) {
  gap: 14px; padding: 18px 14px;
  border-right: 1px solid #e5e7eb;
  background: #ffffff; box-shadow: none;
}

:global([data-theme="clean"] .brand-block) {
  gap: 12px; padding: 12px;
  border: 0; border-radius: 12px;
  background: #f7f7f8; box-shadow: none;
}

:global([data-theme="clean"] .brand-mark) {
  width: 42px; height: 42px;
  border: 0; border-radius: 10px;
  color: #fff; background: #10a37f; box-shadow: none;
}

:global([data-theme="clean"] .brand-block h1) {
  font-size: 18px; font-weight: 600; letter-spacing: 0; text-shadow: none;
}

:global([data-theme="clean"] .brand-block p),
:global([data-theme="clean"] .history-time),
:global([data-theme="clean"] .history-empty) { color: #6b7280; font-weight: 400; }

:global([data-theme="clean"] .new-chat),
:global([data-theme="clean"] .logout) {
  border: 1px solid #d1d5db; border-radius: 10px;
  color: #111827; background: #fff;
  box-shadow: none; animation: none; font-weight: 500;
}

:global([data-theme="clean"] .new-chat) {
  color: #fff; background: #10a37f; border-color: #10a37f;
}

:global([data-theme="clean"] .new-chat:hover),
:global([data-theme="clean"] .logout:hover) {
  border-color: #10a37f; background: #f1f5f9;
  box-shadow: none; transform: none;
}

:global([data-theme="clean"] .new-chat:hover) {
  color: #fff; background: #0f8f70;
}

:global([data-theme="clean"] .theme-trigger) {
  min-height: 38px;
  border: 1px solid #d1d5db; border-radius: 10px;
  color: #4b5563; background: #fff;
  box-shadow: none; font-weight: 500;
}

:global([data-theme="clean"] .theme-trigger strong) { color: #202123; }
:global([data-theme="clean"] .theme-trigger > :last-child) { color: #6b7280; }

:global([data-theme="clean"] .theme-panel) {
  border: 1px solid #e5e7eb; border-radius: 12px;
  background: #fff; box-shadow: 0 12px 28px rgba(0,0,0,0.12);
}

:global([data-theme="clean"] .theme-option) {
  min-height: 40px; border: 0; border-radius: 8px;
  color: #202123; background: transparent; font-weight: 500;
}

:global([data-theme="clean"] .theme-option small) { color: #6b7280; }
:global([data-theme="clean"] .theme-option:hover) { background: #f1f5f9; }

:global([data-theme="clean"] .theme-option.active) {
  color: #fff; background: #202123;
}

:global([data-theme="clean"] .theme-option.active small) { color: rgba(255,255,255,0.72); }

:global([data-theme="clean"] .history-heading) {
  color: #6b7280; font-weight: 500; text-shadow: none; letter-spacing: 0.03em;
}

:global([data-theme="clean"] .history-heading small) {
  height: 24px; min-width: 24px;
  border: 0; color: #6b7280; background: #ececf1;
}

:global([data-theme="clean"] .history-list) { gap: 6px; padding-right: 2px; }

:global([data-theme="clean"] .history-item) {
  grid-template-columns: minmax(0, 1fr) 34px; gap: 4px;
}

:global([data-theme="clean"] .history-main),
:global([data-theme="clean"] .history-delete) {
  border: 0; border-radius: 10px; color: #202123; background: transparent;
}

:global([data-theme="clean"] .history-main) { padding: 11px 12px; }

:global([data-theme="clean"] .history-title) { font-weight: 500; }

:global([data-theme="clean"] .history-item.active .history-main),
:global([data-theme="clean"] .history-main:hover),
:global([data-theme="clean"] .history-delete:hover) {
  background: #ececf1; border-color: transparent;
  box-shadow: none; transform: none;
}

:global([data-theme="clean"] .history-delete) { color: #6b7280; }
:global([data-theme="clean"] .history-empty) {
  border: 1px dashed #d1d5db; border-radius: 10px; background: #f9fafb;
}

:global([data-theme="clean"] .chat-main) { padding: 12px 16px; background: #f7f7f8; }

:global([data-theme="clean"] .chat-topbar) {
  padding: 8px 12px;
  border: 0; border-bottom: 1px solid #e5e7eb;
  border-radius: 0; background: transparent; box-shadow: none;
}

:global([data-theme="clean"] .eyebrow) { color: #6b7280; font-weight: 500; letter-spacing: 0.06em; font-size: 10px; }

:global([data-theme="clean"] .chat-topbar h2) {
  color: #202123;
  font-size: clamp(15px, 2vw, 22px); font-weight: 600; text-shadow: none;
}

:global([data-theme="clean"] .sidebar-toggle) {
  border: 1px solid #d1d5db; border-radius: 8px;
  color: #202123; background: #fff;
}

:global([data-theme="clean"] .status-pill) {
  border: 1px solid #d1d5db; border-radius: 999px;
  color: #047857; background: #ecfdf5; box-shadow: none;
  font-size: 12px; font-weight: 500; padding: 4px 10px;
}

:global([data-theme="clean"] .status-dot) { background: #047857; }

:global([data-theme="clean"] .message-stage) { padding: 32px 0 24px; }

:global([data-theme="clean"] .empty-state) {
  max-width: 780px;
  border: 1px solid #e5e7eb; border-radius: 14px;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

:global([data-theme="clean"] .empty-badge) {
  border: 0; border-radius: 999px;
  color: #047857; background: #ecfdf5; box-shadow: none;
}

:global([data-theme="clean"] .empty-state h3) {
  color: #202123;
  font-size: clamp(28px, 4vw, 46px); font-weight: 600; line-height: 1.12; text-shadow: none;
}

:global([data-theme="clean"] .empty-state p) {
  color: #4b5563; font-size: 16px; font-weight: 400;
}

:global([data-theme="clean"] .prompt-grid) { gap: 12px; }

:global([data-theme="clean"] .prompt-grid button) {
  min-height: 72px;
  border-color: #e5e7eb; color: #202123; background: #fff;
  box-shadow: none; transform: none; font-weight: 500;
}

:global([data-theme="clean"] .prompt-grid button:nth-child(2)),
:global([data-theme="clean"] .prompt-grid button:nth-child(3)) {
  border-color: #e5e7eb; color: #202123; background: #fff;
  box-shadow: none; transform: none;
}

:global([data-theme="clean"] .prompt-grid button:hover) {
  border-color: #10a37f; background: #f1f5f9;
  box-shadow: none; transform: none;
}

:global([data-theme="clean"] .message-row),
:global([data-theme="clean"] .message-row.user) {
  max-width: 930px; gap: 12px; margin-bottom: 26px;
}

:global([data-theme="clean"] .message-row) {
  grid-template-columns: 38px minmax(0, 820px);
}

:global([data-theme="clean"] .message-row.user) {
  grid-template-columns: minmax(0, 640px) 38px;
  justify-content: end;
}

:global([data-theme="clean"] .message-row.user .avatar) { grid-column: 2; }

:global([data-theme="clean"] .message-row.user .message-bubble) {
  grid-column: 1; justify-self: end;
  width: fit-content; max-width: 100%;
  padding: 12px 16px; border-radius: 16px;
  border-color: #e5e7eb; background: #ececf1; box-shadow: none;
}

:global([data-theme="clean"] .avatar) {
  width: 38px; height: 38px;
  border: 0; border-radius: 999px;
  color: #fff; background: #10a37f; box-shadow: none;
}

:global([data-theme="clean"] .message-bubble) {
  padding: 4px 0;
  border: 0; border-radius: 0;
  color: #202123; background: transparent; box-shadow: none;
}

:global([data-theme="clean"] .message-bubble p),
:global([data-theme="clean"] .message-bubble :deep(.md-content)) {
  color: #202123;
  font-family: "Source Han Sans SC", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 15px; font-weight: 400; line-height: 1.82; letter-spacing: 0.01em;
}

:global([data-theme="clean"] .composer) {
  max-width: 930px; padding: 8px;
  border: 1px solid #d1d5db; border-radius: 16px;
  background: #fff; box-shadow: 0 10px 28px rgba(0,0,0,0.08);
}

:global([data-theme="clean"] .composer-inner textarea) {
  min-height: 48px;
  border: 0; border-radius: 12px;
  color: #202123; background: transparent; font-weight: 400;
}

:global([data-theme="clean"] .composer-inner textarea:focus) {
  border-color: transparent; box-shadow: none;
}

:global([data-theme="clean"] .composer-inner textarea::placeholder) { color: #9ca3af; }

:global([data-theme="clean"] .send) {
  color: #fff; background: #10a37f; border: none;
  box-shadow: none;
}

:global([data-theme="clean"] .send:hover:not(:disabled)) {
  transform: none; box-shadow: none; background: #0d8a6a;
}

:global([data-theme="clean"] .stop-btn) {
  background: #ef4444; border: none; box-shadow: none;
  animation: none;
}

:global([data-theme="clean"] .stop-btn:hover) {
  transform: none; box-shadow: none; background: #dc2626;
}

:global([data-theme="clean"] .typing-indicator span) { background: #10a37f; }

/* ====== Responsive ====== */
@media (max-width: 900px) {
  .chat-shell { grid-template-columns: 1fr; }

  .history-panel {
    position: fixed; inset: 0 auto 0 0;
    width: min(86vw, 340px);
    transform: translateX(-110%);
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 20;
  }

  .history-panel.open { transform: translateX(0); }

  .chat-main { padding: 14px; }

  .sidebar-toggle { display: grid; place-items: center; }

  .chat-topbar { padding: 12px; }

  .chat-topbar h2 { max-width: 48vw; font-size: 24px; }

  .status-pill { padding: 8px 10px; font-size: 12px; }

  .prompt-grid { grid-template-columns: 1fr; }

  .prompt-grid button:nth-child(2) { transform: none; }

  .message-row,
  .message-row.user { grid-template-columns: 44px minmax(0, 1fr); }

  .message-row.user .avatar { grid-column: 1; }
  .message-row.user .message-bubble { grid-column: 2; justify-self: stretch; }

  .avatar { width: 44px; height: 44px; border-radius: 14px; }

  .composer { padding: 10px; border-radius: 22px; }

  .send, .stop-btn { width: 46px; height: 46px; }
}

@media (max-width: 900px) {
  :global([data-theme="clean"] .chat-shell) { grid-template-columns: 1fr; }
  :global([data-theme="clean"] .history-panel) { width: min(86vw, 320px); }
  :global([data-theme="clean"] .chat-main) { padding: 12px; }
  :global([data-theme="clean"] .message-row) { grid-template-columns: 36px minmax(0, 1fr); }
  :global([data-theme="clean"] .message-row.user) {
    grid-template-columns: minmax(0, 1fr) 36px; justify-content: stretch;
  }
}
</style>
