<script setup lang="ts">
withDefaults(defineProps<{
  icon: string;
  size?: number | string;
  label?: string;
}>(), {
  size: 24,
});
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :aria-label="label || undefined"
    :aria-hidden="!label"
  >
    <line v-if="icon === 'close'" x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <line v-if="icon === 'close'" x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />

    <line v-if="icon === 'plus'" x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <line v-if="icon === 'plus'" x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />

    <line v-if="icon === 'menu'" x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <line v-if="icon === 'menu'" x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <line v-if="icon === 'menu'" x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />

    <path v-if="icon === 'send'" d="M3 20L22 12L3 4V10L16 12L3 14V20Z" fill="currentColor" />

    <rect v-if="icon === 'stop'" x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />

    <rect v-if="icon === 'video'" x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" stroke-width="2" fill="none" />
    <path v-if="icon === 'video'" d="M16 10L21 7V17L16 14V10Z" fill="currentColor" />

    <polyline v-if="icon === 'chevron-down'" points="6,9 12,15 18,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />

    <polyline v-if="icon === 'chevron-up'" points="6,15 12,9 18,15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />

    <polyline v-if="icon === 'chevron-right'" points="9,6 15,12 9,18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />

    <rect v-if="icon === 'copy'" x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="2" fill="none" />
    <path v-if="icon === 'copy'" d="M5 15V5C5 3.9 5.9 3 7 3H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />

    <polyline v-if="icon === 'check'" points="4,12 9,17 20,6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />

    <circle v-if="icon === 'user'" cx="12" cy="8" r="4" fill="currentColor" />
    <path v-if="icon === 'user'" d="M4 21C4 17.13 7.58 14 12 14C16.42 14 20 17.13 20 21" fill="currentColor" />

    <rect v-if="icon === 'bot'" x="4" y="7" width="16" height="12" rx="3" stroke="currentColor" stroke-width="2" fill="none" />
    <circle v-if="icon === 'bot'" cx="9" cy="13" r="1.5" fill="currentColor" />
    <circle v-if="icon === 'bot'" cx="15" cy="13" r="1.5" fill="currentColor" />
    <line v-if="icon === 'bot'" x1="12" y1="7" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <circle v-if="icon === 'bot'" cx="12" cy="2" r="1" fill="currentColor" />

    <path v-if="icon === 'chat'" d="M5 5.5C5 4.12 6.12 3 7.5 3H16.5C17.88 3 19 4.12 19 5.5V12.5C19 13.88 17.88 15 16.5 15H10.2L5.8 19.2C5.47 19.52 5 19.28 5 18.83V5.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none" />
    <path v-if="icon === 'chat'" d="M8.5 8H15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <path v-if="icon === 'chat'" d="M8.5 11H13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />

    <path v-if="icon === 'logout'" d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
    <polyline v-if="icon === 'logout'" points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <line v-if="icon === 'logout'" x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />

    <path v-if="icon === 'sparkles'" d="M12 2L13.5 7.5L19 6L14.5 9.5L18 14L12.5 11.5L12 17L11.5 11.5L6 14L9.5 9.5L5 6L10.5 7.5L12 2Z" fill="currentColor" />
    <path v-if="icon === 'sparkles'" d="M19 16L19.8 18.2L22 19L19.8 19.8L19 22L18.2 19.8L16 19L18.2 18.2L19 16Z" fill="currentColor" />

    <circle v-if="icon === 'palette'" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none" />
    <circle v-if="icon === 'palette'" cx="8" cy="10" r="1.5" fill="currentColor" />
    <circle v-if="icon === 'palette'" cx="12" cy="7" r="1.5" fill="currentColor" />
    <circle v-if="icon === 'palette'" cx="16" cy="10" r="1.5" fill="currentColor" />
    <circle v-if="icon === 'palette'" cx="9" cy="15" r="1.5" fill="currentColor" />

    <path v-if="icon === 'external-link'" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <polyline v-if="icon === 'external-link'" points="15 3 21 3 21 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <line v-if="icon === 'external-link'" x1="10" y1="14" x2="21" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />

    <rect v-if="icon === 'image'" x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none" />
    <circle v-if="icon === 'image'" cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <polyline v-if="icon === 'image'" points="21 15 16 10 5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </svg>
</template>
