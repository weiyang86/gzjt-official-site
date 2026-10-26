'use client';

import { useEffect } from 'react';
import type { NavKey } from './components';

export default function NavigationActiveState({ active }: { active?: NavKey }) {
  useEffect(() => {
    const update = () => {
      const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
      const currentChannel = new URLSearchParams(window.location.search).get('channel') || '';
      const links = document.querySelectorAll<HTMLAnchorElement>('.site-header .nav a, .drawer .drawer-links a');
      const activeParents = new Set<HTMLElement>();

      links.forEach((link) => {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
        link.closest<HTMLElement>('.nav-item')?.classList.remove('is-active');

        const url = new URL(link.href, window.location.origin);
        const channelSlug = link.dataset.channelSlug || url.searchParams.get('channel') || '';
        const linkChannel = url.searchParams.get('channel') || channelSlug;
        const descendantSlugs = (link.dataset.descendantSlugs || '').split(',').filter(Boolean);
        const matchesChannel = Boolean(currentChannel && channelSlug && (currentChannel === channelSlug || descendantSlugs.includes(currentChannel)));
        const matchesPath = url.pathname.replace(/\/+$/, '') === pathname
          && (currentChannel
            ? (!channelSlug && !url.searchParams.get('channel')) || linkChannel === currentChannel
            : !url.searchParams.get('channel') && (!url.hash || url.hash === window.location.hash));
        const isPathAncestor = url.pathname !== '/'
          && !url.hash
          && pathname.startsWith(`${url.pathname.replace(/\/+$/, '')}/`)
          && !url.searchParams.get('channel');

        if (matchesChannel) {
          link.classList.add('is-active');
          if (currentChannel === channelSlug) link.setAttribute('aria-current', 'page');
          const parent = link.closest<HTMLElement>('.nav-item');
          if (parent) activeParents.add(parent);
        } else if (matchesPath) {
          link.classList.add('is-active');
          if (!currentChannel || channelSlug === currentChannel) link.setAttribute('aria-current', 'page');
          const parent = link.closest<HTMLElement>('.nav-item');
          if (parent) activeParents.add(parent);
        } else if (isPathAncestor) {
          link.classList.add('is-active');
          const parent = link.closest<HTMLElement>('.nav-item');
          if (parent) activeParents.add(parent);
        }
      });

      activeParents.forEach((parent) => parent.classList.add('is-active'));

      if (active) {
        document.querySelectorAll<HTMLAnchorElement>(`[data-nav-key="${active}"]`).forEach((link) => {
          link.classList.add('is-active');
          link.closest<HTMLElement>('.nav-item')?.classList.add('is-active');
        });
      }
    };

    update();
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, [active]);

  return null;
}
