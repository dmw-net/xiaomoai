<template>
  <section class="chat-shell">
    <div class="decor decor-one" aria-hidden="true">学</div>
    <div class="decor decor-two" aria-hidden="true">学习</div>
    <div class="decor decor-three" aria-hidden="true">友</div>

    <aside class="history-panel" :class="{ open: sidebarOpen }">
      <div class="brand-block">
        <div class="brand-mark">AI</div>
        <div>
          <h1>AI 学习伙伴</h1>
          <p>{{ userInfo?.nickname || userInfo?.username || '未登录' }}</p>
        </div>
      </div>

      <button class="new-chat" type="button" @click="onNewChat">
        <span>+</span>
        新对话
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
            ×
          </button>
        </div>

        <div v-if="!historyLoading && conversations.length === 0" class="history-empty">
          暂无对话历史记录
        </div>
      </div>

      <details class="theme-menu">
        <summary class="theme-trigger">
          <span>主题</span>
          <strong>{{ currentThemeOption.label }}</strong>
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

      <button class="logout" type="button" @click="emit('logout')">退出登录</button>
    </aside>

    <main class="chat-main">
      <header class="chat-topbar">
        <button class="sidebar-toggle" type="button" @click="sidebarOpen = !sidebarOpen">
          ☰
        </button>
        <div>
          <p class="eyebrow">AI STUDY BUDDY</p>
          <h2>{{ activeConversation?.title || '新对话' }}</h2>
        </div>
        <div class="status-pill" :class="{ live: loading }">
          {{ loading ? '思考中...' : '就绪' }}
        </div>
      </header>

      <div ref="scrollContainer" class="message-stage">
        <section v-if="messagesLoading" class="empty-state compact">
          <h3>加载中...</h3>
          <p>正在加载对话消息...</p>
        </section>

        <section v-else-if="messages.length === 0" class="empty-state">
          <div class="empty-badge">NEW</div>
          <h3>开始新的对话吧！</h3>
          <p>输入你的问题，AI 将为你提供学习帮助和建议</p>
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
        >
          <div class="avatar">{{ message.role === 'user' ? 'ME' : 'AI' }}</div>
          <article class="message-bubble">
            <div v-if="message.role === 'assistant'" class="md-content" v-html="renderMarkdown(message.content || '...')"></div>
            <p v-else>{{ message.content || '...' }}</p>
          </article>
        </div>
      </div>

      <form class="composer" @submit.prevent="onSend">
        <textarea
          v-model="inputText"
          rows="1"
          :disabled="loading"
          placeholder="输入你的问题，开始与 AI 对话..."
          @keydown.enter.exact.prevent="onSend"
        />
        <button class="send" type="submit" :disabled="!canSend">
          发送
        </button>
      </form>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { marked } from 'marked';
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

// 配置 marked，启用 GFM 和换行
marked.setOptions({
  gfm: true,
  breaks: true,
});

const emit = defineEmits<{
  (e: 'logout'): void;
}>();

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
const abortController = ref<AbortController | null>(null);
const currentTheme = ref<ThemeName>(getTheme());
const themeOptions = THEME_OPTIONS;
const currentThemeOption = computed(() =>
  themeOptions.find(theme => theme.name === currentTheme.value) || themeOptions[0]
);

