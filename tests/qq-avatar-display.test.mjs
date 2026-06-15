import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(testDir);
const chatVue = readFileSync(join(projectRoot, 'src', 'components', 'Chat.vue'), 'utf8');
const apiTs = readFileSync(join(projectRoot, 'src', 'config', 'api.ts'), 'utf8');
const loginVue = readFileSync(join(projectRoot, 'src', 'components', 'Login.vue'), 'utf8');

test('user info can carry QQ or avatar fields from backend storage', () => {
  assert.match(apiTs, /qq\?:\s*string/);
  assert.match(apiTs, /avatarUrl\?:\s*string/);
  assert.match(apiTs, /resolvedAvatarUrl\?:\s*string/);
  assert.match(apiTs, /AVATAR_SETTINGS:\s*'\/avatar-settings'/);
  assert.match(loginVue, /qq\?:\s*string/);
  assert.match(loginVue, /avatarUrl\?:\s*string/);
  assert.match(loginVue, /resolvedAvatarUrl\?:\s*string/);
  assert.match(loginVue, /qq:\s*data\.qq/);
  assert.match(loginVue, /avatarUrl:\s*data\.avatarUrl/);
  assert.match(loginVue, /resolvedAvatarUrl:\s*data\.resolvedAvatarUrl/);
});

test('chat renders QQ avatar images for user and assistant messages with icon fallback', () => {
  assert.match(chatVue, /q\.qlogo\.cn\/headimg_dl\?dst_uin=/);
  assert.match(chatVue, /spec=640&img_type=jpg/);
  assert.match(chatVue, /const userAvatarUrl = computed/);
  assert.match(chatVue, /const aiAvatarUrl = computed/);
  assert.match(chatVue, /user\?\.qq/);
  assert.match(chatVue, /user\?\.username/);
  assert.match(chatVue, /<img[\s\S]*v-if="message\.role === 'user' && userAvatarUrl"/);
  assert.match(chatVue, /<img[\s\S]*v-else-if="message\.role === 'assistant' && aiAvatarUrl"/);
  assert.match(chatVue, /@error="onUserAvatarError"/);
  assert.match(chatVue, /@error="onAiAvatarError"/);
  assert.match(chatVue, /<Icon[\s\S]*v-else[\s\S]*:icon="message\.role === 'user' \? 'user' : 'bot'"/);
});

test('chat exposes a compact QQ avatar settings entry backed by the API', () => {
  assert.match(chatVue, /class="avatar-settings"/);
  assert.match(chatVue, /v-model="avatarForm\.userQq"/);
  assert.match(chatVue, /v-model="avatarForm\.aiQq"/);
  assert.match(chatVue, /saveAvatarSettings/);
  assert.match(chatVue, /API_CONFIG\.ENDPOINTS\.AVATAR_SETTINGS/);
  assert.match(chatVue, /setUser\(userInfo\.value\)/);
});
