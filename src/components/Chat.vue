<template>
  <section class="chat-shell">
    <div class="decor decor-one" aria-hidden="true">&lt;/&gt;</div>
    <div class="decor decor-two" aria-hidden="true">O(n log n)</div>
    <div class="decor decor-three" aria-hidden="true">{ }</div>
    <div class="decor decor-four" aria-hidden="true">递归</div>
    <div class="decor decor-five" aria-hidden="true">SELECT *</div>
    <div class="decor decor-six" aria-hidden="true">Integral f(x)dx</div>

    <!-- 移动端侧边栏遮罩 -->
    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false"></div>

    <aside class="history-panel" :class="{ open: sidebarOpen }">
      <div class="brand-block">
        <div class="brand-mark" :class="{ 'has-image': aiAvatarUrl }">
          <img
            v-if="aiAvatarUrl"
            class="avatar-img"
            :src="aiAvatarUrl"
            :alt="aiAvatarAlt"
            referrerpolicy="no-referrer"
            @error="onAiAvatarError"
          />
          <Icon v-else icon="chat" :size="28" />
        </div>
        <div>
          <h1>小茉</h1>
          <p>你的 AI 学习伙伴</p>
        </div>
      </div>

      <button class="new-chat" type="button" @click="onNewChat">
        <Icon icon="plus" :size="20" />
        <span>新对话</span>
      </button>

      <div class="workspace-switch">
        <button
          type="button"
          :class="{ active: activeView === 'chat' }"
          @click="openChatWorkspace"
        >
          <Icon icon="chat" :size="17" />
          <span>AI 对话</span>
        </button>
        <button
          type="button"
          :class="{ active: activeView === 'image' }"
          @click="openImageStudio"
        >
          <Icon icon="palette" :size="17" />
          <span>AI 绘画</span>
        </button>
        <button
          type="button"
          :class="{ active: activeView === 'video' }"
          @click="openVideoStudio"
        >
          <Icon icon="video" :size="17" />
          <span>AI 视频</span>
        </button>
      </div>

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
            @click.stop="confirmDelete(conversation.id)"
          >
            <Icon icon="close" :size="16" />
          </button>
        </div>

        <div v-if="!historyLoading && conversations.length === 0" class="history-empty">
          还没有聊天记录
        </div>
      </div>

      <div class="sidebar-bottom">
        <button class="profile-trigger" type="button" @click="openProfile">
          <span class="profile-avatar" :class="{ 'has-image': userAvatarUrl }">
            <img
              v-if="userAvatarUrl"
              class="avatar-img"
              :src="userAvatarUrl"
              :alt="userAvatarAlt"
              referrerpolicy="no-referrer"
              @error="onUserAvatarError"
            />
            <Icon v-else icon="user" :size="20" />
          </span>
          <span class="profile-name">{{ userDisplayName }}</span>
          <Icon icon="chevron-right" :size="14" class="profile-arrow" />
        </button>
        <button class="logout" type="button" @click="confirmLogout">
          <Icon icon="logout" :size="18" />
          <span>退出登录</span>
        </button>
      </div>

      <!-- 个人信息弹窗 -->
      <Teleport to="body">
        <div v-if="profileOpen" class="profile-overlay" @click.self="closeProfile">
          <div class="profile-modal">
            <div class="profile-modal-header">
              <h3>个人信息</h3>
              <button class="profile-close" type="button" @click="closeProfile">
                <Icon icon="close" :size="18" />
              </button>
            </div>

            <div class="profile-modal-body">
              <div class="profile-avatar-section">
                <div class="profile-avatar-lg" :class="{ 'has-image': userAvatarUrl }">
                  <img
                    v-if="userAvatarUrl"
                    class="avatar-img"
                    :src="userAvatarUrl"
                    :alt="userAvatarAlt"
                    referrerpolicy="no-referrer"
                    @error="onUserAvatarError"
                  />
                  <Icon v-else icon="user" :size="32" />
                </div>
              </div>

              <form @submit.prevent="saveProfile">
                <label class="profile-field">
                  <span>昵称</span>
                  <input
                    v-model="profileForm.nickname"
                    type="text"
                    maxlength="50"
                    placeholder="设置昵称"
                    :disabled="profileSaving"
                  />
                </label>

                <label class="profile-field">
                  <span>QQ 号（用于头像）</span>
                  <input
                    v-model="profileForm.userQq"
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    placeholder="输入 QQ 号"
                    :disabled="profileSaving"
                  />
                </label>

                <div class="profile-section-label">AI 头像 QQ</div>
                <label class="profile-field">
                  <input
                      v-model="profileForm.aiQq"
                      type="text"
                      inputmode="numeric"
                      autocomplete="off"
                      placeholder="设置 AI 头像的 QQ 号"
                      :disabled="profileSaving"
                  />
                </label>

                <div class="profile-section-label">主题风格</div>
                <div class="profile-theme-grid">
                  <button
                    v-for="theme in themeOptions"
                    :key="theme.name"
                    class="profile-theme-btn"
                    type="button"
                    :class="{ active: currentTheme === theme.name }"
                    @click="onSelectTheme(theme.name)"
                  >
                    <span>{{ theme.label }}</span>
                    <small>{{ theme.description }}</small>
                  </button>
                </div>

                <button class="profile-save" type="submit" :disabled="profileSaving">
                  {{ profileSaving ? '保存中...' : '保存修改' }}
                </button>
                <p v-if="profileStatus" class="profile-status">{{ profileStatus }}</p>
              </form>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- 确认弹窗 -->
      <Teleport to="body">
        <div v-if="confirmDialog.open" class="confirm-overlay" @click.self="cancelConfirm">
          <div class="confirm-modal">
            <p class="confirm-msg">{{ confirmDialog.message }}</p>
            <div class="confirm-actions">
              <button class="confirm-cancel" type="button" @click="cancelConfirm">取消</button>
              <button class="confirm-ok" type="button" @click="doConfirm">确定</button>
            </div>
          </div>
        </div>
      </Teleport>
    </aside>

    <main class="chat-main">
      <header class="chat-topbar">
        <button class="sidebar-toggle" type="button" @click="sidebarOpen = !sidebarOpen">
          <Icon icon="menu" :size="22" />
        </button>
        <div class="topbar-info">
          <p class="eyebrow">AI STUDY BUDDY</p>
          <h2>{{ workspaceTitle }}</h2>
        </div>
        <div class="status-pill" :class="{ live: activeView === 'chat' && loading }">
          <span class="status-dot" :class="{ pulsing: activeView === 'chat' && loading }"></span>
          {{ workspaceStatus }}
        </div>
      </header>

      <ImageGen v-if="activeView === 'image'" class="image-workspace-slot" />
      <VideoGen v-else-if="activeView === 'video'" class="image-workspace-slot" />

      <div v-else ref="scrollContainer" class="message-stage">
        <section v-if="messagesLoading" class="empty-state compact">
          <div class="typing-indicator" role="status" aria-live="polite" aria-label="正在加载对话">
            <span class="thinking-copy">加载中</span>
            <span class="thinking-dots" aria-hidden="true"><span></span><span></span><span></span></span>
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
          <div class="avatar" :class="{ 'has-image': message.role === 'user' ? !!userAvatarUrl : !!aiAvatarUrl }">
            <img
              v-if="message.role === 'user' && userAvatarUrl"
              class="avatar-img"
              :src="userAvatarUrl"
              :alt="userAvatarAlt"
              referrerpolicy="no-referrer"
              @error="onUserAvatarError"
            />
            <img
              v-else-if="message.role === 'assistant' && aiAvatarUrl"
              class="avatar-img"
              :src="aiAvatarUrl"
              :alt="aiAvatarAlt"
              referrerpolicy="no-referrer"
              @error="onAiAvatarError"
            />
            <Icon v-else :icon="message.role === 'user' ? 'user' : 'chat'" :size="22" />
          </div>
          <article class="message-bubble">
            <div v-if="message.role === 'assistant' && message.content" class="md-content" v-html="renderMarkdown(message.content)"></div>
            <div v-else-if="message.role === 'assistant' && !message.content" class="typing-indicator" role="status" aria-live="polite" aria-label="AI 正在思考">
              <span class="thinking-copy">思考中</span>
              <span class="thinking-dots" aria-hidden="true"><span></span><span></span><span></span></span>
            </div>
            <p v-if="message.role === 'user'">{{ message.content || '...' }}</p>
          </article>
        </div>
      </div>

      <form v-if="activeView === 'chat'" class="composer" @submit.prevent="onSend">
        <div class="composer-inner">
          <button
            class="image-gen-btn"
            type="button"
            title="AI 绘画"
            @click="openImageStudio"
          >
            <Icon icon="palette" :size="18" />
          </button>
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
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { marked } from 'marked';
import Icon from './Icon.vue';
import ImageGen from './ImageGen.vue';
import VideoGen from './VideoGen.vue';
import { API_CONFIG, getApiUrl, getToken, getUser, setUser } from '../config/api';
import { getTheme, setTheme, THEME_OPTIONS } from '../config/theme';
import type { UserInfo } from '../config/api';
import type { ThemeName } from '../config/theme';

