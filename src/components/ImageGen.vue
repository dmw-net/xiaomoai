<template>
  <section class="image-studio">
    <div class="studio-layout">
      <section class="studio-main">
        <div class="studio-form">
          <div class="mode-switch" role="tablist" aria-label="图像生成模式">
            <button
              type="button"
              :class="{ active: mode === 'txt2img' }"
              :disabled="generating"
              @click="mode = 'txt2img'"
            >
              文生图
            </button>
            <button
              type="button"
              :class="{ active: mode === 'img2img' }"
              :disabled="generating"
              @click="mode = 'img2img'"
            >
              图生图
            </button>
          </div>

          <div class="preset-row">
            <button
              v-for="preset in presets"
              :key="preset.label"
              type="button"
              :disabled="generating"
              @click="applyPreset(preset.prompt)"
            >
              {{ preset.label }}
            </button>
          </div>

          <label v-if="mode === 'img2img'" class="field-block">
            <span>参考图</span>
            <input
              v-model="sourceImage"
              type="text"
              placeholder="https://example.com/input.png 或 data:image/png;base64,..."
              :disabled="generating"
            />
          </label>

          <label class="field-block">
            <span>提示词</span>
            <textarea
              v-model="prompt"
              rows="6"
              :placeholder="mode === 'img2img' ? '描述要改变什么，并说明要保留什么。' : '描述画面主体、场景、风格、光照、构图和细节。'"
              :disabled="generating"
              @keydown.enter.ctrl.prevent="onGenerate"
            />
          </label>

          <div class="option-grid">
            <label>
              <span>尺寸</span>
              <select v-model="size" :disabled="generating">
                <option value="1024x1024">1024x1024</option>
                <option value="1024x768">1024x768</option>
                <option value="768x1024">768x1024</option>
                <option value="1280x720">1280x720</option>
              </select>
            </label>
            <label>
              <span>保存历史</span>
              <select v-model="historyLimit" :disabled="generating">
                <option :value="12">最近 12 条</option>
                <option :value="24">最近 24 条</option>
                <option :value="48">最近 48 条</option>
              </select>
            </label>
          </div>

          <div class="form-actions">
            <button
              class="generate-btn"
              type="button"
              :disabled="!canGenerate || generating"
              @click="onGenerate"
            >
              <Icon v-if="!generating" icon="sparkles" :size="17" />
              <span v-else class="spinner"></span>
              {{ generating ? '生成中...' : '开始生成' }}
            </button>
            <button class="secondary-btn" type="button" :disabled="generating" @click="resetForm">
              清空
            </button>
          </div>

          <p v-if="error" class="error-msg">{{ error }}</p>
        </div>

        <div class="result-panel">
          <div v-if="generating" class="loading-state">
            <span class="spinner large"></span>
            <strong>{{ liveElapsed }}</strong>
          </div>

          <template v-else-if="currentResult">
            <img
              class="result-image"
              :src="currentResult.imageUrl"
              alt="生成的图片"
              referrerpolicy="no-referrer"
            />
            <div class="result-toolbar">
              <div class="result-meta">
                <span>{{ modeLabel(currentResult.mode) }}</span>
                <span>{{ currentResult.size }}</span>
                <span>{{ formatDuration(currentResult.elapsedMs) }}</span>
              </div>
              <div class="result-actions">
                <a :href="currentResult.imageUrl" target="_blank" rel="noopener">
                  <Icon icon="external-link" :size="14" />
                  原图
                </a>
                <button type="button" @click="copyUrl(currentResult.imageUrl)">
                  <Icon icon="copy" :size="14" />
                  {{ copied ? '已复制' : '复制链接' }}
                </button>
              </div>
            </div>
          </template>

          <div v-else class="empty-preview">
            <Icon icon="image" :size="42" />
            <strong>等待生成</strong>
          </div>
        </div>
      </section>

      <aside class="history-panel">
        <div class="history-top">
          <div>
            <span>历史记录</span>
            <strong>{{ history.length }}</strong>
          </div>
          <button type="button" :disabled="history.length === 0 || generating" @click="clearHistory">
            清空
          </button>
        </div>

        <div class="stats-grid">
          <div>
            <span>总生成</span>
            <strong>{{ history.length }}</strong>
          </div>
          <div>
            <span>平均耗时</span>
            <strong>{{ averageElapsed }}</strong>
          </div>
        </div>

        <div class="history-list">
          <button
            v-for="item in history"
            :key="item.id"
            type="button"
            class="history-card"
            :class="{ active: currentResult?.id === item.id }"
            @click="selectHistory(item)"
          >
            <img :src="item.imageUrl" alt="" referrerpolicy="no-referrer" />
            <span class="history-title">{{ item.prompt }}</span>
            <span class="history-meta">
              {{ modeLabel(item.mode) }} · {{ item.size }} · {{ formatDuration(item.elapsedMs) }}
            </span>
          </button>

          <div v-if="history.length === 0" class="history-empty">
            暂无图片历史
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import { API_CONFIG, getApiUrl, getToken, getUser } from '../config/api';

