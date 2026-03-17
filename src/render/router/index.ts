import { createWebHistory } from "vue-router";
// import { experimental_createRouter as createRouter } from 'vue-router/experimental'
// import { resolver, handleHotUpdate } from 'vue-router/auto-resolver'
import { createRouter } from "vue-router";
import { routes, handleHotUpdate } from "vue-router/auto-routes";
import type { RouteRecordRaw } from "vue-router";

const safeRoutes = routes.filter(
  (route): route is RouteRecordRaw =>
    Boolean(route && typeof route === "object" && "path" in route),
);

export const router = createRouter({
  history: createWebHistory(),
  // resolver,
  routes: safeRoutes,
});

router.beforeEach((to) => {
  if (to.path === "/") {
    return { path: "/ticket/ticket", query: to.query };
  }

  return true;
});

if (import.meta.hot) {
  handleHotUpdate(router);
}
