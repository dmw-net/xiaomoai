<template>
  <section class="video-studio">
    <div class="studio-layout">
      <section class="studio-main">
        <div class="video-form">
          <div class="mode-switch" role="tablist" aria-label="视频生成模式">
            <button type="button" :class="{ active: mode === 'text' }" :disabled="busy" @click="mode = 'text'">文生视频</button>
            <button type="button" :class="{ active: mode === 'image' }" :disabled="busy" @click="mode = 'image'">图生视频</button>
            <button type="button" :class="{ active: mode === 'keyframes' }" :disabled="busy" @click="mode = 'keyframes'">关键帧</button>
          </div>

          <label v-if="mode !== 'text'" class="field-block">
            <span>{{ mode === 'image' ? '参考图' : '关键帧图片' }}</span>
            <textarea
              v-model="imageText"
              rows="3"
              :disabled="busy"
              placeholder="https://example.com/keyframe-1.png&#10;https://example.com/keyframe-2.png"
            />
          </label>

          <label class="field-block">
            <span>提示词</span>
            <textarea
              v-model="prompt"
              rows="6"
              :disabled="busy"
              placeholder="描述主体、动作、场景、镜头运动、光照和视觉风格。"
              @keydown.enter.ctrl.prevent="createVideo"
            />
          </label>

          <div class="option-grid">
            <label>
              <span>分辨率</span>
              <select v-model="resolution" :disabled="busy">
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
              </select>
            </label>
            <label>
              <span>画面比例</span>
              <select v-model="ratio" :disabled="busy">
                <option value="16:9">16:9 横屏</option>
                <option value="9:16">9:16 竖屏</option>
                <option value="1:1">1:1 方形</option>
                <option value="4:3">4:3 横向</option>
                <option value="3:4">3:4 竖向</option>
              </select>
            </label>
            <label>
              <span>视频时长 <small>（最大支持约 {{ maxDurationAt24fps.toFixed(1) }}s / {{ maxFrames }} 帧）</small></span>
              <select v-model="durationPreset" :disabled="busy" @change="applyDurationPreset">
                <option value="3s">约 3 秒</option>
                <option value="5s">约 5 秒</option>
                <option value="10s">约 10 秒</option>
                <option value="15s">约 15 秒</option>
                <option value="custom">自定义</option>
              </select>
            </label>
            <label v-if="durationPreset === 'custom'">
              <span>自定义时长 (秒)</span>
              <input
                v-model.number="customDuration"
                type="number"
                :disabled="busy"
                :min="minDuration"
                :max="maxDurationAt24fps"
                step="0.1"
                :placeholder="`最大约 ${maxDurationAt24fps.toFixed(1)}s`"
              />
            </label>
          </div>

          <p class="basic-tip">* 时长按 24fps 估算，实际取决于帧率设置</p>

          <button type="button" class="advanced-toggle" @click="showAdvanced = !showAdvanced">
            <Icon :icon="showAdvanced ? 'chevron-up' : 'chevron-down'" :size="16" />
            <span>高级选项</span>
            <span class="toggle-label">{{ showAdvanced ? '收起' : '展开' }}</span>
          </button>

          <div v-show="showAdvanced" class="advanced-panel">
            <label class="field-block">
              <span>负面提示词 <small>（可选）</small></span>
              <textarea
                v-model="negativePrompt"
                rows="2"
                :disabled="busy"
                placeholder="不希望出现的内容，如：blurry, low quality, watermark"
              />
            </label>

            <div class="option-grid">
              <label>
                <span>帧数 <small>（上限 {{ maxFrames }}）</small></span>
                <input
                  v-model.number="numFrames"
                  type="number"
                  :disabled="busy"
                  :min="minFrames"
                  :max="maxFrames"
                  step="8"
                  :placeholder="`默认 ${DEFAULT_NUM_FRAMES}`"
                />
              </label>
              <label>
                <span>帧率 (FPS)</span>
                <select v-model.number="frameRate" :disabled="busy">
                  <option :value="12">12 FPS</option>
                  <option :value="16">16 FPS</option>
                  <option :value="20">20 FPS</option>
                  <option :value="24">24 FPS</option>
                  <option :value="30">30 FPS</option>
                  <option :value="48">48 FPS</option>
                  <option :value="60">60 FPS</option>
                </select>
              </label>
              <label>
                <span>随机种子 <small>（可选）</small></span>
                <input
                  v-model.number="seed"
                  type="number"
                  :disabled="busy"
                  min="0"
                  placeholder="留空则随机"
                />
              </label>
              <div class="hint-cell">
                <span>当前时长</span>
                <span class="hint-value">{{ durationLabel }}</span>
              </div>
            </div>

            <p class="advanced-tip">
              帧数需满足 8n+1 公式，如 81、121、241、441<br />
              各分辨率帧数上限：480p → 441 帧 / 720p → 409 帧 / 1080p → 169 帧
            </p>
          </div>

          <div class="form-actions">
            <button class="generate-btn" type="button" :disabled="!canGenerate || busy" @click="createVideo">
              <Icon v-if="!busy" icon="video" :size="17" />
              <span v-else class="spinner"></span>
              {{ busy ? '生成中...' : '开始生成' }}
            </button>
            <button class="secondary-btn" type="button" :disabled="busy" @click="resetForm">清空</button>
          </div>

          <p v-if="error" class="error-msg">{{ error }}</p>
        </div>

        <div class="video-result">
          <div v-if="busy" class="loading-state">
            <span class="spinner large"></span>
            <strong>正在创建视频任务</strong>
          </div>

          <div v-else-if="task && !task.videoUrl" class="progress-state">
            <strong>{{ statusLabel(task.status) }}</strong>
            <div class="progress-track"><span :style="{ width: `${task.progress || 0}%` }"></span></div>
            <small>{{ task.progress || 0 }}%</small>
            <button class="status-btn" type="button" :disabled="statusBusy || !task.videoId" @click="checkCurrentStatus">
              <span v-if="statusBusy" class="spinner small"></span>
              <span>{{ statusBusy ? '查询中...' : '手动查询状态' }}</span>
            </button>
          </div>

          <template v-else-if="task?.videoUrl">
            <video class="result-video" :src="task.videoUrl" controls playsinline></video>
            <div class="result-toolbar">
              <div class="result-meta">
                <span>{{ task.size || size }}</span>
                <span>{{ task.seconds ? `${task.seconds}s` : durationLabel }}</span>
                <span>{{ statusLabel(task.status || 'completed') }}</span>
              </div>
              <div class="result-actions">
                <a :href="task.videoUrl" target="_blank" rel="noopener">打开视频</a>
                <button type="button" @click="copyUrl(task.videoUrl)">
                  {{ copied ? '已复制' : '复制链接' }}
                </button>
              </div>
            </div>
          </template>

          <div v-else class="empty-preview">
            <Icon icon="video" :size="42" />
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
          <button type="button" :disabled="history.length === 0 || busy" @click="clearHistory">清空</button>
        </div>

        <div class="stats-grid">
          <div>
            <span>总任务</span>
            <strong>{{ history.length }}</strong>
          </div>
          <div>
            <span>已完成</span>
            <strong>{{ completedCount }}</strong>
          </div>
        </div>

        <div class="history-list">
          <button
            v-for="item in history"
            :key="item.id"
            type="button"
            class="history-card"
            :class="{ active: task?.videoId === item.videoId }"
            @click="selectHistory(item)"
          >
            <span class="history-thumb">
              <video v-if="item.videoUrl" :src="item.videoUrl" muted playsinline preload="metadata"></video>
              <Icon v-else icon="video" :size="22" />
            </span>
            <span class="history-title">{{ item.prompt }}</span>
            <span class="history-meta">{{ statusLabel(item.status) }} / {{ item.size || item.requestedSize }}</span>
          </button>

          <div v-if="history.length === 0" class="history-empty">
            暂无视频历史
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import { API_CONFIG, getApiUrl, getToken, getUser } from '../config/api';