const starterPrompts = [
  '帮我学 Java 面向对象',
  '解释一下快速排序算法',
  '推荐一些学习数据结构的资源',
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

onMounted(async () => {
  await loadConversations();
  if (conversations.value.length > 0) {
    await selectConversation(conversations.value[0].id);
  }
});

onUnmounted(() => {
  closeStream();
});

watch(messages, async () => {
  await nextTick();
  scrollToBottom();
}, { deep: true });

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && response.headers.get('X-Auth-Error') === 'true') {
    emit('logout');
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

async function loadConversations() {
  historyLoading.value = true;
  try {
    conversations.value = await requestJson<Conversation[]>(
      getApiUrl(API_CONFIG.ENDPOINTS.CONVERSATIONS)
    );
  } finally {
    historyLoading.value = false;
  }
}

async function selectConversation(conversationId: number) {
  closeStream();
  activeConversationId.value = conversationId;
  sidebarOpen.value = false;
  messagesLoading.value = true;

  try {
    messages.value = await requestJson<ChatMessage[]>(
      getApiUrl(`${API_CONFIG.ENDPOINTS.CONVERSATIONS}/${conversationId}/messages`)
    );
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
}

async function deleteConversation(conversationId: number) {
  await requestJson<void>(
    getApiUrl(`${API_CONFIG.ENDPOINTS.CONVERSATIONS}/${conversationId}`),
    { method: 'DELETE' }
  );
  conversations.value = conversations.value.filter(item => item.id !== conversationId);
  if (activeConversationId.value === conversationId) {
    onNewChat();
  }
}

function usePrompt(prompt: string) {
  inputText.value = prompt;
}

async function onSend() {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  const conversation = await ensureConversation(text);
  if (!conversation) return;

  messages.value.push({ role: 'user', content: text });
  inputText.value = '';
  messages.value.push({ role: 'assistant', content: '' });

  await openStream(conversation.id, text, messages.value.length - 1);
}

async function ensureConversation(firstMessage: string): Promise<Conversation | null> {
  if (activeConversationId.value) {
    return activeConversation.value;
  }

  const conversation = await requestJson<Conversation>(
    getApiUrl(API_CONFIG.ENDPOINTS.CONVERSATIONS),
    {
      method: 'POST',
      body: JSON.stringify({ title: buildTitle(firstMessage) }),
    }
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
        emit('logout');
        return;
      }
      setAssistantMessage(messageIndex, response.status === 401
        ? 'AI 服务不可用，请检查 API Key 配置'
        : `请求失败，HTTP ${response.status} 错误`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      setAssistantMessage(messageIndex, '无法读取响应流');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        applySsePart(part, messageIndex);
      }
    }

    if (buffer) {
      applySsePart(buffer, messageIndex);
    }

    await loadConversations();
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      setAssistantMessage(messageIndex, '请求出错，请稍后重试');
    }
  } finally {
    loading.value = false;
    abortController.value = null;
  }
}

function applySsePart(part: string, messageIndex: number) {
  const lines = part.split(/\r?\n/);
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5));
    }
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
  if (resetLoading) {
    loading.value = false;
  }
}

function scrollToBottom() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
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
  height: 100vh;
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
  font-size: 46px;
  text-shadow: 3px 3px 0 var(--magenta), 6px 6px 0 var(--cyan);
  animation: float 6s ease-in-out infinite;
  pointer-events: none;
}

.decor-one {
  top: 9%;
  left: 27%;
}

.decor-two {
  right: 4%;
  top: 12%;
  color: var(--cyan);
  animation-delay: -2s;
}

.decor-three {
  right: 18%;
  bottom: 12%;
  color: var(--orange);
  animation-delay: -4s;
}

.history-panel,
.chat-main {
  position: relative;
  z-index: 5;
}

.history-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100vh;
  padding: 22px;
  border-right: 5px dashed var(--yellow);
  background:
    repeating-linear-gradient(135deg, transparent 0 12px, rgba(255, 58, 242, 0.12) 12px 24px),
    rgba(13, 13, 26, 0.88);
  box-shadow: 12px 0 0 rgba(255, 58, 242, 0.65), 24px 0 0 rgba(0, 245, 212, 0.28);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 4px solid var(--magenta);
  border-radius: 24px 12px 24px 12px;
  background: var(--panel);
  box-shadow: 6px 6px 0 var(--cyan), 12px 12px 0 var(--purple);
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border: 4px solid var(--yellow);
  border-radius: 18px;
  color: var(--bg);
  background: linear-gradient(135deg, var(--yellow), var(--cyan), var(--magenta));
  font-weight: 1000;
  box-shadow: var(--shadow-glow);
}

