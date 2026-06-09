export type ThemeName = 'clean' | 'maximalism' | 'cyberpunk';

export const THEME_OPTIONS: Array<{ name: ThemeName; label: string; description: string }> = [
  { name: 'clean', label: '纯白', description: 'ChatGPT 式阅读' },
  { name: 'maximalism', label: '多巴胺', description: '高饱和极繁风' },
  { name: 'cyberpunk', label: '赛博', description: '霓虹故障终端' },
];

const DEFAULT_THEME: ThemeName = 'clean';
const THEME_KEY = 'ai_study_buddy_theme';

export function getTheme(): ThemeName {
  const stored = localStorage.getItem(THEME_KEY);
  return isThemeName(stored) ? stored : DEFAULT_THEME;
}

export function setTheme(theme: ThemeName): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme?: ThemeName): void {
  const t = theme || getTheme();
  document.documentElement.setAttribute('data-theme', t);
}

export function toggleTheme(): ThemeName {
  const current = getTheme();
  const index = THEME_OPTIONS.findIndex(item => item.name === current);
  const next = THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length].name;
  setTheme(next);
  return next;
}

function isThemeName(value: unknown): value is ThemeName {
  return THEME_OPTIONS.some(item => item.name === value);
}
