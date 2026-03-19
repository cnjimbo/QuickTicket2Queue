import { createWebHashHistory } from "vue-router";
// import { experimental_createRouter as createRouter } from 'vue-router/experimental'
// import { resolver, handleHotUpdate } from 'vue-router/auto-resolver'

import { createRouter } from "vue-router";
import { routes, handleHotUpdate } from "vue-router/auto-routes";
import type { RouteRecordRaw } from "vue-router";
import { resolveDefaultTicketPath } from "@render/utils/default-ticket-path";

const safeRoutes = routes.filter(
  (route): route is RouteRecordRaw =>
    Boolean(route && typeof route === "object" && "path" in route),
);

export const router = createRouter({
  history: createWebHashHistory(),
  // resolver,
  routes: safeRoutes,
});

router.beforeEach(async (to) => {
  const isRootOrUnmatched = to.path === "/" || to.matched.length === 0;

  if (isRootOrUnmatched) {
    return { path: await resolveDefaultTicketPath(), query: to.query };
  }

  return true;
});

if (import.meta.hot) {
  handleHotUpdate(router);
} 