.brand-block h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 1000;
  letter-spacing: 0;
  text-shadow: 2px 2px 0 var(--purple), 4px 4px 0 var(--magenta);
}

.brand-block p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.74);
  font-size: 13px;
  font-weight: 800;
}

.new-chat,
.logout,
.theme-choice,
.send,
.prompt-grid button {
  min-height: 48px;
  border: 4px solid var(--yellow);
  border-radius: 999px;
  color: var(--fg);
  background: linear-gradient(90deg, var(--magenta), var(--purple), var(--cyan), var(--magenta));
  background-size: 250% 250%;
  font-weight: 1000;
  cursor: pointer;
  box-shadow: 0 0 24px rgba(255, 58, 242, 0.42), 7px 7px 0 var(--orange);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  animation: gradient-shift 5s ease infinite;
}

.new-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
}

.new-chat span {
  font-size: 24px;
  line-height: 1;
}

.new-chat:hover,
.logout:hover,
.theme-choice:hover,
.send:hover:not(:disabled),
.prompt-grid button:hover {
  transform: translateY(-3px) scale(1.03) rotate(-1deg);
  box-shadow: 0 0 36px rgba(0, 245, 212, 0.52), 10px 10px 0 var(--yellow), 18px 18px 0 var(--magenta);
}

.history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--yellow);
  font-weight: 1000;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-shadow: 2px 2px 0 var(--purple);
}

.history-heading small {
  display: grid;
  place-items: center;
  min-width: 32px;
  height: 32px;
  border: 3px solid var(--cyan);
  border-radius: 999px;
  color: var(--fg);
  background: var(--purple);
}

.history-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  padding: 4px 10px 14px 0;
}

.history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 8px;
  align-items: stretch;
}

.history-main,
.history-delete {
  border: 3px solid var(--cyan);
  color: var(--fg);
  background: rgba(45, 27, 78, 0.78);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.history-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 13px 14px;
  border-radius: 16px;
  text-align: left;
}

.history-item:nth-child(2n) .history-main {
  border-color: var(--orange);
  border-style: dashed;
}

.history-item.active .history-main {
  border-color: var(--yellow);
  background: rgba(123, 47, 255, 0.72);
  box-shadow: 5px 5px 0 var(--magenta);
}

.history-main:hover,
.history-delete:hover {
  transform: scale(1.02) rotate(1deg);
  border-color: var(--magenta);
}

.history-title {
  width: 100%;
  overflow: hidden;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
  font-weight: 800;
}

.history-delete {
  border-radius: 14px;
  color: var(--yellow);
  font-size: 24px;
  font-weight: 1000;
}

.history-empty {
  padding: 18px;
  border: 4px dotted var(--magenta);
  border-radius: 18px;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(45, 27, 78, 0.54);
  text-align: center;
  font-weight: 900;
}

.theme-switcher {
  display: grid;
  gap: 10px;
  padding: 10px;
  border: 4px solid var(--cyan);
  border-radius: 22px;
  background: rgba(45, 27, 78, 0.62);
}

.theme-choice {
  display: grid;
  gap: 2px;
  min-height: 58px;
  padding: 9px 12px;
  border-color: var(--cyan);
  background: rgba(45, 27, 78, 0.82);
  background-image: none;
  text-align: left;
  animation: none;
}

.theme-choice small {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-choice.active {
  border-color: var(--yellow);
  color: var(--bg);
  background: var(--yellow);
  box-shadow: 6px 6px 0 var(--magenta), 12px 12px 0 var(--cyan);
}

.theme-choice.active small {
  color: rgba(13, 13, 26, 0.76);
}

.theme-menu {
  position: relative;
}

.theme-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 38px;
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

.theme-trigger::-webkit-details-marker {
  display: none;
}

.theme-trigger::after {
  content: "▾";
  color: var(--cyan);
  font-size: 14px;
}

.theme-trigger strong {
  color: var(--yellow);
  font-size: 13px;
}

.theme-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 30;
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 2px solid var(--cyan);
  border-radius: 16px;
  background: rgba(13, 13, 26, 0.96);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.36);
}

