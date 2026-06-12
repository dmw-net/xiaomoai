<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :aria-label="label"
    :aria-hidden="label ? undefined : true"
  >
    <template v-if="icon === 'close'">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </template>

    <template v-else-if="icon === 'plus'">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </template>

    <template v-else-if="icon === 'menu'">
      <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </template>

    <template v-else-if="icon === 'send'">
      <path d="M3 20L22 12L3 4V10L16 12L3 14V20Z" fill="currentColor" />
    </template>

    <template v-else-if="icon === 'stop'">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </template>

    <template v-else-if="icon === 'chevron-down'">
      <polyline points="6,9 12,15 18,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </template>

    <template v-else-if="icon === 'copy'">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M5 15V5C5 3.9 5.9 3 7 3H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
    </template>

    <template v-else-if="icon === 'check'">
      <polyline points="4,12 9,17 20,6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </template>

    <template v-else-if="icon === 'user'">
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path d="M4 21C4 17.13 7.58 14 12 14C16.42 14 20 17.13 20 21" fill="currentColor" />
    </template>

    <template v-else-if="icon === 'bot'">
      <rect x="4" y="7" width="16" height="12" rx="3" stroke="currentColor" stroke-width="2" fill="none" />
      <circle cx="9" cy="13" r="1.5" fill="currentColor" />
      <circle cx="15" cy="13" r="1.5" fill="currentColor" />
      <line x1="12" y1="7" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="2" r="1" fill="currentColor" />
    </template>

    <template v-else-if="icon === 'logout'">
      <path d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
      <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </template>

    <template v-else-if="icon === 'sparkles'">
      <path d="M12 2L13.5 7.5L19 6L14.5 9.5L18 14L12.5 11.5L12 17L11.5 11.5L6 14L9.5 9.5L5 6L10.5 7.5L12 2Z" fill="currentColor" />
      <path d="M19 16L19.8 18.2L22 19L19.8 19.8L19 22L18.2 19.8L16 19L18.2 18.2L19 16Z" fill="currentColor" />
    </template>

    <template v-else-if="icon === 'palette'">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none" />
      <circle cx="8" cy="10" r="1.5" fill="currentColor" />
      <circle cx="12" cy="7" r="1.5" fill="currentColor" />
      <circle cx="16" cy="10" r="1.5" fill="currentColor" />
      <circle cx="9" cy="15" r="1.5" fill="currentColor" />
    </template>
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  icon: string;
  size?: number;
  label?: string;
}>(), {
  size: 24,
});
</script>
