// https://vitepress.dev/guide/custom-theme
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import AppContainer from './components/AppContainer.vue'
import Desc from './components/Desc.vue'
import DocFooter from './components/DocFooter.vue'
import HomePage from './components/HomePage.vue'
import './style.css'
import 'element-plus/theme-chalk/index.css'
export default {
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      'doc-top': () => [
        h(Desc, { description: 'doc-top' }),
      ],
      'doc-footer-before': () => [
        h(Desc, { description: 'doc-footer-before' }),
        h(DocFooter),
      ],
      'nav-bar-content-after': () => [
        h(Desc, { description: 'nav-bar-content-after' }),
        // h(Share),
      ],
      'nav-screen-content-after': () => [
        h(Desc, { description: 'nav-screen-content-after' }),
      ],
    })
  },
  enhanceApp({ app, router, siteData }) {
    // ...
    app.component('HomePage', HomePage)
    app.component('DocFooter', DocFooter)
    app.component('AppContainer', AppContainer)
    app.component('Desc', Desc)
  }
} satisfies Theme