.theme-option {
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

.theme-option.active small {
  color: rgba(13, 13, 26, 0.68);
}

.logout {
  background: rgba(45, 27, 78, 0.82);
  background-image: none;
  border-color: var(--orange);
  animation: none;
}

.chat-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100vh;
  padding: 24px 30px;
  overflow: hidden;
}

.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 18px;
  border: 5px solid var(--cyan);
  border-radius: 22px;
  background: rgba(13, 13, 26, 0.74);
  box-shadow: 8px 8px 0 var(--magenta), 16px 16px 0 var(--yellow);
}

.sidebar-toggle {
  display: none;
  width: 48px;
  height: 48px;
  border: 4px solid var(--yellow);
  border-radius: 16px;
  color: var(--fg);
  background: var(--purple);
  cursor: pointer;
  font-size: 24px;
  font-weight: 1000;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--yellow);
  font-size: 12px;
  font-weight: 1000;
  letter-spacing: 0.18em;
}

.chat-topbar h2 {
  max-width: min(62vw, 760px);
  margin: 0;
  overflow: hidden;
  font-size: clamp(24px, 4vw, 46px);
  font-weight: 1000;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 2px 2px 0 var(--purple), 4px 4px 0 var(--magenta), 6px 6px 0 var(--cyan);
}

.status-pill {
  flex: 0 0 auto;
  padding: 10px 16px;
  border: 4px dashed var(--orange);
  border-radius: 999px;
  color: var(--bg);
  background: var(--yellow);
  font-weight: 1000;
  box-shadow: 4px 4px 0 var(--magenta);
}

.status-pill.live {
  background: var(--cyan);
  animation: wiggle 1.2s ease-in-out infinite;
}

.message-stage {
  min-height: 0;
  overflow-y: auto;
  padding: 42px 10px 28px;
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
  border-color: var(--cyan);
  border-radius: 22px;
  padding: 14px;
  text-align: left;
  line-height: 1.45;
  animation: none;
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

.message-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 760px);
  gap: 14px;
  align-items: start;
  margin: 0 auto 24px;
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
  font-size: 14px;
  font-weight: 1000;
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
  color: rgba(255, 255, 255, 0.94);
  font-size: 16px;
  font-weight: 650;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-bubble :deep(.md-content) {
  color: rgba(255, 255, 255, 0.94);
  font-size: 16px;
  font-weight: 650;
  line-height: 1.75;
  word-break: break-word;
}

.message-bubble :deep(.md-content p:first-child) {
  margin-top: 0;
}

.message-bubble :deep(.md-content p:last-child) {
  margin-bottom: 0;
}

.composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  gap: 14px;
  max-width: 980px;
  width: 100%;
  margin: 0 auto;
  padding: 14px;
  border: 5px solid var(--yellow);
  border-radius: 30px;
  background:
    radial-gradient(circle at 92% 20%, rgba(255, 58, 242, 0.18), transparent 28%),
    rgba(13, 13, 26, 0.88);
  box-shadow: 8px 8px 0 var(--magenta), 16px 16px 0 var(--cyan);
}

.composer textarea {
  width: 100%;
  min-height: 56px;
  max-height: 160px;
  resize: vertical;
  border: 4px solid var(--cyan);
  border-radius: 22px;
  outline: none;
  padding: 15px 18px;
  color: var(--fg);
  background: rgba(45, 27, 78, 0.72);
  font-size: 16px;
  font-weight: 750;
  line-height: 1.5;
}

.composer textarea:focus {
  border-color: var(--magenta);
  box-shadow: 0 0 0 4px rgba(255, 230, 0, 0.35), 0 0 28px rgba(0, 245, 212, 0.42);
}

.composer textarea::placeholder {
  color: rgba(255, 255, 255, 0.48);
}

.send {
  align-self: stretch;
}

.send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ====== Cyberpunk 主题覆盖 ====== */
:global([data-theme="cyberpunk"] .chat-shell::before ){
  background:
    linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mix-blend-mode: normal;
}