type VideoMode = 'text' | 'image' | 'keyframes';
type VideoResolution = '480p' | '720p' | '1080p';
type VideoRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

interface VideoTask {
  taskId?: string;
  videoId?: string;
  status?: string;
  progress?: number;
  seconds?: string;
  size?: string;
  videoUrl?: string;
  error?: unknown;
}

interface VideoHistoryItem extends VideoTask {
  id: string;
  mode: VideoMode;
  prompt: string;
  negativePrompt?: string;
  images: string[];
  resolution: VideoResolution;
  ratio: VideoRatio;
  requestedSize: string;
  numFrames: number;
  frameRate: number;
  seed?: number;
  createdAt: string;
  updatedAt: string;
}

interface VideoApiResponse {
  success: boolean;
  message?: string;
  task?: VideoTask;
}

const DEFAULT_NUM_FRAMES = 121;
const DEFAULT_FRAME_RATE = 24;
const HISTORY_LIMIT = 24;
const API_MAX_FRAMES = 441;

const user = getUser();
const storageKey = `ai_study_buddy_video_history_${user?.userId || 'guest'}`;

const mode = ref<VideoMode>('text');
const prompt = ref('');
const negativePrompt = ref('');
const imageText = ref('');
const resolution = ref<VideoResolution>('720p');
const ratio = ref<VideoRatio>('16:9');
const numFrames = ref(DEFAULT_NUM_FRAMES);
const frameRate = ref(DEFAULT_FRAME_RATE);
const seed = ref<number | undefined>(undefined);
const task = ref<VideoTask | null>(null);
const error = ref('');
const busy = ref(false);
const statusBusy = ref(false);
const copied = ref(false);
const history = ref<VideoHistoryItem[]>([]);
const showAdvanced = ref(false);
const durationPreset = ref('5s');
const customDuration = ref(5);

