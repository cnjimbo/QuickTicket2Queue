import { createWebHashHistory } from "vue-router";
// import { experimental_createRouter as createRouter } from 'vue-router/experimental'
// import { resolver, handleHotUpdate } from 'vue-router/auto-resolver'

import { createRouter } from "vue-router";
import { routes, handleHotUpdate } from "vue-router/auto-routes";
import type { RouteRecordRaw } from "vue-router";
import { memo } from "radash";

const safeRoutes = routes.filter(
  (route): route is RouteRecordRaw =>
    Boolean(route && typeof route === "object" && "path" in route),
);

export const router = createRouter({
  history: createWebHashHistory(),
  // resolver,
  routes: safeRoutes,
});

const resolveDefaultTicketPath = memo(async () => {
  try {
    const isDomainEnvironment = await window.electron.isDomainEnvironment();
    return isDomainEnvironment ? "/ticket/internal" : "/ticket/external";
  } catch {
    return "/ticket/external";
  }
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