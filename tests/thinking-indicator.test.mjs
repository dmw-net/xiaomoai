import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';

const testDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(testDir);
const chatVue = readFileSync(join(projectRoot, 'src', 'components', 'Chat.vue'), 'utf8');

function extractFunctionBody(source, functionName) {
  const start = source.indexOf(`async function ${functionName}()`);
  assert.notEqual(start, -1, `${functionName} function should exist`);

  const bodyStart = source.indexOf('{', start);
  assert.notEqual(bodyStart, -1, `${functionName} should have a body`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return source.slice(bodyStart + 1, index);
  }

  assert.fail(`${functionName} body should close`);
}

test('send flow renders the thinking placeholder before backend work starts', () => {
  const onSendBody = extractFunctionBody(chatVue, 'onSend');
  const placeholderIndex = onSendBody.indexOf("messages.value.push({ role: 'assistant', content: '' })");
  const ensureConversationIndex = onSendBody.indexOf('await ensureConversation(text)');

  assert.ok(placeholderIndex >= 0, 'assistant placeholder should be inserted for waiting state');
  assert.ok(ensureConversationIndex >= 0, 'conversation creation should still happen');
  assert.ok(
    placeholderIndex < ensureConversationIndex,
    'thinking placeholder should render before creating/opening the backend conversation'
  );
});

test('thinking indicator is an accessible visible status with animated dots', () => {
  assert.match(chatVue, /class="typing-indicator"[\s\S]*role="status"[\s\S]*aria-live="polite"/);
  assert.match(chatVue, /class="thinking-copy"[\s\S]*思考中/);
  assert.match(chatVue, /class="thinking-dots"[\s\S]*<span><\/span><span><\/span><span><\/span>/);
  assert.match(chatVue, /@keyframes thinking-dot-bounce/);
  assert.match(chatVue, /\.thinking-dots span\s*\{[\s\S]*animation:\s*thinking-dot-bounce/);
});

test('thinking indicator keeps a gentle cue when reduced motion is enabled', () => {
  assert.match(
    chatVue,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.thinking-dots span\s*\{[\s\S]*animation-duration:\s*1\.4s\s*!important;[\s\S]*animation-iteration-count:\s*infinite\s*!important;/
  );
});
