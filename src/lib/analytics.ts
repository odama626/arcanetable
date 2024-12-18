import googleTagManager from '@analytics/google-tag-manager';
import { useLocation } from '@solidjs/router';
import Analytics from 'analytics';
import { createEffect } from 'solid-js';

export const analytics = Analytics({
  app: 'arcanetable',
  plugins: [googleTagManager({ containerId: import.meta.env.VITE_GOOGLE_TAG_MANAGER_ID })],
});

export function AnalyticsContext(props) {
  const location = useLocation();

  createEffect(() => {
    analytics.page({
      url: globalThis.location.origin + location.pathname,
      path: location.pathname,
      search: location.search,
    });
  });

  return props.children;
}