const images = computed(() => imageText.value.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean));
const canGenerate = computed(() => prompt.value.trim().length > 0 && (mode.value === 'text' || images.value.length > 0));
const selectedSize = computed(() => videoSizeFor(resolution.value, ratio.value));
const size = computed(() => `${selectedSize.value.width}x${selectedSize.value.height}`);

const maxFrames = computed(() => {
  if (resolution.value === '1080p') return Math.min(169, API_MAX_FRAMES);
  if (resolution.value === '720p') return Math.min(409, API_MAX_FRAMES);
  return API_MAX_FRAMES;
});

const minFrames = computed(() => 9);

const minDuration = computed(() => minFrames.value / 60);

const maxDurationAt24fps = computed(() => maxFrames.value / 24);

const durationLabel = computed(() => `${(numFrames.value / frameRate.value).toFixed(1)}s`);
const completedCount = computed(() => history.value.filter(item => item.status === 'completed' || !!item.videoUrl).length);

function applyDurationPreset() {
  const presetMap: Record<string, { frames: number; rate: number }> = {
    '3s': { frames: 81, rate: 24 },
    '5s': { frames: 121, rate: 24 },
    '10s': { frames: 241, rate: 24 },
    '15s': { frames: 361, rate: 24 },
  };
  const preset = presetMap[durationPreset.value];
  if (preset) {
    const targetFrames = Math.min(preset.frames, maxFrames.value);
    const normalizedFrames = Math.floor((targetFrames - 1) / 8) * 8 + 1;
    numFrames.value = Math.max(minFrames.value, Math.min(normalizedFrames, maxFrames.value));
    frameRate.value = preset.rate;
  }
}

function updateFramesFromDuration() {
  if (durationPreset.value === 'custom' && customDuration.value) {
    const targetFrames = Math.round(customDuration.value * frameRate.value);
    const adjustedFrames = Math.max(minFrames.value, Math.min(targetFrames, maxFrames.value));
    const normalizedFrames = Math.floor((adjustedFrames - 1) / 8) * 8 + 1;
    numFrames.value = Math.max(minFrames.value, Math.min(normalizedFrames, maxFrames.value));
  }
}

watch([customDuration, frameRate], () => {
  if (durationPreset.value === 'custom') {
    updateFramesFromDuration();
  }
});

watch(maxFrames, () => {
  numFrames.value = Math.min(numFrames.value, maxFrames.value);
});

onMounted(loadHistory);