type Role = 'user' | 'assistant';
type WorkspaceView = 'chat' | 'image' | 'video';

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

interface AvatarSettings {
  userQq?: string | null;
  userAvatarUrl?: string | null;
  userResolvedAvatarUrl?: string | null;
  aiQq?: string | null;
  aiAvatarUrl?: string | null;
  nickname?: string | null;
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
const userAvatarFailed = ref(false);
const aiAvatarFailed = ref(false);
const avatarSettings = ref<AvatarSettings | null>(null);
const avatarForm = reactive({ userQq: '', aiQq: '' });
const avatarSaving = ref(false);
const avatarStatus = ref('');
const profileOpen = ref(false);
const ACTIVE_VIEW_KEY = 'ai_study_buddy_active_view';
const savedView = localStorage.getItem(ACTIVE_VIEW_KEY) as WorkspaceView | null;
const activeView = ref<WorkspaceView>(
  savedView === 'image' || savedView === 'video' || savedView === 'chat' ? savedView : 'chat'
);

watch(activeView, (newView) => {
  localStorage.setItem(ACTIVE_VIEW_KEY, newView);
});
const profileForm = reactive({ nickname: '', userQq: '', aiQq: '' });
const profileSaving = ref(false);
const profileStatus = ref('');
const confirmDialog = reactive({
  open: false,
  message: '',
  action: null as (() => void) | null,
});
const currentTheme = ref<ThemeName>(getTheme());
const themeOptions = THEME_OPTIONS;

const starterPrompts = [
  '帮我找一份 AI Agent 学习路线',
  '解释一下快速排序算法',
  '推荐一些面试技巧',
];

const activeConversation = computed(() =>
  conversations.value.find(item => item.id === activeConversationId.value) || null
);
const workspaceTitle = computed(() => {
  if (activeView.value === 'image') return 'AI 绘画工作台';
  if (activeView.value === 'video') return 'AI 视频工作台';
  return activeConversation.value?.title || '新对话';
});
const workspaceStatus = computed(() => {
  if (activeView.value === 'image' || activeView.value === 'video') return '创作模式';
  return loading.value ? '思考中' : '就绪';
});
const canSend = computed(() => inputText.value.trim().length > 0 && !loading.value);
const userDisplayName = computed(() =>
  userInfo.value?.nickname || userInfo.value?.username || '未登录'
);
const userAvatarAlt = computed(() => `${userDisplayName.value} 的头像`);
const userAvatarUrl = computed(() => {
  if (userAvatarFailed.value) return '';

  const resolvedAvatar = normalizeAvatarUrl(userInfo.value?.resolvedAvatarUrl);
  if (resolvedAvatar) return resolvedAvatar;

  const storedAvatar = normalizeAvatarUrl(userInfo.value?.avatarUrl);
  if (storedAvatar) return storedAvatar;

  const qqNumber = findQqNumber(userInfo.value);
  if (!qqNumber) return '';

  return buildQqAvatarUrl(qqNumber);
});
const aiAvatarAlt = computed(() => 'AI 的头像');
const aiAvatarUrl = computed(() => {
  if (aiAvatarFailed.value) return '';

  const storedAvatar = normalizeAvatarUrl(avatarSettings.value?.aiAvatarUrl);
  if (storedAvatar) return storedAvatar;

  const qqNumber = normalizeQqNumber(avatarSettings.value?.aiQq);
  return qqNumber ? buildQqAvatarUrl(qqNumber) : '';
});

function renderMarkdown(content: string): string {
  if (!content) return '';
  return marked.parse(content) as string;
}

function normalizeAvatarUrl(value?: string | null): string {
  const avatarUrl = value?.trim();
  if (!avatarUrl || !/^https?:\/\//i.test(avatarUrl)) return '';
  return avatarUrl;
}

function normalizeQqNumber(value?: string | null): string {
  const qqNumber = value?.trim() || '';
  return isValidQqNumber(qqNumber) ? qqNumber : '';
}

function buildQqAvatarUrl(qqNumber: string): string {
  return `http://q.qlogo.cn/headimg_dl?dst_uin=${encodeURIComponent(qqNumber)}&spec=640&img_type=jpg`;
}

function findQqNumber(user: UserInfo | null): string {
  const candidates = [
    user?.qq,
    user?.username,
    user?.nickname,
  ];
  return candidates
    .map(value => value?.trim() || '')
    .find(isValidQqNumber) || '';
}

function isValidQqNumber(value: string): boolean {
  return /^[1-9]\d{4,11}$/.test(value);
}

function onUserAvatarError() {
  userAvatarFailed.value = true;
}

function onAiAvatarError() {
  aiAvatarFailed.value = true;
}

function onSelectTheme(theme: ThemeName) {
  currentTheme.value = theme;
  setTheme(theme);
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

function onEscKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  if (confirmDialog.open) cancelConfirm();
  else if (profileOpen.value) closeProfile();
  else if (sidebarOpen.value) sidebarOpen.value = false;
}

onMounted(async () => {
  await loadAvatarSettings();
  await loadConversations();
  if (activeView.value === 'chat' && conversations.value.length > 0) {
    await selectConversation(conversations.value[0].id);
  }
  scrollContainer.value?.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('keydown', onEscKey);
  window.addEventListener('resize', onWindowResize);
});

onUnmounted(() => {
  closeStream();
  scrollContainer.value?.removeEventListener('scroll', onScroll);
  document.removeEventListener('keydown', onEscKey);
  window.removeEventListener('resize', onWindowResize);
  document.body.style.overflow = '';
});

watch(messages, async () => {
  await nextTick();
  if (userNearBottom.value) scrollToBottom();
}, { deep: true });

watch(messages, async () => {
  await nextTick();
  if (!loading.value) injectCopyButtons();
});

/* ---- Body scroll lock when sidebar open on mobile ---- */
watch(sidebarOpen, (open) => {
  if (open) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

/* ---- Close sidebar on resize to desktop ---- */
function onWindowResize() {
  if (window.innerWidth > 900 && sidebarOpen.value) {
    sidebarOpen.value = false;
  }
}

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

/* ---- Avatar settings ---- */
async function loadAvatarSettings() {
  try {
    const settings = await requestJson<AvatarSettings>(
      getApiUrl(API_CONFIG.ENDPOINTS.AVATAR_SETTINGS)
    );
    applyAvatarSettings(settings);
  } catch {
    avatarStatus.value = '';
  }
}

async function saveAvatarSettings() {
  if (avatarSaving.value) return;
  avatarSaving.value = true;
  avatarStatus.value = '';
  try {
    const settings = await requestJson<AvatarSettings>(
      getApiUrl(API_CONFIG.ENDPOINTS.AVATAR_SETTINGS),
      {
        method: 'PUT',
        body: JSON.stringify({
          userQq: avatarForm.userQq.trim(),
          aiQq: avatarForm.aiQq.trim(),
        }),
      }
    );
    applyAvatarSettings(settings);
    avatarStatus.value = '头像已更新';
  } catch {
    avatarStatus.value = '保存失败，请检查 QQ 号码';
  } finally {
    avatarSaving.value = false;
  }
}

function applyAvatarSettings(settings: AvatarSettings) {
  avatarSettings.value = settings;
  avatarForm.userQq = settings.userQq || '';
  avatarForm.aiQq = settings.aiQq || '';
  userAvatarFailed.value = false;
  aiAvatarFailed.value = false;

  if (!userInfo.value) return;
  userInfo.value = {
    ...userInfo.value,
    nickname: settings.nickname || userInfo.value.nickname,
    qq: settings.userQq || undefined,
    avatarUrl: settings.userAvatarUrl || undefined,
    resolvedAvatarUrl: settings.userResolvedAvatarUrl || undefined,
  };
  setUser(userInfo.value);
}

/* ---- Profile modal ---- */
function openProfile() {
  profileForm.nickname = userInfo.value?.nickname || '';
  profileForm.userQq = avatarSettings.value?.userQq || '';
  profileForm.aiQq = avatarSettings.value?.aiQq || '';
  profileStatus.value = '';
  profileOpen.value = true;
}

function openImageStudio() {
  activeView.value = 'image';
  sidebarOpen.value = false;
}

function openVideoStudio() {
  activeView.value = 'video';
  sidebarOpen.value = false;
}

function openChatWorkspace() {
  activeView.value = 'chat';
  sidebarOpen.value = false;
}

function closeProfile() {
  profileOpen.value = false;
  profileStatus.value = '';
}

async function saveProfile() {
  if (profileSaving.value) return;
  profileSaving.value = true;
  profileStatus.value = '';
  try {
    const settings = await requestJson<AvatarSettings>(
      getApiUrl(API_CONFIG.ENDPOINTS.AVATAR_SETTINGS),
      {
        method: 'PUT',
        body: JSON.stringify({
          nickname: profileForm.nickname.trim(),
          userQq: profileForm.userQq.trim(),
          aiQq: profileForm.aiQq.trim(),
        }),
      }
    );
    applyAvatarSettings(settings);
    profileStatus.value = '保存成功';
  } catch {
    profileStatus.value = '保存失败，请检查输入';
  } finally {
    profileSaving.value = false;
  }
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
  activeView.value = 'chat';
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
  activeView.value = 'chat';
  activeConversationId.value = null;
  messages.value = [];
  inputText.value = '';
  sidebarOpen.value = false;
  resetTextarea();
}

function showConfirm(message: string, action: () => void) {
  confirmDialog.message = message;
  confirmDialog.action = action;
  confirmDialog.open = true;
}

function doConfirm() {
  const action = confirmDialog.action;
  confirmDialog.open = false;
  confirmDialog.action = null;
  action?.();
}

function cancelConfirm() {
  confirmDialog.open = false;
  confirmDialog.action = null;
}

function confirmDelete(conversationId: number) {
  showConfirm('确定要删除这条对话吗？删除后无法恢复。', () => deleteConversation(conversationId));
}

function confirmLogout() {
  showConfirm('确定要退出登录吗？', () => emit('logout'));
}

const deletingIds = new Set<number>();

async function deleteConversation(conversationId: number) {
  if (deletingIds.has(conversationId)) return;
  deletingIds.add(conversationId);
  try {
    await requestJson<void>(
      getApiUrl(`${API_CONFIG.ENDPOINTS.CONVERSATIONS}/${conversationId}`),
      { method: 'DELETE' }
    );
    conversations.value = conversations.value.filter(item => item.id !== conversationId);
    if (activeConversationId.value === conversationId) onNewChat();
  } finally {
    deletingIds.delete(conversationId);
  }
}

function usePrompt(prompt: string) {
  inputText.value = prompt;
  autoResize();
}

/* ---- Send / Stream ---- */
const SEND_DEBOUNCE_MS = 800;
let lastSendTime = 0;

async function onSend() {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  // 防抖：短时间内禁止重复发送
  const now = Date.now();
  if (now - lastSendTime < SEND_DEBOUNCE_MS) return;
  lastSendTime = now;

  userNearBottom.value = true;
  loading.value = true;

  // 立即显示用户消息 + 打字动画，给用户即时反馈
  messages.value.push({ role: 'user', content: text });
  messages.value.push({ role: 'assistant', content: '' });
  inputText.value = '';
  resetTextarea();

  await nextTick();
  scrollToBottom();

  // 然后再做异步操作（创建对话等）
  const conversation = await ensureConversation(text);
  if (!conversation) {
    // 创建对话失败，回滚刚才添加的消息
    messages.value.pop();
    messages.value.pop();
    inputText.value = text;
    loading.value = false;
    autoResize();
    return;
  }

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
        ? 'AI 服务不可用，请检查 API Key'
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
        setAssistantMessage(messageIndex, content + '\n\n---\n*已停止生成，你可以继续提问或让我完善上面的内容。');
      } else {
        setAssistantMessage(messageIndex, '已停止生成。你可以继续提问，或点击发送让我重新回答。');
      }
    } else if (err.name !== 'AbortError') {
      setAssistantMessage(messageIndex, '网络开小差了，再试一次。');
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
  } else if (eventName === 'progress') {
    // 工具进度提示
    if (messageIndex >= 0 && messageIndex < messages.value.length) {
      const msg = messages.value[messageIndex];
      const progressHint = `\n\n> ${data}`;
      // 如果之前已有进度提示，替换掉；否则追加
      const existingHint = msg.content.match(/\n\n> .+/);
      if (existingHint) {
        msg.content = msg.content.replace(existingHint[0], progressHint);
      } else {
        msg.content += progressHint;
      }
      scrollToBottom();
    }
  } else if (messageIndex >= 0 && messageIndex < messages.value.length) {
    // 正文数据到来时，清除之前的进度提示
    const msg = messages.value[messageIndex];
    if (msg.content.includes('> ')) {
      msg.content = msg.content.replace(/\n\n> .+/, '');
    }
    msg.content += data;
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
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (isToday) return time;
  if (isYesterday) return `昨天 ${time}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
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

.brand-mark.has-image,
.avatar.has-image {
  overflow: hidden;
  padding: 0;
  color: transparent;
  background: var(--panel-strong);
}

.avatar-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
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

.workspace-switch {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  padding: 6px;
  border: 2px solid rgba(0, 245, 212, 0.22);
  border-radius: 14px;
  background: rgba(13, 13, 26, 0.42);
}

.workspace-switch button {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 10px;
  border: 2px solid transparent;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.72);
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  text-align: left;
}

.workspace-switch button.active,
.workspace-switch button:hover {
  border-color: rgba(0, 245, 212, 0.42);
  color: var(--fg);
  background: rgba(0, 245, 212, 0.12);
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

/* ---- Sidebar bottom: profile card ---- */
.sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 6px;
  border-top: 2px dashed var(--yellow);
  margin-top: 4px;
}

.profile-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 6px 10px;
  border: 2px solid rgba(0, 245, 212, 0.5);
  border-radius: 12px;
  color: var(--fg);
  background: rgba(45, 27, 78, 0.6);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.profile-trigger:hover {
  background: rgba(45, 27, 78, 0.85);
  border-color: var(--cyan);
}

.profile-avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid var(--cyan);
  background: linear-gradient(135deg, var(--cyan), var(--magenta));
  color: var(--bg);
  flex-shrink: 0;
  overflow: hidden;
}

.profile-avatar.has-image {
  border-color: var(--yellow);
  background: transparent;
}

.profile-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.profile-name {
  flex: 1;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-arrow {
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

/* ---- Profile modal ---- */
.profile-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  animation: fade-overlay 0.2s ease;
}

@keyframes fade-overlay {
  from { opacity: 0; }
  to { opacity: 1; }
}

.profile-modal {
  width: min(400px, 90vw);
  max-height: 85vh;
  overflow-y: auto;
  border: 3px solid var(--magenta);
  border-radius: 20px;
  background: var(--panel);
  box-shadow: 8px 8px 0 var(--cyan), 16px 16px 0 var(--yellow);
  animation: panel-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.profile-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 2px dashed var(--yellow);
}

.profile-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  color: var(--fg);
  text-shadow: 1px 1px 0 var(--purple);
}

.profile-close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  background: transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.profile-close:hover {
  color: var(--fg);
  border-color: var(--magenta);
}

.profile-modal-body {
  padding: 16px 18px 20px;
}

.profile-avatar-section {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
}

.profile-avatar-lg {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 3px solid var(--cyan);
  background: linear-gradient(135deg, var(--cyan), var(--magenta));
  color: var(--bg);
  overflow: hidden;
  box-shadow: 4px 4px 0 var(--purple);
}

.profile-avatar-lg.has-image {
  border-color: var(--yellow);
  background: transparent;
}

.profile-avatar-lg .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.profile-field {
  display: grid;
  gap: 5px;
  margin-bottom: 12px;
}

.profile-field span {
  color: rgba(255, 255, 255, 0.66);
  font-size: 12px;
  font-weight: 700;
}

.profile-field input {
  width: 100%;
  height: 40px;
  border: 2px solid rgba(0, 245, 212, 0.4);
  border-radius: 10px;
  outline: none;
  padding: 0 12px;
  color: var(--fg);
  background: rgba(45, 27, 78, 0.6);
  font-size: 14px;
  font-weight: 500;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.profile-field input:focus {
  border-color: var(--cyan);
  box-shadow: 0 0 0 3px rgba(0, 245, 212, 0.15);
}

.profile-field input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.profile-section-label {
  color: rgba(255, 255, 255, 0.66);
  font-size: 12px;
  font-weight: 700;
  margin: 16px 0 8px;
}

.profile-theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.profile-theme-btn {
  display: grid;
  gap: 2px;
  padding: 10px 6px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: var(--fg);
  background: rgba(45, 27, 78, 0.5);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
}

.profile-theme-btn span {
  font-size: 14px;
  font-weight: 800;
}

.profile-theme-btn small {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-theme-btn:hover {
  border-color: var(--cyan);
  background: rgba(45, 27, 78, 0.75);
  transform: translateY(-1px);
}

.profile-theme-btn.active {
  border-color: var(--yellow);
  background: var(--yellow);
  color: var(--bg);
}

.profile-theme-btn.active small {
  color: rgba(13, 13, 26, 0.65);
}

.profile-save {
  width: 100%;
  min-height: 42px;
  margin-top: 18px;
  border: 0;
  border-radius: 10px;
  color: var(--bg);
  background: linear-gradient(90deg, var(--magenta), var(--cyan));
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
  transition: opacity 0.2s;
}

.profile-save:hover {
  opacity: 0.9;
}

.profile-save:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.profile-status {
  margin: 8px 0 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
  font-weight: 600;
}

/* ---- Confirm dialog ---- */
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  animation: fade-overlay 0.15s ease;
}

.confirm-modal {
  width: min(340px, 88vw);
  padding: 24px 22px 18px;
  border: 3px solid var(--magenta);
  border-radius: 16px;
  background: var(--panel);
  box-shadow: 6px 6px 0 var(--cyan), 12px 12px 0 var(--yellow);
  animation: panel-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.confirm-msg {
  margin: 0 0 20px;
  color: var(--fg);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.6;
  text-align: center;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.confirm-cancel,
.confirm-ok {
  flex: 1;
  min-height: 38px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: opacity 0.15s;
}

.confirm-cancel {
  color: var(--fg);
  background: rgba(255, 255, 255, 0.08);
}

.confirm-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
}

.confirm-ok {
  color: var(--bg);
  background: var(--orange);
  border-color: var(--orange);
}

.confirm-ok:hover {
  opacity: 0.88;
}

/* ---- Main area ---- */
.chat-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100dvh;
  padding: 12px 18px;
  overflow: hidden;
}

.image-workspace-slot {
  height: 100%;
  min-height: 0;
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
  padding: 5px 12px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.06);
  font-weight: 700;
  font-size: 12px;
  box-shadow: none;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
}

.status-dot.pulsing {
  animation: dot-pulse 1s cubic-bezier(0.37, 0, 0.63, 1) infinite;
  background: var(--cyan);
  box-shadow: 0 0 8px rgba(0, 245, 212, 0.6);
}

.status-pill.live {
  background: rgba(0, 245, 212, 0.08);
  border-color: rgba(0, 245, 212, 0.2);
  color: var(--cyan);
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
  position: relative;
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 38px;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid rgba(0, 245, 212, 0.48);
  border-radius: 999px;
  background:
    linear-gradient(135deg, rgba(0, 245, 212, 0.16), rgba(255, 58, 242, 0.12)),
    rgba(13, 13, 26, 0.7);
  box-shadow: 0 0 22px rgba(0, 245, 212, 0.2);
}

.thinking-copy {
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  letter-spacing: 0;
}

.thinking-dots {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 14px;
}

.thinking-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cyan);
  transform-origin: center bottom;
  animation: thinking-dot-bounce 0.9s cubic-bezier(0.37, 0, 0.63, 1) infinite;
  box-shadow: 0 0 10px rgba(0, 245, 212, 0.72);
}

.thinking-dots span:nth-child(2) { animation-delay: 0.14s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.28s; }

@keyframes thinking-dot-bounce {
  0%, 80%, 100% {
    opacity: 0.42;
    transform: translateY(0) scale(0.82);
  }
  40% {
    opacity: 1;
    transform: translateY(-7px) scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .thinking-dots span {
    animation-name: thinking-dot-breathe !important;
    animation-duration: 1.4s !important;
    animation-iteration-count: infinite !important;
    transform: none !important;
  }
}

@keyframes thinking-dot-breathe {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}

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

.image-gen-btn {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 3px solid var(--cyan);
  border-radius: 50%;
  color: var(--cyan);
  background: rgba(0, 245, 212, 0.08);
  cursor: pointer;
  transition: transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
  margin-right: 4px;
}

.image-gen-btn:hover {
  transform: scale(1.1);
  background: rgba(0, 245, 212, 0.18);
  box-shadow: 0 0 16px rgba(0, 245, 212, 0.35);
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
:global([data-theme="cyberpunk"] .logout),
:global([data-theme="cyberpunk"] .workspace-switch) {
  border-width: 2px; border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
  animation: none; background: transparent;
  text-transform: uppercase; letter-spacing: 0.1em;
}

:global([data-theme="cyberpunk"] .workspace-switch button) {
  border-radius: 4px;
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

:global([data-theme="cyberpunk"] .sidebar-bottom) {
  border-top: 1px solid rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .profile-trigger) {
  border: 1px solid rgba(0, 255, 136, 0.4); border-radius: 4px;
  background: rgba(18, 18, 26, 0.58);
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.15);
}

:global([data-theme="cyberpunk"] .profile-trigger:hover) {
  border-color: rgba(0, 255, 136, 0.7);
  background: rgba(18, 18, 26, 0.8);
}

:global([data-theme="cyberpunk"] .profile-avatar) {
  border: 1px solid rgba(0, 255, 136, 0.6); border-radius: 4px;
  box-shadow: 0 0 6px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .profile-modal) {
  border: 1px solid rgba(0, 255, 136, 0.5); border-radius: 4px;
  background: rgba(10, 10, 15, 0.98);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.25);
}

:global([data-theme="cyberpunk"] .profile-modal-header) {
  border-bottom: 1px solid rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .profile-modal-header h3) {
  text-shadow: -2px 0 #ff00ff, 2px 0 #00d4ff;
}

:global([data-theme="cyberpunk"] .profile-close) {
  border-color: rgba(0, 255, 136, 0.4); border-radius: 4px;
}

:global([data-theme="cyberpunk"] .profile-field input) {
  border: 1px solid rgba(0, 212, 255, 0.5); border-radius: 4px;
  background: transparent;
}

:global([data-theme="cyberpunk"] .profile-field input:focus) {
  border-color: rgba(0, 255, 136, 0.7);
  box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.15);
}

:global([data-theme="cyberpunk"] .profile-theme-btn) {
  border: 1px solid rgba(0, 212, 255, 0.4); border-radius: 4px;
  background: transparent; text-transform: uppercase;
}

:global([data-theme="cyberpunk"] .profile-theme-btn.active) {
  border-color: var(--yellow); background: var(--yellow);
  color: var(--bg);
}

:global([data-theme="cyberpunk"] .profile-save) {
  border-radius: 4px;
  background: var(--yellow);
  color: var(--bg);
}

:global([data-theme="cyberpunk"] .profile-avatar-lg) {
  border: 2px solid rgba(0, 255, 136, 0.6); border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

:global([data-theme="cyberpunk"] .confirm-modal) {
  border: 1px solid rgba(0, 255, 136, 0.5); border-radius: 4px;
  background: rgba(10, 10, 15, 0.98);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.25);
}

:global([data-theme="cyberpunk"] .confirm-cancel) {
  border: 1px solid rgba(0, 255, 136, 0.4); border-radius: 4px;
  background: transparent;
}

:global([data-theme="cyberpunk"] .confirm-ok) {
  border-radius: 4px; background: var(--yellow); color: var(--bg);
}

:global([data-theme="cyberpunk"] .brand-block),
:global([data-theme="cyberpunk"] .chat-topbar),
:global([data-theme="cyberpunk"] .message-bubble),
:global([data-theme="cyberpunk"] .composer),
:global([data-theme="cyberpunk"] .empty-state),
:global([data-theme="cyberpunk"] .history-main),
:global([data-theme="cyberpunk"] .history-delete),
:global([data-theme="cyberpunk"] .new-chat),
:global([data-theme="cyberpunk"] .workspace-switch),
:global([data-theme="cyberpunk"] .logout),
:global([data-theme="cyberpunk"] .prompt-grid button),
:global([data-theme="cyberpunk"] .composer-inner textarea),
:global([data-theme="cyberpunk"] .send),
:global([data-theme="cyberpunk"] .stop-btn),
:global([data-theme="cyberpunk"] .profile-trigger),
:global([data-theme="cyberpunk"] .profile-modal) {
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

:global([data-theme="clean"] .workspace-switch) {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

:global([data-theme="clean"] .workspace-switch button) {
  border: 0;
  border-radius: 8px;
  color: #4b5563;
  background: transparent;
  font-weight: 500;
}

:global([data-theme="clean"] .workspace-switch button.active),
:global([data-theme="clean"] .workspace-switch button:hover) {
  color: #202123;
  background: #ececf1;
}

:global([data-theme="clean"] .sidebar-bottom) {
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
  margin-top: 6px;
}

:global([data-theme="clean"] .profile-trigger) {
  border: 1px solid #e5e7eb; border-radius: 10px;
  background: #fff; box-shadow: none;
}

:global([data-theme="clean"] .profile-trigger:hover) {
  border-color: #d1d5db; background: #f9fafb;
}

:global([data-theme="clean"] .profile-avatar) {
  border: 0; background: #10a37f;
  color: #fff;
}

:global([data-theme="clean"] .profile-name) {
  color: #202123; font-weight: 500;
}

:global([data-theme="clean"] .profile-arrow) {
  color: #9ca3af;
}

:global([data-theme="clean"] .profile-modal) {
  border: 1px solid #e5e7eb; border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}

:global([data-theme="clean"] .profile-modal-header) {
  border-bottom: 1px solid #e5e7eb;
}

:global([data-theme="clean"] .profile-modal-header h3) {
  color: #202123; font-weight: 600; text-shadow: none;
}

:global([data-theme="clean"] .profile-close) {
  border-color: #e5e7eb; color: #6b7280; border-radius: 6px;
}

:global([data-theme="clean"] .profile-close:hover) {
  color: #202123; border-color: #d1d5db;
}

:global([data-theme="clean"] .profile-avatar-lg) {
  border: 0; background: #10a37f;
  color: #fff; box-shadow: none;
}

:global([data-theme="clean"] .profile-field span) {
  color: #6b7280; font-weight: 500;
}

:global([data-theme="clean"] .profile-field input) {
  border: 1px solid #d1d5db; border-radius: 8px;
  color: #202123; background: #fff; font-weight: 400;
}

:global([data-theme="clean"] .profile-field input:focus) {
  border-color: #10a37f;
  box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.12);
}

:global([data-theme="clean"] .profile-field input::placeholder) {
  color: #9ca3af;
}

:global([data-theme="clean"] .profile-section-label) {
  color: #6b7280; font-weight: 500;
}

:global([data-theme="clean"] .profile-theme-btn) {
  border: 1px solid #e5e7eb; border-radius: 8px;
  color: #202123; background: #fff;
}

:global([data-theme="clean"] .profile-theme-btn span) {
  font-weight: 500;
}

:global([data-theme="clean"] .profile-theme-btn small) {
  color: #6b7280;
}

:global([data-theme="clean"] .profile-theme-btn:hover) {
  border-color: #d1d5db; background: #f9fafb;
}

:global([data-theme="clean"] .profile-theme-btn.active) {
  border-color: #10a37f; background: #10a37f;
  color: #fff;
}

:global([data-theme="clean"] .profile-theme-btn.active small) {
  color: rgba(255,255,255,0.8);
}

:global([data-theme="clean"] .profile-save) {
  background: #10a37f; border-radius: 8px;
  font-weight: 500; color: #fff;
}

:global([data-theme="clean"] .profile-status) {
  color: #6b7280; font-weight: 400;
}

:global([data-theme="clean"] .confirm-modal) {
  border: 1px solid #e5e7eb; border-radius: 14px;
  background: #fff; box-shadow: 0 16px 48px rgba(0,0,0,0.15);
}

:global([data-theme="clean"] .confirm-msg) {
  color: #202123; font-weight: 500;
}

:global([data-theme="clean"] .confirm-cancel) {
  border: 1px solid #d1d5db; color: #4b5563; background: #fff;
}

:global([data-theme="clean"] .confirm-cancel:hover) {
  background: #f3f4f6;
}

:global([data-theme="clean"] .confirm-ok) {
  border: 0; border-radius: 8px;
  background: #ef4444; color: #fff; font-weight: 500;
}

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
  border: 1px solid #e5e7eb; border-radius: 999px;
  color: #6b7280; background: #f9fafb; box-shadow: none;
  font-size: 12px; font-weight: 500; padding: 4px 10px;
}

:global([data-theme="clean"] .status-dot) {
  background: #22c55e;
  box-shadow: 0 0 4px rgba(34, 197, 94, 0.4);
}

:global([data-theme="clean"] .status-pill.live) {
  color: #0d9488; background: #f0fdfa; border-color: #99f6e4;
}

:global([data-theme="clean"] .status-pill.live .status-dot) {
  background: #10a37f;
  box-shadow: 0 0 6px rgba(16, 163, 127, 0.4);
}

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

:global([data-theme="clean"] .image-gen-btn) {
  border-color: #10a37f; color: #10a37f;
  background: rgba(16, 163, 127, 0.08);
  box-shadow: none;
}

:global([data-theme="clean"] .image-gen-btn:hover) {
  transform: none; background: rgba(16, 163, 127, 0.16);
  box-shadow: none;
}

:global([data-theme="clean"] .typing-indicator) {
  border-color: #d1fae5;
  background: #ecfdf5;
  box-shadow: none;
}

:global([data-theme="clean"] .thinking-copy) { color: #047857; }

:global([data-theme="clean"] .thinking-dots span) {
  background: #10a37f;
  box-shadow: 0 0 8px rgba(16, 163, 127, 0.28);
}

/* ====== Responsive ====== */

/* ---- Sidebar backdrop (mobile only) ---- */
.sidebar-backdrop {
  display: none;
}

@media (max-width: 900px) {
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 19;
    background: rgba(0, 0, 0, 0.5);
    animation: fade-overlay 0.25s ease;
  }

  .chat-shell { grid-template-columns: 1fr; }

  .history-panel {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(82vw, 320px);
    transform: translateX(-105%);
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 20;
    box-shadow: none;
  }

  .history-panel.open {
    transform: translateX(0);
    box-shadow: 8px 0 0 rgba(255, 58, 242, 0.5), 16px 0 0 rgba(0, 245, 212, 0.18), 0 0 60px rgba(0, 0, 0, 0.4);
  }

  .chat-main { padding: 10px; }

  .sidebar-toggle { display: grid; place-items: center; }

  .chat-topbar {
    padding: 8px 10px;
    gap: 8px;
    box-shadow: 3px 3px 0 var(--magenta), 6px 6px 0 var(--yellow);
  }

  .chat-topbar h2 { max-width: 42vw; font-size: clamp(14px, 4vw, 20px); }

  .topbar-info .eyebrow { font-size: 10px; }

  .status-pill { padding: 5px 8px; font-size: 11px; gap: 4px; }
  .status-dot { width: 6px; height: 6px; }

  .prompt-grid { grid-template-columns: 1fr; gap: 12px; }

  .prompt-grid button { min-height: 64px; }
  .prompt-grid button:nth-child(2) { transform: none; }

  .message-stage { padding: 16px 4px 12px; }

  .message-row {
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .message-row.user {
    grid-template-columns: minmax(0, 1fr) 38px;
    gap: 8px;
    margin-bottom: 12px;
  }

  .avatar { width: 38px; height: 38px; border-radius: 12px; border-width: 3px; }

  .message-bubble {
    padding: 12px 14px;
    border-width: 3px;
    border-radius: 18px;
    box-shadow: 5px 5px 0 var(--yellow);
  }

  .message-bubble p,
  .message-bubble :deep(.md-content) {
    font-size: 14px;
    line-height: 1.7;
  }

  .message-row.user .message-bubble {
    justify-self: end;
    box-shadow: 5px 5px 0 var(--cyan);
  }

  .message-row.user .avatar {
    grid-column: 2;
  }

  .empty-state {
    margin: 4vh auto 0;
    padding: 22px;
    border-width: 4px;
    border-radius: 24px 12px 24px 12px;
    box-shadow: 6px 6px 0 var(--cyan), 12px 12px 0 var(--yellow);
  }

  .empty-state h3 { font-size: clamp(24px, 8vw, 48px); }
  .empty-state p { font-size: 15px; }

  .composer {
    padding: 6px 8px;
    border-width: 4px;
    border-radius: 22px;
    box-shadow: 5px 5px 0 var(--magenta), 10px 10px 0 var(--cyan);
  }

  .composer-inner textarea {
    min-height: 38px;
    padding: 8px 14px;
    border-width: 3px;
    border-radius: 18px;
    font-size: 14px;
  }

  .send, .stop-btn { width: 42px; height: 42px; border-width: 3px; }
  .image-gen-btn { width: 38px; height: 38px; border-width: 2px; }
}

/* ---- Extra small screens ---- */
@media (max-width: 480px) {
  .chat-main { padding: 6px; }

  .chat-topbar {
    padding: 6px 8px;
    border-width: 2px;
    border-radius: 12px;
    box-shadow: 2px 2px 0 var(--magenta), 4px 4px 0 var(--yellow);
  }

  .sidebar-toggle { width: 34px; height: 34px; border-width: 2px; border-radius: 8px; }

  .chat-topbar h2 { font-size: clamp(13px, 4.5vw, 17px); max-width: 38vw; }

  .topbar-info .eyebrow { display: none; }

  .status-pill { padding: 4px 6px; font-size: 10px; border-width: 2px; }

  .history-panel { width: min(88vw, 300px); }

  .message-stage { padding: 10px 2px 8px; }

  .message-row {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 6px;
    margin-bottom: 10px;
  }

  .message-row.user {
    grid-template-columns: minmax(0, 1fr) 32px;
    gap: 6px;
    margin-bottom: 10px;
  }

  .avatar { width: 32px; height: 32px; border-width: 2px; border-radius: 10px; }

  .message-bubble {
    padding: 10px 12px;
    border-width: 2px;
    border-radius: 14px;
    box-shadow: 3px 3px 0 var(--yellow);
  }

  .message-bubble p,
  .message-bubble :deep(.md-content) {
    font-size: 13px;
    line-height: 1.65;
  }

  .composer {
    padding: 4px 6px;
    border-width: 3px;
    border-radius: 18px;
    box-shadow: 3px 3px 0 var(--magenta), 6px 6px 0 var(--cyan);
  }

  .composer-inner textarea {
    min-height: 36px;
    padding: 7px 12px;
    border-width: 2px;
    border-radius: 14px;
    font-size: 13px;
  }

  .send, .stop-btn { width: 38px; height: 38px; border-width: 2px; }
  .image-gen-btn { width: 34px; height: 34px; }

  .empty-state {
    padding: 16px;
    margin-top: 2vh;
    border-width: 3px;
    border-radius: 18px 10px 18px 10px;
    box-shadow: 4px 4px 0 var(--cyan), 8px 8px 0 var(--yellow);
  }

  .empty-badge { padding: 6px 10px; border-width: 3px; }
  .empty-state h3 { font-size: clamp(20px, 7vw, 36px); margin: 14px 0 8px; }
  .empty-state p { font-size: 13px; }

  .prompt-grid button {
    min-height: 52px;
    border-width: 3px;
    border-radius: 16px;
    padding: 10px;
    font-size: 13px;
  }

  .typing-indicator { min-height: 30px; padding: 6px 10px; gap: 8px; }
  .thinking-copy { font-size: 12px; }
  .thinking-dots span { width: 6px; height: 6px; }
}

/* ---- Clean theme responsive ---- */
@media (max-width: 900px) {
  :global([data-theme="clean"] .chat-shell) { grid-template-columns: 1fr; }
  :global([data-theme="clean"] .history-panel) {
    width: min(82vw, 300px);
    box-shadow: none;
  }
  :global([data-theme="clean"] .history-panel.open) {
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.15);
  }
  :global([data-theme="clean"] .chat-main) { padding: 8px; }
  :global([data-theme="clean"] .chat-topbar) {
    box-shadow: none;
    border-bottom: 1px solid #e5e7eb;
  }
  :global([data-theme="clean"] .message-row) { grid-template-columns: 34px minmax(0, 1fr); }
  :global([data-theme="clean"] .message-row.user) {
    grid-template-columns: minmax(0, 1fr) 34px; justify-content: stretch;
  }
  :global([data-theme="clean"] .avatar) { width: 34px; height: 34px; }
  :global([data-theme="clean"] .message-bubble) { box-shadow: none; }
  :global([data-theme="clean"] .message-row.user .message-bubble) { box-shadow: none; }
  :global([data-theme="clean"] .composer) { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
  :global([data-theme="clean"] .empty-state) { box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
}

@media (max-width: 480px) {
  :global([data-theme="clean"] .chat-main) { padding: 4px; }
  :global([data-theme="clean"] .message-row) { grid-template-columns: 30px minmax(0, 1fr); gap: 6px; }
  :global([data-theme="clean"] .message-row.user) {
    grid-template-columns: minmax(0, 1fr) 30px;
  }
  :global([data-theme="clean"] .avatar) { width: 30px; height: 30px; }
  :global([data-theme="clean"] .message-bubble p),
  :global([data-theme="clean"] .message-bubble :deep(.md-content)) { font-size: 13px; }
}
</style>








