const isProduction = import.meta.env.PROD;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export const API_CONFIG = {
  BASE_URL: isProduction ? `${BASE_URL}/api` : '/api',
  ENDPOINTS: {
    CHAT: '/ai/chat',
    AUTH_LOGIN: '/auth/login',
    AUTH_REGISTER: '/auth/register',
    CONVERSATIONS: '/conversations',
  }
};

export interface UserInfo {
  userId: number;
  username: string;
  nickname: string;
}

const TOKEN_KEY = 'ai_study_buddy_token';
const USER_KEY = 'ai_study_buddy_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken(): boolean {
  return !!getToken();
}

export function getUser(): UserInfo | null {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as UserInfo;
  } catch {
    return null;
  }
}

export function setUser(user: UserInfo): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function logout(): void {
  clearToken();
  clearUser();
}

export function getApiUrl(endpoint: string, params?: Record<string, string>): string {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, value);
    });
    url += `?${searchParams.toString()}`;
  }

  return url;
}