async function createVideo() {
  if (!canGenerate.value) return;
  busy.value = true;
  statusBusy.value = false;
  error.value = '';
  task.value = null;

  const requestImages = images.value;
  const payload: Record<string, unknown> = {
    prompt: prompt.value.trim(),
    mode: mode.value,
    resolution: resolution.value,
    ratio: ratio.value,
    width: selectedSize.value.width,
    height: selectedSize.value.height,
    numFrames: numFrames.value,
    frameRate: frameRate.value,
  };
  if (negativePrompt.value.trim()) payload.negativePrompt = negativePrompt.value.trim();
  if (seed.value !== undefined && seed.value >= 0) payload.seed = seed.value;
  if (mode.value !== 'text') payload.images = requestImages;

  try {
    const data = await requestJson(getApiUrl(API_CONFIG.ENDPOINTS.VIDEO_GENERATE), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!data.success || !data.task?.videoId) {
      error.value = data.message || '视频任务创建失败';
      return;
    }

    const nextTask = data.task;
    task.value = nextTask;
    const historyItem: VideoHistoryItem = {
        id: nextTask.videoId!,
      mode: mode.value,
      prompt: prompt.value.trim(),
      images: requestImages,
      resolution: resolution.value,
      ratio: ratio.value,
      requestedSize: size.value,
      numFrames: numFrames.value,
      frameRate: frameRate.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...nextTask,
    };
    if (negativePrompt.value.trim()) {
      historyItem.negativePrompt = negativePrompt.value.trim();
    }
    if (seed.value !== undefined && seed.value >= 0) {
      historyItem.seed = seed.value;
    }
    upsertHistory(historyItem);
  } catch (err: unknown) {
    error.value = errorMessage(err, '视频任务创建失败');
  } finally {
    busy.value = false;
  }
}

function checkCurrentStatus() {
  if (!task.value?.videoId || statusBusy.value) return;
  void queryStatus(task.value.videoId);
}

async function queryStatus(videoId: string) {
  statusBusy.value = true;
  error.value = '';
  try {
    const data = await requestJson(getApiUrl(API_CONFIG.ENDPOINTS.VIDEO_STATUS, { videoId }));
    if (!data.success) {
      error.value = data.message || '视频状态查询失败';
      return;
    }

    task.value = { ...task.value, ...data.task };
    const item = history.value.find(entry => entry.videoId === videoId);
    if (item) {
      upsertHistory({ ...item, ...data.task, updatedAt: new Date().toISOString() });
    }
    if (task.value?.status === 'failed') error.value = '视频生成失败';
  } catch (err: unknown) {
    error.value = errorMessage(err, '视频状态查询失败');
  } finally {
    statusBusy.value = false;
  }
}

async function requestJson(url: string, init: RequestInit = {}): Promise<VideoApiResponse> {
  const token = getToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(response.status === 401 ? '请重新登录' : `HTTP ${response.status}`);
  return response.json();
}

function selectHistory(item: VideoHistoryItem) {
  mode.value = item.mode;
  prompt.value = item.prompt;
  negativePrompt.value = item.negativePrompt || '';
  imageText.value = item.images.join('\n');
  resolution.value = item.resolution;
  ratio.value = item.ratio;
  numFrames.value = item.numFrames || DEFAULT_NUM_FRAMES;
  frameRate.value = item.frameRate || DEFAULT_FRAME_RATE;
  seed.value = item.seed;
  task.value = {
    taskId: item.taskId,
    videoId: item.videoId,
    status: item.status,
    progress: item.progress,
    seconds: item.seconds,
    size: item.size,
    videoUrl: item.videoUrl,
    error: item.error,
  };
  error.value = '';
}

function resetForm() {
  prompt.value = '';
  negativePrompt.value = '';
  imageText.value = '';
  numFrames.value = DEFAULT_NUM_FRAMES;
  frameRate.value = DEFAULT_FRAME_RATE;
  seed.value = undefined;
  task.value = null;
  error.value = '';
  busy.value = false;
  statusBusy.value = false;
}

function clearHistory() {
  history.value = [];
  task.value = null;
  persistHistory();
}

async function copyUrl(url?: string) {
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
    window.setTimeout(() => { copied.value = false; }, 1800);
  } catch {
    // Clipboard permission failures are non-critical.
  }
}

function upsertHistory(item: VideoHistoryItem) {
  history.value = [item, ...history.value.filter(entry => entry.videoId !== item.videoId && entry.id !== item.id)]
    .slice(0, HISTORY_LIMIT);
  persistHistory();
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as VideoHistoryItem[];
    history.value = Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
    if (history.value[0]) selectHistory(history.value[0]);
  } catch {
    history.value = [];
  }
}

function persistHistory() {
  localStorage.setItem(storageKey, JSON.stringify(history.value));
}