type ImageMode = 'txt2img' | 'img2img';

interface ImageHistoryItem {
  id: string;
  mode: ImageMode;
  prompt: string;
  sourceImage?: string;
  size: string;
  imageUrl: string;
  elapsedMs: number;
  createdAt: string;
}

const presets = [
  { label: '赛博朋克', prompt: 'cyberpunk style, neon lights, cinematic lighting, high detail' },
  { label: '产品图', prompt: 'clean product photography, white studio background, soft shadows, high detail' },
  { label: '海报', prompt: 'poster design, bold composition, rich visual hierarchy, sharp details' },
  { label: '写实', prompt: 'cinematic realism, natural lighting, detailed textures, high quality' },
];

const user = getUser();
const storageKey = `ai_study_buddy_image_history_${user?.userId || 'guest'}`;

const mode = ref<ImageMode>('txt2img');
const prompt = ref('');
const sourceImage = ref('');
const size = ref('1024x1024');
const historyLimit = ref(24);
const imageUrl = ref('');
const error = ref('');
const generating = ref(false);
const copied = ref(false);
const elapsedMs = ref(0);
const history = ref<ImageHistoryItem[]>([]);
const currentResult = ref<ImageHistoryItem | null>(null);
let timerId: number | undefined;

const canGenerate = computed(() => {
  if (generating.value || prompt.value.trim().length === 0) return false;
  return mode.value === 'txt2img' || sourceImage.value.trim().length > 0;
});

const liveElapsed = computed(() => formatDuration(elapsedMs.value));
const averageElapsed = computed(() => {
  if (history.value.length === 0) return '-';
  const total = history.value.reduce((sum, item) => sum + item.elapsedMs, 0);
  return formatDuration(Math.round(total / history.value.length));
});

onMounted(loadHistory);
onUnmounted(stopTimer);

watch(historyLimit, () => {
  history.value = history.value.slice(0, historyLimit.value);
  persistHistory();
});

function applyPreset(text: string) {
  prompt.value = prompt.value ? `${prompt.value}, ${text}` : text;
}

function resetForm() {
  prompt.value = '';
  sourceImage.value = '';
  imageUrl.value = '';
  error.value = '';
  currentResult.value = null;
}

async function onGenerate() {
  const text = prompt.value.trim();
  if (!text || !canGenerate.value) return;

  generating.value = true;
  error.value = '';
  imageUrl.value = '';
  currentResult.value = null;
  elapsedMs.value = 0;

  const startedAt = Date.now();
  startTimer(startedAt);

  try {
    const token = getToken();
    const payload: Record<string, string> = {
      prompt: text,
      size: size.value,
    };
    if (mode.value === 'img2img') {
      payload.imageUrl = sourceImage.value.trim();
    }

    const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.IMAGE_GENERATE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const requestElapsed = Date.now() - startedAt;

    if (!response.ok) {
      if (response.status === 401) {
        error.value = '登录已过期，请重新登录';
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.imageUrl) {
      const item: ImageHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        mode: mode.value,
        prompt: text,
        sourceImage: mode.value === 'img2img' ? sourceImage.value.trim() : undefined,
        size: size.value,
        imageUrl: data.imageUrl,
        elapsedMs: Number(data.elapsedMs) || requestElapsed,
        createdAt: new Date().toISOString(),
      };
      imageUrl.value = item.imageUrl;
      currentResult.value = item;
      history.value = [item, ...history.value].slice(0, historyLimit.value);
      persistHistory();
    } else {
      error.value = data.message || '生成失败，请稍后再试';
    }
  } catch (err: any) {
    error.value = err.name === 'AbortError' ? '已取消' : '网络错误，请稍后再试';
  } finally {
    generating.value = false;
    stopTimer();
  }
}

