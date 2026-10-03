<template>
  <section
    data-testid="feed-status"
    class="mb-6 rounded-2xl border p-4"
    :class="
      status.tone === 'warning' || status.tone === 'error'
        ? 'border-amber-300 bg-amber-50 text-amber-950'
        : 'border-slate-200 bg-white text-slate-700'
    "
    role="status"
    aria-live="polite"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="font-bold">{{ status.title }}</h2>
        <p class="mt-1 text-sm">{{ status.message }}</p>
        <p v-if="status.updated" class="mt-2 text-xs">
          {{
            sourceStatuses.length
              ? 'Consulta más reciente'
              : 'Consulta de fuente'
          }}: {{ status.updated }} (Puerto Rico)
        </p>
        <ul v-if="sourceStatuses.length" class="mt-2 space-y-1 text-xs">
          <li v-for="source in sourceStatuses" :key="source.name">
            {{ source.label }}: {{ source.state }}
            <span v-if="source.updated"
              >· {{ source.updated }} (Puerto Rico)</span
            >
          </li>
        </ul>
      </div>
      <button
        type="button"
        class="rounded-xl border border-current px-4 py-2 text-sm font-bold disabled:cursor-wait disabled:opacity-50"
        :disabled="pending"
        @click="!pending && emit('retry')"
      >
        {{
          pending
            ? 'Actualizando…'
            : status.tone === 'success'
              ? 'Actualizar'
              : 'Reintentar'
        }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  getFeedStatus,
  getFeedSourceStatuses,
  type PublicFeedMetadata,
} from '../utils/feedStatus'

const props = defineProps<{
  metadata?: PublicFeedMetadata | null
  pending?: boolean
  error?: boolean
  hasData?: boolean
}>()
const emit = defineEmits<{ retry: [] }>()
const status = computed(() => getFeedStatus(props.metadata, props))
const sourceStatuses = computed(() => getFeedSourceStatuses(props.metadata))
</script>