function videoSizeFor(selectedResolution: VideoResolution, selectedRatio: VideoRatio) {
  const longSide = selectedResolution === '1080p' ? 1920 : selectedResolution === '720p' ? 1280 : 854;
  const shortSide = selectedResolution === '1080p' ? 1080 : selectedResolution === '720p' ? 720 : 480;
  if (selectedRatio === '16:9') return { width: longSide, height: shortSide };
  if (selectedRatio === '9:16') return { width: shortSide, height: longSide };
  if (selectedRatio === '1:1') return { width: shortSide, height: shortSide };
  if (selectedRatio === '4:3') return { width: Math.round(shortSide * 4 / 3), height: shortSide };
  return { width: shortSide, height: Math.round(shortSide * 4 / 3) };
}

function statusLabel(status?: string) {
  if (status === 'completed' || status === 'succeeded') return '已完成';
  if (status === 'in_progress' || status === 'processing' || status === 'running') return '生成中';
  if (status === 'failed') return '失败';
  if (status === 'queued' || status === 'pending') return '排队中';
  return '等待中';
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}
</script>

<style scoped>
.video-studio {
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
  grid-template-columns: minmax(300px, 420px) minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  overflow: hidden;
}

.video-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mode-switch button,
.secondary-btn,
.status-btn,
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

.field-block,
.option-grid label,
.hint-cell {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
  font-weight: 800;
}

.field-block input,
.field-block textarea,
.option-grid select,
.option-grid input {
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
.option-grid select:focus,
.option-grid input:focus {
  border-color: var(--cyan);
  box-shadow: 0 0 0 3px rgba(0, 245, 212, 0.14);
}

.field-block input::placeholder,
.field-block textarea::placeholder,
.option-grid input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.option-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.option-grid select,
.option-grid input {
  min-height: 36px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
}

.hint-cell .hint-value {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  color: var(--cyan);
  background: rgba(0, 245, 212, 0.12);
  font-size: 14px;
  font-weight: 700;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  padding: 8px 12px;
  border: 2px solid rgba(0, 245, 212, 0.38);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.76);
  background: rgba(45, 27, 78, 0.58);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  transition: all 0.2s ease;
}

.advanced-toggle:hover {
  border-color: var(--cyan);
  color: var(--cyan);
  background: rgba(0, 245, 212, 0.08);
}

.toggle-label {
  opacity: 0.7;
  font-size: 12px;
  font-weight: 700;
}

.advanced-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 2px dashed rgba(0, 245, 212, 0.3);
  border-radius: 10px;
  background: rgba(45, 27, 78, 0.35);
}

.advanced-panel .field-block textarea {
  min-height: 80px;
}

.basic-tip {
  margin: -4px 0 0;
  padding: 0 4px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.advanced-tip {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.56);
  background: rgba(255, 255, 255, 0.06);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
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

.generate-btn:disabled {
  opacity: 0.78;
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
  animation: video-spinner-rotate 0.8s linear infinite;
  will-change: transform;
}

.spinner.small {
  width: 13px;
  height: 13px;
}

.spinner.large {
  width: 34px;
  height: 34px;
  border-width: 3px;
}

@keyframes video-spinner-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-name: video-spinner-rotate !important;
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

.video-result {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
  overflow: hidden;
  border: 2px dashed rgba(255, 230, 0, 0.45);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
}

.result-video {
  width: 100%;
  height: 100%;
  min-height: 0;
  object-fit: contain;
  background: #000;
}

.loading-state,
.progress-state,
.empty-preview {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  min-height: 100%;
  color: rgba(255, 255, 255, 0.62);
}

.loading-state strong,
.progress-state strong,
.empty-preview strong {
  font-size: 18px;
}

.progress-track {
  width: min(420px, 78%);
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--cyan);
}

.status-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 124px;
  padding: 0 14px;
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.76);
  font-size: 12px;
  font-weight: 800;
}

.result-meta,
.result-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.result-meta span {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.result-actions a,
.result-actions button {
  display: grid;
  place-items: center;
  min-height: 32px;
  padding: 0 10px;
  color: var(--fg);
  text-decoration: none;
}

.history-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  overflow: hidden;
}

.history-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.history-top div,
.stats-grid div {
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}

.history-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
}

.history-card {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 4px 10px;
  width: 100%;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: var(--fg);
  background: rgba(0, 0, 0, 0.16);
  text-align: left;
  cursor: pointer;
}

