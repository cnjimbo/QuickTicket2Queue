import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import Inspect from 'vite-plugin-inspect'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
    assetsInclude: ['**/*.mov'],
    optimizeDeps: {
        exclude: ['vitepress'],
    },
    plugins: [
        Inspect(),
        Components({
            include: [/\.vue$/, /\.md$/],
            dirs: '.vitepress/theme/components',
            dts: '.vitepress/components.d.ts',
            resolvers: [ElementPlusResolver()],
        }),
        UnoCSS(),
    ],
})