:global([data-theme="cyberpunk"] .chat-shell::after ){
  background: linear-gradient(90deg, rgba(255, 0, 255, 0.1), transparent 35%, rgba(0, 212, 255, 0.08));
}

:global([data-theme="cyberpunk"] .decor ){
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
  animation-name: glitch;
  animation-duration: 3s;
}

:global([data-theme="cyberpunk"] .history-panel ){
  border-right-style: solid;
  border-right-width: 2px;
  background:
    rgba(10, 10, 15, 0.92);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .brand-block ){
  border-width: 2px;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
}

:global([data-theme="cyberpunk"] .brand-mark ){
  border-width: 2px;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
}

:global([data-theme="cyberpunk"] .brand-block h1 ){
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
}

:global([data-theme="cyberpunk"] .new-chat),
:global([data-theme="cyberpunk"] .logout),
:global([data-theme="cyberpunk"] .theme-choice),
:global([data-theme="cyberpunk"] .send),
:global([data-theme="cyberpunk"] .prompt-grid button ){
  border-width: 2px;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
  animation: none;
  background: transparent;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

:global([data-theme="cyberpunk"] .new-chat:hover),
:global([data-theme="cyberpunk"] .logout:hover),
:global([data-theme="cyberpunk"] .theme-choice:hover),
:global([data-theme="cyberpunk"] .send:hover:not(:disabled)),
:global([data-theme="cyberpunk"] .prompt-grid button:hover ){
  background: var(--yellow);
  color: var(--bg);
  box-shadow: 0 0 16px rgba(0, 255, 136, 0.6);
  transform: none;
}

:global([data-theme="cyberpunk"] .chat-topbar ){
  border-width: 2px;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .chat-topbar h2 ){
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
}

:global([data-theme="cyberpunk"] .status-pill ){
  border-width: 2px;
  border-style: solid;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
}

:global([data-theme="cyberpunk"] .message-bubble ){
  border-width: 2px;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.2);
}

:global([data-theme="cyberpunk"] .avatar ){
  border-width: 2px;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .composer ){
  border-width: 2px;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .composer textarea ){
  border-width: 2px;
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .sidebar-toggle ){
  border-width: 2px;
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .history-main),
:global([data-theme="cyberpunk"] .history-delete ){
  border-width: 2px;
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .history-heading small ){
  border-width: 2px;
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .history-empty ){
  border-width: 2px;
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .empty-state ){
  border-width: 2px;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .empty-badge ){
  border-width: 2px;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
}

:global([data-theme="cyberpunk"] .empty-state h3 ){
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
}

:global([data-theme="cyberpunk"] .prompt-grid button ){
  border-radius: 4px;
}

:global([data-theme="cyberpunk"] .theme-switcher ){
  border: 1px solid rgba(0, 255, 136, 0.45);
  border-radius: 4px;
  background: rgba(18, 18, 26, 0.72);
  box-shadow: 0 0 14px rgba(0, 255, 136, 0.22);
  clip-path: polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px));
}

:global([data-theme="cyberpunk"] .theme-choice.active ){
  border-color: var(--yellow);
  color: var(--bg);
  background: var(--yellow);
  box-shadow: 0 0 14px rgba(0, 255, 136, 0.62);
}

:global([data-theme="cyberpunk"] .theme-choice.active small ){
  color: rgba(10, 10, 15, 0.72);
}

:global([data-theme="cyberpunk"] .theme-trigger ){
  border: 1px solid rgba(0, 255, 136, 0.45);
  border-radius: 4px;
  color: #e0e0e0;
  background: rgba(18, 18, 26, 0.58);
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.2);
  clip-path: polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px));
}

:global([data-theme="cyberpunk"] .theme-trigger strong ){
  color: var(--yellow);
}

