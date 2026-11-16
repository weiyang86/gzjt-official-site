/* 前台统一动效：基础内容始终可见，动画只做渐进增强，不拦截点击或滚动。 */
(() => {
  if (window.__gzjtSiteMotion || /^\/(?:admin|cms|api)(?:\/|$)/.test(location.pathname)) return
  window.__gzjtSiteMotion = true
  if (!Element.prototype.animate || !window.IntersectionObserver) return

  const preference = matchMedia('(prefers-reduced-motion: reduce)')
  const running = new Map()
  const observed = new Set()
  const pageSeen = new WeakSet()
  let homeSeen = new WeakSet()
  let activeScreen = null
  let frame = 0
  let introPlayed = false
  const contentSelector = [
    'main.page .reveal', 'main.page .hero .kicker', 'main.page .hero-title',
    'main.page .hero-sub', 'main.page .hero-cta', 'main.page .section-head',
    'main.page .grid > .card', 'main.page .filters', 'main.page .news-item',
    'main.page .news-row', 'main.page .detail', 'main.page .pagination',
    '.ui-entrance .hero-badge', '.ui-entrance .hero-title',
    '.ui-entrance .hero-subtitle', '.ui-entrance .hero-actions',
    '.home-screen .home-hero-copy > *', '.home-screen .home-hero-dots--banner',
    '.home-screen .home-hero-down', '.home-screen .home-section-heading',
    '.home-screen .home-news-card', '.home-screen .home-culture-block-title',
    '.home-screen .home-culture-values > a', '.home-screen .home-topic-grid > a',
    '.home-screen .home-business-stats-heading', '.home-screen .home-business-stats-grid > article',
    '.home-screen .home-sector-grid > a', '.home-screen .home-contact-card',
    '.home-screen .home-qr-list > figure', '.home-screen .home-friend-links',
    '.home-screen .home-legal', '.home-screen .home-scenery-drawing',
  ].join(',')
  const seen = (element) => element.closest('.home-screen') ? homeSeen : pageSeen
  const visible = (element) => {
    if (!element.isConnected || element.closest('[inert],[hidden],.body,[data-motion="off"]')) return false
    const screen = element.closest('.home-screen')
    if (screen && !screen.classList.contains('is-active')) return false
    return getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0
  }
  const finish = (element) => {
    const animation = running.get(element)
    if (animation) animation.finish()
  }
  const play = (element, delay = 0, kind = 'content') => {
    if (preference.matches || !visible(element)) return
    running.get(element)?.cancel()
    const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches
    const opacity = kind === 'scenery' ? Number(getComputedStyle(element).opacity) : 1
    const interactive = element.matches('a,button,input,select,textarea') || element.querySelector('a,button,input,select,textarea')
    let from = interactive ? { opacity: 0 } : { opacity: 0, translate: `0px ${mobile ? 12 : 20}px` }
    let to = interactive ? { opacity } : { opacity, translate: '0px 0px' }
    let duration = mobile ? 400 : 560
    if (kind === 'rail') { from = { opacity: .25, translate: '-100% 0px' }; to = { opacity, translate: '0px 0px' }; duration = 640 }
    if (kind === 'control') { from = { opacity: 0 }; to = { opacity }; duration = 360 }
    if (kind === 'panel') { from = { opacity: 0 }; to = { opacity }; duration = 220 }
    if (kind === 'scenery') {
      from = { opacity: 0, scale: '1.025' }
      to = { opacity, scale: '1' }
      duration = mobile ? 600 : 900
    }
    try {
      const animation = element.animate([from, to], {
        duration, delay: Math.min(delay, mobile ? 150 : 240),
        easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards',
      })
      animation.id = `site-motion-${kind}`
      // 明确起点，避免被暂缓绘制的 webview 长时间停在 pending 的首帧。
      if (document.timeline.currentTime !== null) animation.startTime = document.timeline.currentTime
      running.set(element, animation)
      const fallback = setTimeout(() => animation.cancel(), duration + Math.min(delay, mobile ? 150 : 240) + 120)
      const cleanup = () => { clearTimeout(fallback); if (running.get(element) === animation) running.delete(element) }
      animation.onfinish = () => { cleanup(); animation.cancel() }
      animation.oncancel = cleanup
    } catch { /* 不支持的动画属性不影响内容和原有操作。 */ }
  }
  const observer = new IntersectionObserver((entries) => {
    const entering = entries.filter((entry) => entry.isIntersecting && visible(entry.target) && !seen(entry.target).has(entry.target))
    entering.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
    entering.forEach((entry, index) => {
      seen(entry.target).add(entry.target)
      entry.target.querySelectorAll(contentSelector).forEach((child) => seen(child).add(child))
      observer.unobserve(entry.target)
      observed.delete(entry.target)
      play(entry.target, (index % 5) * 45, entry.target.matches('.home-scenery-drawing') ? 'scenery' : 'content')
    })
  }, { threshold: 0, rootMargin: '0px 0px -20px 0px' })

  const scan = () => {
    frame = 0
    for (const element of observed) if (!element.isConnected) { observer.unobserve(element); observed.delete(element) }
    const next = document.querySelector('.home-screen.is-active')
    if (next !== activeScreen) {
      for (const [element, animation] of running) if (element.closest('.home-screen')) animation.cancel()
      for (const element of observed) if (element.closest('.home-screen')) { observer.unobserve(element); observed.delete(element) }
      homeSeen = new WeakSet()
      activeScreen = next
    }
    if (preference.matches) return
    const rail = document.querySelector('.home-side-rail')
    if (!rail || !visible(rail)) introPlayed = false
    if (!introPlayed && rail && visible(rail)) {
      introPlayed = true
      document.querySelectorAll('.home-rail-surface').forEach((element) => play(element, 0, 'rail'))
      document.querySelectorAll('.home-rail-brand,.home-rail-tools > button,.home-screen-index > button').forEach((element, index) => play(element, 70 + index * 25, 'control'))
    }
    const candidates = Array.from(document.querySelectorAll(contentSelector)).filter((element) => visible(element) && !seen(element).has(element))
    const candidateSet = new Set(candidates)
    candidates.forEach((element) => {
      let parent = element.parentElement
      while (parent && !parent.matches('main.page,.home-screen,.ui-entrance')) {
        if (candidateSet.has(parent)) return
        parent = parent.parentElement
      }
      if (observed.has(element)) return
      observed.add(element)
      observer.observe(element)
    })
    // React 新打开的快捷面板使用独立短淡入，不移动面板的命中位置。
    document.querySelectorAll('.home-rail-panel:not([hidden])').forEach((element) => {
      if (element.dataset.motionOpen === 'true') return
      element.dataset.motionOpen = 'true'
      play(element, 0, 'panel')
    })
    document.querySelectorAll('.home-rail-panel[hidden]').forEach((element) => { delete element.dataset.motionOpen })
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(scan) }
  new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === 'childList'
      ? Array.from(mutation.addedNodes).some((node) => node.nodeType === 1)
      : mutation.target.matches('.home-screen,.home-rail-panel,details'))) schedule()
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'open'] })

  document.addEventListener('focusin', (event) => {
    let element = event.target
    while (element instanceof HTMLElement) {
      seen(element).add(element)
      if (!element.matches('.home-rail-panel')) finish(element)
      element = element.parentElement
    }
  })
  preference.addEventListener('change', () => {
    if (preference.matches) {
      for (const animation of running.values()) animation.finish()
      observer.disconnect()
      observed.clear()
    } else schedule()
  })
  window.addEventListener('pageshow', schedule)
  window.addEventListener('resize', schedule, { passive: true })
  schedule()
})()
