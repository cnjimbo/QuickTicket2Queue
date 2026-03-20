<script setup lang="ts">
import { useAsyncState, useEventListener } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useTicketStore } from '@render/stores/ticket'
import { getDraftLeaveDecision } from '@render/utils/draft-leave-confirm'

const router = useRouter()
const route = useRoute()
const ticketStore = useTicketStore()
const { hasUnsavedDraftChanges } = storeToRefs(ticketStore)
const showTopToolbar = ref(import.meta.env.DEV)
const devUrlInput = ref('')
const skipBeforeUnloadPrompt = ref(false)
const isCheckingForUpdates = ref(false)
const isDownloadingUpdate = ref(false)
const downloadProgressPercent = ref(0)
const isLoadingUpdatePreferences = ref(false)
const isSavingUpdatePreferences = ref(false)
const isLoadingDowngradeVersions = ref(false)
const isPreparingVersionUpdate = ref(false)
const includeBetaUpdates = ref(false)
const allowDowngradeUpdates = ref(true)
const allowAllVersionsUpdates = ref(false)
const currentVersion = ref('')
const downgradeVersionOptions = ref<Array<{
  version: string;
  releaseUrl: string;
  channel: 'stable' | 'alpha' | 'beta' | 'rc';
}>>([])
const selectedDowngradeVersion = ref('')
const hasShownDowngradeLoadMessage = ref(false)
let stopRouteSync: (() => void) | undefined
let stopTopToolbarSync: (() => void) | undefined
let stopAppCloseSync: (() => void) | undefined
let stopDownloadProgressSync: (() => void) | undefined
const { execute: executeRespondToAppCloseRequest } = useAsyncState(
  (shouldClose: boolean) => window.electron.respondToAppCloseRequest(shouldClose),
  false,
  { immediate: false, resetOnExecute: false },
)

const shouldPromptDraftSave = computed(() => hasUnsavedDraftChanges.value)

function syncDevUrlInput() {
  devUrlInput.value = window.location.href
}

function focusDevUrlInput() {
  const input = document.getElementById('dev-url-input') as HTMLInputElement | null
  if (!input) return

  input.focus()
  input.select()
}

function getNavigableUrl(rawValue: string): URL {
  const value = rawValue.trim()
  return new URL(value, window.location.origin)
}

