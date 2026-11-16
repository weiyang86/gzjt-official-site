'use client';

import { useEffect } from 'react';

/**
 * 首页缺少内容页统一加载的 app.js，移动端菜单按钮没有绑定事件。
 * 这里补齐抽屉的打开/关闭逻辑，行为与内容页保持一致。
 */
export default function MobileNavToggle() {
  useEffect(() => {
    const toggle = document.querySelector<HTMLElement>('[data-menu-toggle]');
    const drawer = document.querySelector<HTMLElement>('[data-drawer]');
    if (!toggle || !drawer) return;
    const panel = drawer.querySelector<HTMLElement>('.drawer-panel');
    const focusable = () => Array.from(drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]'))
      .filter((element) => element.getClientRects().length > 0);
    drawer.inert = true;
    panel?.setAttribute('role', 'dialog');
    panel?.setAttribute('aria-modal', 'true');
    panel?.setAttribute('aria-label', '网站导航');
    drawer.id ||= 'home-navigation-drawer';
    toggle.setAttribute('aria-controls', drawer.id);

    const open = () => {
      drawer.inert = false;
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      focusable()[0]?.focus();
    };
    const close = () => {
      const wasOpen = drawer.classList.contains('is-open');
      if (wasOpen) toggle.focus();
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      drawer.inert = true;
    };
    const onToggle = (event: Event) => {
      event.preventDefault();
      if (drawer.classList.contains('is-open')) close();
      else open();
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (!drawer.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const onLinkClick = (event: Event) => {
      if ((event.target as HTMLElement).closest('a[href]')) close();
    };

    const closers = Array.from(document.querySelectorAll<HTMLElement>('[data-drawer-close]'));
    toggle.addEventListener('click', onToggle);
    closers.forEach((element) => element.addEventListener('click', close));
    drawer.addEventListener('click', onLinkClick);
    window.addEventListener('keydown', onKeydown);

    return () => {
      toggle.removeEventListener('click', onToggle);
      closers.forEach((element) => element.removeEventListener('click', close));
      drawer.removeEventListener('click', onLinkClick);
      window.removeEventListener('keydown', onKeydown);
    };
  }, []);

  return null;
}
