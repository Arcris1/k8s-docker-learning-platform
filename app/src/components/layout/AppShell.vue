<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
import { useKeyboardShortcuts } from '../../composables/useKeyboardShortcuts'

const sidebarCollapsed = ref(false)

useKeyboardShortcuts({
  toggleSidebar: () => { sidebarCollapsed.value = !sidebarCollapsed.value },
})
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <Sidebar :collapsed="sidebarCollapsed" />
    <div class="flex-1 flex flex-col overflow-hidden">
      <TopBar @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" />
      <main class="flex-1 overflow-y-auto">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style>
@reference "../../styles/main.css";

.fade-enter-active,
.fade-leave-active {
  @apply transition-opacity duration-150;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
