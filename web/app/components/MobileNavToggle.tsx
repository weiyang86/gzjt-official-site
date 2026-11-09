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

    const open = () => {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
    };
    const onToggle = (event: Event) => {
      event.preventDefault();
      if (drawer.classList.contains('is-open')) close();
      else open();
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    const closers = Array.from(document.querySelectorAll<HTMLElement>('[data-drawer-close]'));
    toggle.addEventListener('click', onToggle);
    closers.forEach((element) => element.addEventListener('click', close));
    window.addEventListener('keydown', onKeydown);

    return () => {
      toggle.removeEventListener('click', onToggle);
      closers.forEach((element) => element.removeEventListener('click', close));
      window.removeEventListener('keydown', onKeydown);
    };
  }, []);

  return null;
}