:global([data-theme="cyberpunk"] .theme-panel ){
  border: 1px solid rgba(0, 255, 136, 0.55);
  border-radius: 4px;
  background: rgba(10, 10, 15, 0.98);
  box-shadow: 0 0 18px rgba(0, 255, 136, 0.28);
}

:global([data-theme="cyberpunk"] .theme-option ){
  border-color: rgba(0, 212, 255, 0.5);
  border-radius: 4px;
  background: transparent;
  text-transform: uppercase;
}

:global([data-theme="cyberpunk"] .theme-option.active ){
  border-color: var(--yellow);
  color: var(--bg);
  background: var(--yellow);
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
:global([data-theme="cyberpunk"] .theme-choice),
:global([data-theme="cyberpunk"] .send),
:global([data-theme="cyberpunk"] .prompt-grid button),
:global([data-theme="cyberpunk"] .composer textarea ){
  clip-path: polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px));
}

/* ====== Clean / ChatGPT-like theme ====== */
:global([data-theme="clean"] .chat-shell ){
  grid-template-columns: 292px minmax(0, 1fr);
  background: #f7f7f8;
}

:global([data-theme="clean"] .chat-shell::before),
:global([data-theme="clean"] .chat-shell::after),
:global([data-theme="clean"] .decor ){
  display: none;
}

:global([data-theme="clean"] .history-panel ){
  gap: 14px;
  padding: 18px 14px;
  border-right: 1px solid #e5e7eb;
  background: #ffffff;
  box-shadow: none;
}

:global([data-theme="clean"] .brand-block ){
  gap: 12px;
  padding: 12px;
  border: 0;
  border-radius: 12px;
  background: #f7f7f8;
  box-shadow: none;
}

:global([data-theme="clean"] .brand-mark ){
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 10px;
  color: #ffffff;
  background: #10a37f;
  box-shadow: none;
}

:global([data-theme="clean"] .brand-block h1 ){
  font-size: 18px;
  letter-spacing: 0;
  text-shadow: none;
}

:global([data-theme="clean"] .brand-block p),
:global([data-theme="clean"] .history-time),
:global([data-theme="clean"] .history-empty),
:global([data-theme="clean"] .theme-choice small ){
  color: #6b7280;
}

:global([data-theme="clean"] .new-chat),
:global([data-theme="clean"] .logout),
:global([data-theme="clean"] .theme-choice),
:global([data-theme="clean"] .send),
:global([data-theme="clean"] .prompt-grid button ){
  border: 1px solid #d1d5db;
  border-radius: 10px;
  color: #111827;
  background: #ffffff;
  box-shadow: none;
  animation: none;
  font-weight: 650;
  transform: none;
}

:global([data-theme="clean"] .new-chat ){
  color: #ffffff;
  background: #10a37f;
  border-color: #10a37f;
}

:global([data-theme="clean"] .new-chat:hover),
:global([data-theme="clean"] .logout:hover),
:global([data-theme="clean"] .theme-choice:hover),
:global([data-theme="clean"] .send:hover:not(:disabled)),
:global([data-theme="clean"] .prompt-grid button:hover ){
  border-color: #10a37f;
  background: #f1f5f9;
  box-shadow: none;
  transform: none;
}

:global([data-theme="clean"] .new-chat:hover),
:global([data-theme="clean"] .send:hover:not(:disabled) ){
  color: #ffffff;
  background: #0f8f70;
}

:global([data-theme="clean"] .theme-switcher ){
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f7f7f8;
}

:global([data-theme="clean"] .theme-choice ){
  min-height: 38px;
  justify-items: center;
  padding: 8px 6px;
  border: 0;
  text-align: center;
}

:global([data-theme="clean"] .theme-choice small ){
  display: none;
}

:global([data-theme="clean"] .theme-choice.active ){
  color: #ffffff;
  background: #202123;
  box-shadow: none;
}

:global([data-theme="clean"] .theme-trigger ){
  min-height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  color: #4b5563;
  background: #ffffff;
  box-shadow: none;
  font-weight: 600;
}

:global([data-theme="clean"] .theme-trigger strong ){
  color: #202123;
}

