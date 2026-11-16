'use client';

import { useEffect } from 'react';
import type { NavKey } from './components';

export default function NavigationActiveState({ active }: { active?: NavKey }) {
  useEffect(() => {
    const update = () => {
      const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
      const currentChannel = new URLSearchParams(window.location.search).get('channel') || '';
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.site-header .nav a, .drawer .drawer-links a'));
      const activeParents = new Set<HTMLElement>();

      const linkStates = links.map((link) => {
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
        return { link, channelSlug, matchesChannel, matchesPath, isPathAncestor };
      });

      /* 页面已有精确路径匹配时，不再用父路径激活，避免 /business/innovation 同时点亮 /business */
      const hasExactPathMatch = linkStates.some((state) => state.matchesPath);

      linkStates.forEach(({ link, channelSlug, matchesChannel, matchesPath, isPathAncestor }) => {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
        link.closest<HTMLElement>('.nav-item')?.classList.remove('is-active');

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
        } else if (isPathAncestor && !hasExactPathMatch) {
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

  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('.site-header .nav[data-nav-tree-source="api"] > .nav-item--dropdown'));
    const cleanups = items.map((item, index) => {
      const trigger = item.querySelector<HTMLAnchorElement>(':scope > a');
      const panel = item.querySelector<HTMLElement>(':scope > .nav-dropdown');
      if (!trigger || !panel) return () => {};
      panel.id ||= `site-nav-submenu-${index}`;
      trigger.setAttribute('aria-controls', panel.id);
      let hovered = item.matches(':hover');
      const apply = (open: boolean) => {
        item.classList.toggle('is-open', open);
        trigger.setAttribute('aria-expanded', String(open));
        panel.inert = !open;
      };
      const open = () => {
        item.classList.remove('is-dismissed');
        apply(true);
      };
      const onEnter = () => { hovered = true; open(); };
      const onLeave = () => {
        hovered = false;
        if (!item.classList.contains('is-dismissed')) apply(item.contains(document.activeElement));
      };
      const onFocusIn = () => {
        if (!item.classList.contains('is-dismissed')) open();
      };
      const onFocusOut = (event: FocusEvent) => {
        if (event.relatedTarget instanceof Node && item.contains(event.relatedTarget)) return;
        item.classList.remove('is-dismissed');
        apply(hovered);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          item.classList.add('is-dismissed');
          apply(false);
          trigger.focus();
        } else if (event.key === 'ArrowDown' && event.target === trigger) {
          event.preventDefault();
          open();
          panel.querySelector<HTMLAnchorElement>('a[href]')?.focus();
        }
      };
      apply(hovered || item.contains(document.activeElement));
      item.addEventListener('mouseenter', onEnter);
      item.addEventListener('mouseleave', onLeave);
      item.addEventListener('focusin', onFocusIn);
      item.addEventListener('focusout', onFocusOut);
      item.addEventListener('keydown', onKeyDown);
      return () => {
        item.removeEventListener('mouseenter', onEnter);
        item.removeEventListener('mouseleave', onLeave);
        item.removeEventListener('focusin', onFocusIn);
        item.removeEventListener('focusout', onFocusOut);
        item.removeEventListener('keydown', onKeyDown);
        item.classList.remove('is-open', 'is-dismissed');
        panel.inert = false;
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return null;
}