function navigateByDevUrlInput() {
  const rawValue = devUrlInput.value.trim()
  if (!rawValue) return

  try {
    const url = getNavigableUrl(rawValue)
    if (url.origin !== window.location.origin) {
      window.location.assign(url.href)
      return
    }

    const targetPath = `${url.pathname}${url.search}${url.hash}`
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`

    if (targetPath === currentPath) {
      window.location.reload()
      return
    }

    router.push(targetPath)
  } catch {
    const fallbackPath = rawValue.startsWith('/') ? rawValue : `/${rawValue}`
    router.push(fallbackPath)
  }
}

function goBack() {
  window.history.back()
}

function goForward() {
  window.history.forward()
}

function reloadPage() {
  window.location.reload()
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (!showTopToolbar.value) return

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
    event.preventDefault()
    focusDevUrlInput()
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (skipBeforeUnloadPrompt.value || !shouldPromptDraftSave.value) return

  event.preventDefault()
  event.returnValue = ''
}

async function promptAndOpenReleasePage(releaseUrl?: string) {
  if (!releaseUrl) return

  const response = await window.electron.showNativeDialog({
    title: '打开 GitHub Releases',
    message: '是否打开 GitHub Releases 页面？',
    buttons: ['打开', '取消'],
    type: 'info',
    defaultId: 0,
    cancelId: 1,
  })

  if (response === 0) {
    await window.electron.openLink(releaseUrl)
  }
}

async function promptInstallDownloadedUpdate(version?: string) {
  const response = await window.electron.showNativeDialog({
    title: '更新已下载',
    message: version ? `版本 ${version} 已下载完成，是否立即重启安装？` : '更新已下载完成，是否立即重启安装？',
    buttons: ['立即安装', '稍后'],
    type: 'info',
    defaultId: 0,
    cancelId: 1,
  })

  if (response === 0) {
    await window.electron.installDownloadedAppUpdate()
  }
}

async function downloadAvailableUpdate() {
  if (isDownloadingUpdate.value) return

  isDownloadingUpdate.value = true
  downloadProgressPercent.value = 0
  try {
    const result = await window.electron.downloadAppUpdate()

    if (result.status === 'downloaded') {
      await promptInstallDownloadedUpdate(result.version)
      return
    }

    if (result.status === 'portable') {
      await promptAndOpenReleasePage(result.releaseUrl)
      return
    }

    if (result.status === 'error') {
      await window.electron.showNativeDialog({
        title: '下载更新失败',
        message: result.message ?? '下载更新时发生未知错误。',
        buttons: ['确定'],
        type: 'error',
      })
      return
    }

    await window.electron.showNativeDialog({
      title: '无需下载',
      message: '当前没有可下载的更新。',
      buttons: ['确定'],
      type: 'info',
    })
  } finally {
    isDownloadingUpdate.value = false
  }
}

async function handleCheckForUpdates() {
  if (isCheckingForUpdates.value || isDownloadingUpdate.value) return

  isCheckingForUpdates.value = true
  try {
    const result = await window.electron.checkForAppUpdates()

    if (result.status === 'disabled') {
      await window.electron.showNativeDialog({
        title: '自动更新不可用',
        message: result.message ?? '当前环境不支持自动更新。',
        buttons: ['确定'],
        type: 'info',
      })
      return
    }

    if (result.status === 'up-to-date') {
      await window.electron.showNativeDialog({
        title: '已是最新版本',
        message: result.version ? `当前版本 ${result.version} 已是最新版本。` : '当前已是最新版本。',
        buttons: ['确定'],
        type: 'info',
      })
      return
    }

    if (result.status === 'downloaded') {
      await promptInstallDownloadedUpdate(result.version)
      return
    }

    if (result.status === 'portable') {
      const response = await window.electron.showNativeDialog({
        title: '发现新版本',
        message: result.version ? `发现新版本 ${result.version}。便携版不支持应用内下载。` : '发现新版本。便携版不支持应用内下载。',
        buttons: ['打开 GitHub Releases', '取消'],
        type: 'info',
        defaultId: 0,
        cancelId: 1,
      })

      if (response === 0 && result.releaseUrl) {
        await window.electron.openLink(result.releaseUrl)
      }
      return
    }

    if (result.status === 'update-available') {
      const response = await window.electron.showNativeDialog({
        title: '发现新版本',
        message: result.version ? `发现新版本 ${result.version}，是否立即下载？` : '发现新版本，是否立即下载？',
        buttons: ['下载更新', '稍后'],
        type: 'info',
        defaultId: 0,
        cancelId: 1,
      })

      if (response === 0) {
        await downloadAvailableUpdate()
      }
      return
    }

    await window.electron.showNativeDialog({
      title: '检查更新失败',
      message: result.message ?? '检查更新时发生未知错误。',
      buttons: ['打开 GitHub Releases', '关闭'],
      type: 'warning',
      defaultId: 0,
      cancelId: 1,
    }).then(async (response) => {
      if (response === 0 && result.releaseUrl) {
        await window.electron.openLink(result.releaseUrl)
      }
    })
  } finally {
    isCheckingForUpdates.value = false
  }
}

async function loadUpdatePreferences() {
  isLoadingUpdatePreferences.value = true
  try {
    const preferences = await window.electron.getUpdatePreferences()
    includeBetaUpdates.value = preferences.includeBeta
    allowDowngradeUpdates.value = preferences.allowDowngrade
    allowAllVersionsUpdates.value = preferences.allowAllVersions
  } catch {
    includeBetaUpdates.value = false
    allowDowngradeUpdates.value = true
    allowAllVersionsUpdates.value = false
  } finally {
    isLoadingUpdatePreferences.value = false
  }
}

async function handleIncludeBetaPreferenceChange(value: string | number | boolean) {
  if (isSavingUpdatePreferences.value) return

  const nextValue = Boolean(value)
  const previousValue = includeBetaUpdates.value
  isSavingUpdatePreferences.value = true
  try {
    const preferences = await window.electron.setUpdatePreferences({
      includeBeta: nextValue,
      allowDowngrade: allowDowngradeUpdates.value,
      allowAllVersions: allowAllVersionsUpdates.value,
    })
    includeBetaUpdates.value = preferences.includeBeta
    allowDowngradeUpdates.value = preferences.allowDowngrade
    allowAllVersionsUpdates.value = preferences.allowAllVersions
  } catch {
    includeBetaUpdates.value = previousValue
    await window.electron.showNativeDialog({
      title: '保存更新设置失败',
      message: '保存“接收RC版更新”设置失败，请稍后重试。',
      buttons: ['确定'],
      type: 'error',
    })
  } finally {
    isSavingUpdatePreferences.value = false
  }

  await loadDowngradeVersionOptions()
}

async function handleAllowDowngradePreferenceChange(value: string | number | boolean) {
  if (isSavingUpdatePreferences.value) return

  const nextValue = Boolean(value)
  const previousValue = allowDowngradeUpdates.value
  isSavingUpdatePreferences.value = true
  try {
    const preferences = await window.electron.setUpdatePreferences({
      includeBeta: includeBetaUpdates.value,
      allowDowngrade: nextValue,
      allowAllVersions: allowAllVersionsUpdates.value,
    })
    includeBetaUpdates.value = preferences.includeBeta
    allowDowngradeUpdates.value = preferences.allowDowngrade
    allowAllVersionsUpdates.value = preferences.allowAllVersions
  } catch {
    allowDowngradeUpdates.value = previousValue
    await window.electron.showNativeDialog({
      title: '保存更新设置失败',
      message: '保存“允许向下更新”设置失败，请稍后重试。',
      buttons: ['确定'],
      type: 'error',
    })
  } finally {
    isSavingUpdatePreferences.value = false
  }

  await loadDowngradeVersionOptions()
}

async function handleConsoleTitleDoubleClick() {
  if (isSavingUpdatePreferences.value) return

  const nextValue = !allowAllVersionsUpdates.value
  isSavingUpdatePreferences.value = true
  try {
    const preferences = await window.electron.setUpdatePreferences({
      includeBeta: nextValue ? true : includeBetaUpdates.value,
      allowDowngrade: nextValue ? true : allowDowngradeUpdates.value,
      allowAllVersions: nextValue,
    })
    includeBetaUpdates.value = preferences.includeBeta
    allowDowngradeUpdates.value = preferences.allowDowngrade
    allowAllVersionsUpdates.value = preferences.allowAllVersions

    await window.electron.showNativeDialog({
      title: '自动更新模式切换',
      message: nextValue
        ? '已开启全版本更新模式：可接收稳定版与 alpha/beta/rc，并允许向下更新。'
        : '已关闭全版本更新模式，恢复常规更新策略。',
      buttons: ['确定'],
      type: 'info',
    })
  } catch {
    await window.electron.showNativeDialog({
      title: '保存更新设置失败',
      message: '切换全版本更新模式失败，请稍后重试。',
      buttons: ['确定'],
      type: 'error',
    })
  } finally {
    isSavingUpdatePreferences.value = false
  }

  await loadDowngradeVersionOptions()
}

async function loadDowngradeVersionOptions() {
  if (!allowDowngradeUpdates.value) {
    downgradeVersionOptions.value = []
    selectedDowngradeVersion.value = ''
    isLoadingDowngradeVersions.value = false
    return
  }

  isLoadingDowngradeVersions.value = true
  try {
    const result = await window.electron.getDowngradeVersionOptions()
    downgradeVersionOptions.value = result.versions

    if (!result.versions.some(item => item.version === selectedDowngradeVersion.value)) {
      selectedDowngradeVersion.value = result.versions[0]?.version ?? ''
    }

    if (result.message && result.versions.length === 0 && !hasShownDowngradeLoadMessage.value) {
      hasShownDowngradeLoadMessage.value = true
      await window.electron.showNativeDialog({
        title: '降级版本列表',
        message: result.message,
        buttons: ['确定'],
        type: 'info',
      })
    }
  } catch {
    downgradeVersionOptions.value = []
    selectedDowngradeVersion.value = ''
  } finally {
    isLoadingDowngradeVersions.value = false
  }
}

async function handleUpdateToSelectedVersion() {
  if (isPreparingVersionUpdate.value) return
  if (!selectedDowngradeVersion.value) {
    await window.electron.showNativeDialog({
      title: '请选择版本',
      message: '请先选择需要更新到的目标版本。',
      buttons: ['确定'],
      type: 'info',
    })
    return
  }

  isPreparingVersionUpdate.value = true
  try {
    const result = await window.electron.prepareUpdateToVersion(selectedDowngradeVersion.value)

    if (result.status === 'ready' && result.releaseUrl) {
      const response = await window.electron.showNativeDialog({
        title: '按版本更新',
        message: `将打开版本 ${result.targetVersion ?? selectedDowngradeVersion.value} 的发布页进行更新，是否继续？`,
        buttons: ['继续', '取消'],
        type: 'question',
        defaultId: 0,
        cancelId: 1,
      })

      if (response === 0) {
        await window.electron.openLink(result.releaseUrl)
      }
      return
    }

    await window.electron.showNativeDialog({
      title: '按版本更新不可用',
      message: result.message ?? '当前无法更新到所选版本。',
      buttons: ['确定'],
      type: result.status === 'error' ? 'error' : 'warning',
    })
  } finally {
    isPreparingVersionUpdate.value = false
  }
}

async function handleAppCloseRequested() {
  const decision = await getDraftLeaveDecision({
    actionLabel: '退出程序',
    shouldPrompt: shouldPromptDraftSave.value,
    onSave: async () => {
      ticketStore.saveTicketDraft()
      ticketStore.refreshDraftBaseline()
    },
  })
  if (decision !== 'allow') {
    await executeRespondToAppCloseRequest(0, false)
    return
  }

  skipBeforeUnloadPrompt.value = true
  await executeRespondToAppCloseRequest(0, true)
}

onMounted(() => {
  syncDevUrlInput()
  stopRouteSync = router.afterEach(() => {
    syncDevUrlInput()
  })

  void window.electron.getAppVersion().then((version) => {
    currentVersion.value = version
  }).catch(() => {
    currentVersion.value = ''
  })

  void loadUpdatePreferences()
  void loadDowngradeVersionOptions()

  stopTopToolbarSync = window.electron.onTopToolbarVisibilityChanged((visible) => {
    showTopToolbar.value = visible
    if (visible) {
      syncDevUrlInput()
    }
  })
  stopDownloadProgressSync = window.electron.onAppUpdateDownloadProgress((progress) => {
    const next = Math.max(0, Math.min(100, Number(progress.percent) || 0))
    downloadProgressPercent.value = next
  })
  stopAppCloseSync = window.electron.onAppCloseRequested(handleAppCloseRequested)
})

useEventListener(window, 'popstate', syncDevUrlInput)
useEventListener(window, 'keydown', handleGlobalKeydown)
useEventListener(window, 'beforeunload', handleBeforeUnload)

onBeforeUnmount(() => {
  stopRouteSync?.()
  stopTopToolbarSync?.()
  stopDownloadProgressSync?.()
  stopAppCloseSync?.()
  skipBeforeUnloadPrompt.value = false
})



// 动态从路由中生成 navLinks，过滤掉重定向路由（如 '/'），并根据 meta.order 排序
// 使用路由名称作为 key 以确保稳定的组件更新
const navLinks = computed(() => {
  return router.getRoutes()
    .filter(r => r.path !== '/' && r.meta?.label)
    .map(r => ({
      to: r.path,
      meta: r.meta
    }))
    .sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
})
</script>

<template>
<div class="app-root">
  <div v-if="showTopToolbar" class="dev-urlbar">
    <button type="button" class="dev-urlbar__btn" @click="goBack">Back</button>
    <button type="button" class="dev-urlbar__btn" @click="goForward">Forward</button>
    <button type="button" class="dev-urlbar__btn" @click="reloadPage">Reload</button>
    <input id="dev-url-input" v-model="devUrlInput" class="dev-urlbar__input" type="text" spellcheck="false"
      autocomplete="off" @keydown.enter="navigateByDevUrlInput">
    <button type="button" class="dev-urlbar__btn is-primary" @click="navigateByDevUrlInput">Go</button>
  </div>

  <div class="app-shell">
    <aside class="nav-panel">
      <div class="nav-brand">
        <p class="eyebrow">Quick Ticket to Queue</p>
        <h1 @dblclick="handleConsoleTitleDoubleClick">控制台</h1>
        <p class="nav-subtitle">常用队列、凭据配置与工单提交入口</p>
      </div>
      <nav class="nav-links">
        <template v-for="link in navLinks" :key="link.to">
          <RouterLink :to="link.to" class="nav-link" :class="{ 'is-active': route.path.startsWith(link.to) }">
            <span class="nav-link__label">{{ link.meta.label }}</span>
            <span class="nav-link__desc">{{ link.meta.description }}</span>
          </RouterLink>
          <button v-if="link.to.includes('/help')" type="button" class="update-action"
            :disabled="isCheckingForUpdates || isDownloadingUpdate" @click="handleCheckForUpdates">
            {{ isDownloadingUpdate ? '下载更新中...' : isCheckingForUpdates ? '检查更新中...' : '检查更新' }}
          </button>
          <div v-if="link.to.includes('/help')" class="update-version">当前版本 {{ currentVersion || '-' }}</div>
          <div v-if="link.to.includes('/help')" class="update-beta-toggle">
            <span class="update-beta-toggle__label">接收RC版更新</span>
            <el-switch :model-value="includeBetaUpdates" size="small"
              :loading="isLoadingUpdatePreferences || isSavingUpdatePreferences" inline-prompt active-text="开"
              inactive-text="关" @change="handleIncludeBetaPreferenceChange" />
          </div>
          <div v-if="link.to.includes('/help')" class="update-beta-toggle">
            <span class="update-beta-toggle__label">允许向下更新</span>
            <el-switch :model-value="allowDowngradeUpdates" size="small"
              :loading="isLoadingUpdatePreferences || isSavingUpdatePreferences" inline-prompt active-text="开"
              inactive-text="关" @change="handleAllowDowngradePreferenceChange" />
          </div>
          <div v-if="link.to.includes('/help') && allowDowngradeUpdates" class="update-version-selector">
            <el-select v-model="selectedDowngradeVersion" placeholder="选择降级版本" size="small"
              :loading="isLoadingDowngradeVersions"
              :disabled="isLoadingDowngradeVersions || isPreparingVersionUpdate || downgradeVersionOptions.length === 0"
              style="width: 100%;">
              <el-option v-for="item in downgradeVersionOptions" :key="item.version"
                :label="`${item.version} (${item.channel})`" :value="item.version" />
            </el-select>
            <button type="button" class="update-action"
              :disabled="isLoadingDowngradeVersions || isPreparingVersionUpdate || !selectedDowngradeVersion"
              @click="handleUpdateToSelectedVersion">
              {{ isPreparingVersionUpdate ? '准备更新中...' : '更新到所选版本' }}
            </button>
          </div>
        </template>
      </nav>
    </aside>

    <section class="display-panel">
      <div class="display-body">
        <RouterView v-slot="{ Component }">
          <component v-if="Component" :is="Component" class="display-component" />
          <div v-else class="empty-state">
            <h3>欢迎使用 Quick Ticket to Queue</h3>
            <p>请选择左侧功能开始提交工单或维护配置。</p>
          </div>
        </RouterView>
      </div>
    </section>
  </div>

  <div v-if="isDownloadingUpdate" class="update-progress-line" role="progressbar" aria-label="下载更新进度" :aria-valuemin="0"
    :aria-valuemax="100" :aria-valuenow="Math.round(downloadProgressPercent)">
    <div class="update-progress-line__bar" :style="{ width: `${downloadProgressPercent}%` }" />
  </div>
</div>
</template>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
  background: #050915;
  color: #e2e8f0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.app-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.update-progress-line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgba(56, 189, 248, 0.22);
  z-index: 20;
}

.update-progress-line__bar {
  height: 100%;
  background: linear-gradient(90deg, #22d3ee 0%, #38bdf8 50%, #60a5fa 100%);
  transition: width 0.18s ease;
}

.dev-urlbar {
  height: 50px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #1f2937;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  overflow: hidden;
}

.dev-urlbar__btn {
  height: 34px;
  min-width: 68px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  background: #111827;
  color: #f8fafc;
  cursor: pointer;
}

.dev-urlbar__btn.is-primary {
  background: #0284c7;
  border-color: #38bdf8;
}

.dev-urlbar__input {
  flex: 1;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  background: #0b1220;
  color: #f8fafc;
  padding: 0 12px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
}

.dev-urlbar__input:focus {
  outline: none;
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.app-shell {
  flex: 1;
  display: grid;
  grid-template-columns: 180px 1fr;
  height: auto;
  width: 100%;
  min-height: 0;
}

.nav-panel {
  background: linear-gradient(180deg, #0f172a 0%, #111827 70%);
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 0;
  overflow: auto;
}

.nav-brand h1 {
  margin: 6px 0 2px;
  font-size: 22px;
  color: #ffffff;
}

.nav-subtitle {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
}

.update-action {
  margin-top: 12px;
  width: 100%;
  height: 38px;
  border: 1px solid rgba(56, 189, 248, 0.45);
  border-radius: 12px;
  background: rgba(56, 189, 248, 0.14);
  color: #e0f2fe;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.update-action:disabled {
  cursor: wait;
  opacity: 0.7;
}

.update-version {
  margin-top: -2px;
  margin-bottom: 4px;
  padding: 0 4px;
  font-size: 12px;
  color: #94a3b8;
}

.update-beta-toggle {
  margin-top: -2px;
  margin-bottom: 8px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.update-beta-toggle__label {
  font-size: 12px;
  color: #94a3b8;
}

.update-version-selector {
  margin-top: -2px;
  margin-bottom: 8px;
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 11px;
  color: #94a3b8;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-link {
  border-radius: 14px;
  padding: 10px;
  text-decoration: none;
  color: #d9e3ff;
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.2s ease;
}

.nav-link__label {
  font-weight: 600;
  font-size: 15px;
}

.nav-link__desc {
  font-size: 12px;
  color: #94a3b8;
}

.nav-link:hover {
  transform: translateX(4px);
  border-color: rgba(56, 189, 248, 0.7);
}

.nav-link.is-active {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
  box-shadow: 0 15px 40px rgba(8, 47, 73, 0.45);
}

.display-panel {
  background: #f5f7fb;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

.display-header {
  background: #ffffff;
  padding: 3px;
  border-radius: 18px;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.1);
  color: #0f172a;
}

.display-header .lede {
  margin-top: 8px;
  color: #475569;
}

.display-body {
  flex: 1;
  background: #ffffff;
  border-radius: 24px;
  padding: 18px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.08);
  min-height: 0;
  overflow: auto;
}

.display-component {
  min-height: 0;
  height: 100%;
}

.empty-state {
  text-align: center;
  color: #475569;
  padding: 64px 16px;
}

.empty-state h3 {
  margin-bottom: 12px;
  color: #0f172a;
  font-size: 24px;
}

@media (max-width: 960px) {
  .dev-urlbar {
    height: auto;
    flex-wrap: wrap;
  }

  .dev-urlbar__btn {
    min-width: 60px;
  }

  .dev-urlbar__input {
    min-width: 240px;
  }

  .app-shell {
    grid-template-columns: 1fr;
  }

  .nav-panel {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}
</style>