<template>
  <svg
    :class="className"
    viewBox="0 0 40 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M20 2c1.8 3.2 2.4 5.6 1.6 7.2-.6 1.2-1.8 1.8-3.4 1.6 1.4 1.8 1.6 3.4.4 4.4-1 .8-2.4.6-3.8-.6C16.4 16.8 18 18 20 18c2 0 3.6-1.2 5.2-3.4-1.4 1.2-2.8 1.4-3.8.6-1.2-1-.8-2.6.4-4.4-1.6.2-2.8-.4-3.4-1.6C17.6 7.6 18.2 5.2 20 2Z"
      fill="currentColor"
      opacity="0.9"
    />
    <path
      d="M20 16c6.6 0 12 7.2 12 16.2C32 41.4 26.6 46 20 46S8 41.4 8 32.2C8 23.2 13.4 16 20 16Z"
      fill="currentColor"
    />
    <path
      d="M14 24.5c2.2 1.8 4.2 2.7 6 2.7s3.8-.9 6-2.7M13 31c2.6 2 4.8 3 7 3s4.4-1 7-3M14.5 37c2 1.4 3.7 2.1 5.5 2.1s3.5-.7 5.5-2.1"
      stroke="var(--color-cream)"
      stroke-width="1.4"
      stroke-linecap="round"
      opacity="0.55"
    />
  </svg>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    className?: string
  }>(),
  {
    className: 'h-8 w-7',
  }
)
</script>
