<script setup lang="ts">
const props = defineProps<{
  description: string
}>()
</script>

<template>
  <div bg="zinc-100 dark:zinc-800" flex="~ items-center" w-full rounded-xl p-4 >
     
    {{ props.description }}
  </div>
</template>