.history-card.active,
.history-card:hover {
  border-color: var(--cyan);
  background: rgba(0, 245, 212, 0.08);
}

.history-thumb {
  grid-row: 1 / span 2;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.28);
}

.history-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.46);
  font-size: 13px;
  font-weight: 800;
}

:global([data-theme="clean"] .studio-main),
:global([data-theme="clean"] .history-panel) {
  border: 1px solid #e5e7eb;
  background: #fff;
  box-shadow: none;
}

:global([data-theme="clean"] .mode-switch button),
:global([data-theme="clean"] .secondary-btn),
:global([data-theme="clean"] .status-btn),
:global([data-theme="clean"] .result-actions a),
:global([data-theme="clean"] .result-actions button),
:global([data-theme="clean"] .history-top button),
:global([data-theme="clean"] .advanced-toggle) {
  border: 1px solid #d1d5db;
  color: #202123;
  background: #fff;
}

:global([data-theme="clean"] .field-block input),
:global([data-theme="clean"] .field-block textarea),
:global([data-theme="clean"] .option-grid select),
:global([data-theme="clean"] .option-grid input) {
  border: 1px solid #d1d5db;
  color: #202123;
  background: #fff;
}

:global([data-theme="clean"] .mode-switch button.active),
:global([data-theme="clean"] .generate-btn) {
  color: #fff;
  border-color: #10a37f;
  background: #10a37f;
}

:global([data-theme="clean"] .advanced-toggle:hover) {
  border-color: #10a37f;
  color: #10a37f;
  background: #ecfdf5;
}

:global([data-theme="clean"] .field-block),
:global([data-theme="clean"] .option-grid label),
:global([data-theme="clean"] .hint-cell),
:global([data-theme="clean"] .loading-state),
:global([data-theme="clean"] .progress-state),
:global([data-theme="clean"] .empty-preview),
:global([data-theme="clean"] .history-top span),
:global([data-theme="clean"] .stats-grid span),
:global([data-theme="clean"] .history-meta) {
  color: #6b7280;
}

:global([data-theme="clean"] .field-block input::placeholder),
:global([data-theme="clean"] .field-block textarea::placeholder),
:global([data-theme="clean"] .option-grid input::placeholder) {
  color: #9ca3af;
}

:global([data-theme="clean"] .hint-cell .hint-value) {
  color: #10a37f;
  background: #ecfdf5;
}

:global([data-theme="clean"] .advanced-panel) {
  border-color: #e5e7eb;
  background: #f9fafb;
}

:global([data-theme="clean"] .advanced-tip) {
  color: #6b7280;
  background: #f3f4f6;
}

:global([data-theme="clean"] .basic-tip) {
  color: #9ca3af;
}

:global([data-theme="clean"] .video-result) {
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

:global([data-theme="clean"] .history-empty) {
  color: #9ca3af;
  border-color: #d1d5db;
}

@media (max-width: 1120px) {
  .video-studio {
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .studio-layout {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 100%;
  }

  .history-panel {
    min-height: 260px;
    max-height: 420px;
  }
}

@media (max-width: 900px) {
  .studio-main {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }

  .video-form {
    overflow: visible;
  }

  .video-result {
    min-height: 320px;
  }
}

@media (max-width: 760px) {
  .studio-main,
  .history-panel {
    box-shadow: none;
  }

  .result-toolbar {
    align-items: stretch;
    flex-direction: column;
    padding: 8px;
  }

  .result-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }

  .generate-btn,
  .secondary-btn {
    min-height: 44px;
  }
}

@media (max-width: 480px) {
  .studio-layout {
    gap: 8px;
  }

  .studio-main,
  .history-panel {
    padding: 8px;
    border-width: 1px;
    border-radius: 10px;
  }

  .mode-switch,
  .option-grid,
  .form-actions {
    grid-template-columns: 1fr;
  }

  .video-result {
    min-height: 260px;
    border-width: 1px;
    border-radius: 10px;
  }

  .history-panel {
    max-height: none;
    overflow: visible;
  }

  .history-list {
    max-height: none;
    overflow: visible;
  }

  .history-card {
    grid-template-columns: 54px minmax(0, 1fr);
    gap: 3px 8px;
    padding: 7px;
  }

  .history-thumb {
    width: 54px;
    height: 54px;
  }
}
</style>
