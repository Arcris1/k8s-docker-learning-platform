<script setup lang="ts">
defineProps<{
  headers: string[]
  rows: string[][]
  title?: string
}>()
</script>

<template>
  <div class="my-6 rounded-lg border border-slate-800 overflow-hidden">
    <div v-if="title" class="px-4 py-2 bg-slate-800/50 border-b border-slate-800">
      <span class="text-sm font-medium text-slate-300">{{ title }}</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-slate-800/50">
            <th
              v-for="header in headers"
              :key="header"
              class="px-4 py-3 text-left font-semibold text-slate-200 border-b border-slate-700"
            >
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="i"
            class="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
          >
            <td
              v-for="(cell, j) in row"
              :key="j"
              class="px-4 py-2.5 text-slate-300"
              :class="j === 0 ? 'font-medium text-slate-200' : ''"
            >
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
