import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = dirname(testDir);
const backendRoot = dirname(frontendRoot);

const authController = readFileSync(join(backendRoot, 'src', 'main', 'java', 'com', 'dmw', 'aistudybuddy', 'controller', 'AuthController.java'), 'utf8');
const avatarController = readFileSync(join(backendRoot, 'src', 'main', 'java', 'com', 'dmw', 'aistudybuddy', 'controller', 'AvatarSettingsController.java'), 'utf8');
const avatarUtil = readFileSync(join(backendRoot, 'src', 'main', 'java', 'com', 'dmw', 'aistudybuddy', 'util', 'AvatarUtil.java'), 'utf8');
const userEntity = readFileSync(join(backendRoot, 'src', 'main', 'java', 'com', 'dmw', 'aistudybuddy', 'entity', 'User.java'), 'utf8');
const appSettingEntity = readFileSync(join(backendRoot, 'src', 'main', 'java', 'com', 'dmw', 'aistudybuddy', 'entity', 'AppSetting.java'), 'utf8');
const schemaSql = readFileSync(join(backendRoot, 'src', 'main', 'resources', 'schema.sql'), 'utf8');

test('backend persists user QQ/avatar fields and returns resolved avatar URLs on auth', () => {
  assert.match(userEntity, /private String qq;/);
  assert.match(userEntity, /private String avatarUrl;/);
  assert.match(authController, /request\.getQq\(\)/);
  assert.match(authController, /request\.getAvatarUrl\(\)/);
  assert.match(authController, /AvatarUtil\.resolvedAvatarUrl\(user\)/);
  assert.match(avatarUtil, /q\.qlogo\.cn\/headimg_dl\?dst_uin=/);
  assert.match(avatarUtil, /private static final String QQ_PATTERN = "\^\[1-9\]/);
});

test('backend exposes authenticated avatar settings with an AI QQ setting', () => {
  assert.match(avatarController, /@RequestMapping\("\/api\/avatar-settings"\)/);
  assert.match(avatarController, /private static final String AI_QQ_SETTING_KEY = "ai\.qq"/);
  assert.match(avatarController, /@GetMapping/);
  assert.match(avatarController, /@PutMapping/);
  assert.match(avatarController, /AvatarUtil\.qqAvatarUrl\(aiQq\)/);
  assert.match(appSettingEntity, /@TableName\("app_settings"\)/);
});

test('database schema includes avatar fields and app settings table', () => {
  assert.match(schemaSql, /`qq`\s+VARCHAR\(20\)/);
  assert.match(schemaSql, /`avatar_url`\s+VARCHAR\(500\)/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS `app_settings`/);
  assert.match(schemaSql, /`setting_key`\s+VARCHAR\(80\)/);
});