function selectHistory(item: ImageHistoryItem) {
  currentResult.value = item;
  imageUrl.value = item.imageUrl;
  mode.value = item.mode;
  prompt.value = item.prompt;
  sourceImage.value = item.sourceImage || '';
  size.value = item.size;
}

function clearHistory() {
  history.value = [];
  currentResult.value = null;
  imageUrl.value = '';
  persistHistory();
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
    window.setTimeout(() => { copied.value = false; }, 1800);
  } catch { /* ignore */ }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as ImageHistoryItem[];
    history.value = Array.isArray(parsed) ? parsed.slice(0, historyLimit.value) : [];
    currentResult.value = history.value[0] || null;
    imageUrl.value = currentResult.value?.imageUrl || '';
  } catch {
    history.value = [];
  }
}

function persistHistory() {
  localStorage.setItem(storageKey, JSON.stringify(history.value));
}

function startTimer(startedAt: number) {
  stopTimer();
  timerId = window.setInterval(() => {
    elapsedMs.value = Date.now() - startedAt;
  }, 200);
}

function stopTimer() {
  if (timerId !== undefined) {
    window.clearInterval(timerId);
    timerId = undefined;
  }
}

function modeLabel(value: ImageMode) {
  return value === 'img2img' ? '图生图' : '文生图';
}

function formatDuration(ms: number) {
  if (!ms || ms < 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}
</script>

<style scoped>
.image-studio {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.studio-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.studio-main,
.history-panel {
  min-height: 0;
  border: 3px solid rgba(0, 245, 212, 0.42);
  border-radius: 16px;
  background: rgba(13, 13, 26, 0.68);
  box-shadow: 5px 5px 0 rgba(255, 58, 242, 0.55);
}

.studio-main {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  overflow: hidden;
}

.studio-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-switch button,
.preset-row button,
.secondary-btn,
.result-actions a,
.result-actions button,
.history-top button {
  min-height: 36px;
  border: 2px solid rgba(0, 245, 212, 0.38);
  border-radius: 8px;
  color: var(--fg);
  background: rgba(45, 27, 78, 0.58);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
}

.mode-switch button.active {
  color: var(--bg);
  border-color: var(--cyan);
  background: var(--cyan);
}

.preset-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.field-block,
.option-grid label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
  font-weight: 800;
}

.field-block input,
.field-block textarea,
.option-grid select {
  width: 100%;
  border: 2px solid rgba(0, 245, 212, 0.38);
  border-radius: 10px;
  outline: none;
  padding: 10px 12px;
  color: var(--fg);
  background: rgba(45, 27, 78, 0.58);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.field-block textarea {
  min-height: 150px;
  resize: vertical;
}

.field-block input:focus,
.field-block textarea:focus,
.option-grid select:focus {
  border-color: var(--cyan);
  box-shadow: 0 0 0 3px rgba(0, 245, 212, 0.14);
}

.field-block input::placeholder,
.field-block textarea::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.option-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.form-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 92px;
  gap: 10px;
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  color: var(--bg);
  background: linear-gradient(90deg, var(--magenta), var(--cyan));
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.spinner {
  display: inline-block;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  transform-origin: 50% 50%;
  animation: image-spinner-rotate 0.8s linear infinite;
  will-change: transform;
}

.spinner.large {
  width: 34px;
  height: 34px;
  border-width: 3px;
}

@keyframes image-spinner-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-name: image-spinner-rotate !important;
    animation-duration: 0.8s !important;
    animation-iteration-count: infinite !important;
  }
}

.error-msg {
  margin: 0;
  padding: 10px 12px;
  border: 2px solid var(--orange);
  border-radius: 8px;
  color: var(--orange);
  background: rgba(255, 107, 53, 0.1);
  font-size: 13px;
  font-weight: 700;
}

.result-panel {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
  overflow: hidden;
  border: 2px dashed rgba(255, 230, 0, 0.45);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
}

.result-image {
  width: 100%;
  height: 100%;
  min-height: 0;
  object-fit: contain;
  padding: 12px;
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.result-meta,
.result-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.result-meta span {
  padding: 5px 8px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.76);
  background: rgba(255, 255, 255, 0.08);
  font-size: 12px;
  font-weight: 800;
}

.result-actions a,
.result-actions button {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 32px;
  padding: 0 10px;
  text-decoration: none;
}

.loading-state,
.empty-preview {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  min-height: 100%;
  color: rgba(255, 255, 255, 0.55);
}

