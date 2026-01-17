import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "./",
  srcDir: "docs",
  title: "Ticket",
  description: "Ticket",
  vite: {
    configFile: "./vite.config.ts",
  },
})