:global([data-theme="clean"] .theme-trigger::after ){
  color: #6b7280;
}

:global([data-theme="clean"] .theme-panel ){
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

:global([data-theme="clean"] .theme-option ){
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  color: #202123;
  background: transparent;
  font-weight: 600;
}

:global([data-theme="clean"] .theme-option small ){
  color: #6b7280;
}

:global([data-theme="clean"] .theme-option:hover ){
  background: #f1f5f9;
}

:global([data-theme="clean"] .theme-option.active ){
  color: #ffffff;
  background: #202123;
}

:global([data-theme="clean"] .theme-option.active small ){
  color: rgba(255, 255, 255, 0.72);
}

:global([data-theme="clean"] .history-heading ){
  color: #6b7280;
  text-shadow: none;
  letter-spacing: 0.03em;
}

:global([data-theme="clean"] .history-heading small ){
  height: 24px;
  min-width: 24px;
  border: 0;
  color: #6b7280;
  background: #ececf1;
}

:global([data-theme="clean"] .history-list ){
  gap: 6px;
  padding-right: 2px;
}

:global([data-theme="clean"] .history-item ){
  grid-template-columns: minmax(0, 1fr) 34px;
  gap: 4px;
}

:global([data-theme="clean"] .history-main),
:global([data-theme="clean"] .history-delete ){
  border: 0;
  border-radius: 10px;
  color: #202123;
  background: transparent;
}

:global([data-theme="clean"] .history-main ){
  padding: 11px 12px;
}

:global([data-theme="clean"] .history-item.active .history-main),
:global([data-theme="clean"] .history-main:hover),
:global([data-theme="clean"] .history-delete:hover ){
  background: #ececf1;
  border-color: transparent;
  box-shadow: none;
  transform: none;
}

:global([data-theme="clean"] .history-delete ){
  color: #6b7280;
  font-size: 18px;
}

:global([data-theme="clean"] .history-empty ){
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  background: #f9fafb;
}

:global([data-theme="clean"] .chat-main ){
  padding: 16px 20px;
  background: #f7f7f8;
}

:global([data-theme="clean"] .chat-topbar ){
  padding: 12px 0 16px;
  border: 0;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

:global([data-theme="clean"] .eyebrow ){
  color: #6b7280;
  letter-spacing: 0.08em;
}

:global([data-theme="clean"] .chat-topbar h2 ){
  color: #202123;
  font-size: clamp(20px, 3vw, 30px);
  font-weight: 700;
  text-shadow: none;
}

:global([data-theme="clean"] .sidebar-toggle ){
  border: 1px solid #d1d5db;
  border-radius: 10px;
  color: #202123;
  background: #ffffff;
}

:global([data-theme="clean"] .status-pill ){
  border: 1px solid #d1d5db;
  border-radius: 999px;
  color: #047857;
  background: #ecfdf5;
  box-shadow: none;
}

:global([data-theme="clean"] .message-stage ){
  padding: 32px 0 24px;
}

:global([data-theme="clean"] .empty-state ){
  max-width: 780px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

:global([data-theme="clean"] .empty-badge ){
  border: 0;
  border-radius: 999px;
  color: #047857;
  background: #ecfdf5;
  box-shadow: none;
}

:global([data-theme="clean"] .empty-state h3 ){
  color: #202123;
  font-size: clamp(28px, 4vw, 46px);
  line-height: 1.12;
  text-shadow: none;
}

:global([data-theme="clean"] .empty-state p ){
  color: #4b5563;
  font-size: 16px;
  font-weight: 450;
}

:global([data-theme="clean"] .prompt-grid ){
  gap: 12px;
}

:global([data-theme="clean"] .prompt-grid button),
:global([data-theme="clean"] .prompt-grid button:nth-child(2)),
:global([data-theme="clean"] .prompt-grid button:nth-child(3) ){
  min-height: 72px;
  border-color: #e5e7eb;
  color: #202123;
  background: #ffffff;
  box-shadow: none;
  transform: none;
}

:global([data-theme="clean"] .message-row),
:global([data-theme="clean"] .message-row.user ){
  max-width: 930px;
  gap: 12px;
  margin-bottom: 26px;
}

:global([data-theme="clean"] .message-row ){
  grid-template-columns: 38px minmax(0, 820px);
}

:global([data-theme="clean"] .message-row.user ){
  grid-template-columns: minmax(0, 640px) 38px;
  justify-content: end;
}

:global([data-theme="clean"] .message-row.user .avatar ){
  grid-column: 2;
}

:global([data-theme="clean"] .message-row.user .message-bubble ){
  grid-column: 1;
  justify-self: end;
  width: fit-content;
  max-width: 100%;
  padding: 12px 16px;
  border-radius: 16px;
  border-color: #e5e7eb;
  background: #ececf1;
  box-shadow: none;
}

:global([data-theme="clean"] .avatar ){
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 999px;
  color: #ffffff;
  background: #10a37f;
  box-shadow: none;
  font-size: 12px;
}

:global([data-theme="clean"] .message-bubble ){
  padding: 4px 0;
  border: 0;
  border-radius: 0;
  color: #202123;
  background: transparent;
  box-shadow: none;
}

:global([data-theme="clean"] .message-bubble p),
:global([data-theme="clean"] .message-bubble :deep(.md-content) ){
  color: #202123;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.82;
}

:global([data-theme="clean"] .composer ){
  grid-template-columns: minmax(0, 1fr) 92px;
  max-width: 930px;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
}

:global([data-theme="clean"] .composer textarea ){
  min-height: 48px;
  border: 0;
  border-radius: 12px;
  color: #202123;
  background: transparent;
  font-weight: 400;
}

:global([data-theme="clean"] .composer textarea:focus ){
  border-color: transparent;
  box-shadow: none;
}

:global([data-theme="clean"] .composer textarea::placeholder ){
  color: #9ca3af;
}

:global([data-theme="clean"] .send ){
  color: #ffffff;
  background: #10a37f;
  border-color: #10a37f;
}

@media (max-width: 900px) {
  .chat-shell {
    grid-template-columns: 1fr;
  }

  .history-panel {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(86vw, 340px);
    transform: translateX(-110%);
    transition: transform 0.3s ease;
    z-index: 20;
  }

  .history-panel.open {
    transform: translateX(0);
  }

  .chat-main {
    padding: 14px;
  }

  .sidebar-toggle {
    display: grid;
    place-items: center;
  }

  .chat-topbar {
    padding: 12px;
  }

  .chat-topbar h2 {
    max-width: 48vw;
    font-size: 24px;
  }

  .status-pill {
    padding: 8px 10px;
    font-size: 12px;
  }

  .prompt-grid {
    grid-template-columns: 1fr;
  }

  .prompt-grid button:nth-child(2) {
    transform: none;
  }

  .message-row,
  .message-row.user {
    grid-template-columns: 44px minmax(0, 1fr);
  }

  .message-row.user .avatar {
    grid-column: 1;
  }

  .message-row.user .message-bubble {
    grid-column: 2;
    justify-self: stretch;
  }

  .avatar {
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }

  .composer {
    grid-template-columns: 1fr;
  }

  .send {
    min-height: 50px;
  }
}

@media (max-width: 900px) {
  :global([data-theme="clean"] .chat-shell ){
    grid-template-columns: 1fr;
  }

  :global([data-theme="clean"] .history-panel ){
    width: min(86vw, 320px);
  }

  :global([data-theme="clean"] .chat-main ){
    padding: 12px;
  }

  :global([data-theme="clean"] .message-row ){
    grid-template-columns: 36px minmax(0, 1fr);
  }

  :global([data-theme="clean"] .message-row.user ){
    grid-template-columns: minmax(0, 1fr) 36px;
    justify-content: stretch;
  }

  :global([data-theme="clean"] .composer ){
    grid-template-columns: 1fr;
  }
}
</style>