.loading-state strong,
.empty-preview strong {
  font-size: 18px;
}

.history-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
}

.history-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.history-top div,
.stats-grid div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.history-top span,
.stats-grid span {
  color: rgba(255, 255, 255, 0.52);
  font-size: 12px;
  font-weight: 800;
}

.history-top strong,
.stats-grid strong {
  color: var(--fg);
  font-size: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stats-grid div {
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.07);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}

.history-card {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 4px 9px;
  width: 100%;
  padding: 8px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--fg);
  background: rgba(255, 255, 255, 0.05);
  text-align: left;
  cursor: pointer;
}

.history-card.active,
.history-card:hover {
  border-color: var(--cyan);
  background: rgba(0, 245, 212, 0.08);
}

.history-card img {
  grid-row: 1 / span 2;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  background: rgba(0, 0, 0, 0.25);
}

.history-title,
.history-meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-title {
  align-self: end;
  font-size: 13px;
  font-weight: 800;
}

.history-meta {
  color: rgba(255, 255, 255, 0.52);
  font-size: 12px;
  font-weight: 700;
}

.history-empty {
  display: grid;
  place-items: center;
  min-height: 120px;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.46);
  font-size: 13px;
  font-weight: 700;
}

:global([data-theme="clean"] .studio-main),
:global([data-theme="clean"] .history-panel) {
  border: 1px solid #e5e7eb;
  background: #fff;
  box-shadow: none;
}

:global([data-theme="clean"] .mode-switch button),
:global([data-theme="clean"] .preset-row button),
:global([data-theme="clean"] .secondary-btn),
:global([data-theme="clean"] .result-actions a),
:global([data-theme="clean"] .result-actions button),
:global([data-theme="clean"] .history-top button),
:global([data-theme="clean"] .field-block input),
:global([data-theme="clean"] .field-block textarea),
:global([data-theme="clean"] .option-grid select) {
  border: 1px solid #d1d5db;
  color: #202123;
  background: #fff;
}

:global([data-theme="clean"] .mode-switch button.active) {
  color: #fff;
  border-color: #10a37f;
  background: #10a37f;
}

:global([data-theme="clean"] .generate-btn) {
  color: #fff;
  background: #10a37f;
}

:global([data-theme="clean"] .field-block),
:global([data-theme="clean"] .option-grid label),
:global([data-theme="clean"] .history-top span),
:global([data-theme="clean"] .stats-grid span),
:global([data-theme="clean"] .history-meta) {
  color: #6b7280;
}

:global([data-theme="clean"] .field-block input::placeholder),
:global([data-theme="clean"] .field-block textarea::placeholder) {
  color: #9ca3af;
}

:global([data-theme="clean"] .result-panel) {
  border-color: #e5e7eb;
  background: #f8fafc;
}

:global([data-theme="clean"] .result-toolbar) {
  border-top-color: #e5e7eb;
}

:global([data-theme="clean"] .result-meta span),
:global([data-theme="clean"] .stats-grid div),
:global([data-theme="clean"] .history-card) {
  color: #202123;
  background: #f9fafb;
}

:global([data-theme="clean"] .history-card) {
  border-color: #e5e7eb;
}

:global([data-theme="clean"] .history-card.active),
:global([data-theme="clean"] .history-card:hover) {
  border-color: #10a37f;
  background: #ecfdf5;
}

:global([data-theme="clean"] .loading-state),
:global([data-theme="clean"] .empty-preview),
:global([data-theme="clean"] .history-empty) {
  color: #9ca3af;
}

:global([data-theme="clean"] .history-empty) {
  border-color: #d1d5db;
}

@media (max-width: 1120px) {
  .studio-layout {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .studio-main {
    min-height: 720px;
  }

  .history-panel {
    min-height: 260px;
  }
}

@media (max-width: 760px) {
  .studio-main {
    grid-template-columns: 1fr;
    min-height: auto;
    overflow-y: auto;
  }

  .result-panel {
    min-height: 360px;
  }

  .preset-row,
  .option-grid {
    grid-template-columns: 1fr 1fr;
  }

  .form-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .studio-layout {
    gap: 10px;
  }

  .studio-main,
  .history-panel {
    padding: 10px;
    border-width: 2px;
    border-radius: 12px;
  }

  .preset-row,
  .option-grid {
    grid-template-columns: 1fr;
  }

  .result-panel {
    min-height: 300px;
  }
}
</style>
