(() => {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const yearEl = document.getElementById('y')
  if (yearEl) yearEl.textContent = String(new Date().getFullYear())

  const header = document.querySelector('.site-header')
  const setHeaderState = () => {
    const solid = window.scrollY > 12
    if (header) header.classList.toggle('is-solid', solid)
  }
  setHeaderState()
  window.addEventListener('scroll', setHeaderState, { passive: true })

  const drawer = document.querySelector('[data-drawer]')
  const toggleBtn = document.querySelector('[data-menu-toggle]')
  const closeEls = Array.from(document.querySelectorAll('[data-drawer-close]'))
  const openDrawer = () => {
    if (!drawer || !toggleBtn) return
    drawer.classList.add('is-open')
    drawer.setAttribute('aria-hidden', 'false')
    toggleBtn.setAttribute('aria-expanded', 'true')
  }
  const closeDrawer = () => {
    if (!drawer || !toggleBtn) return
    drawer.classList.remove('is-open')
    drawer.setAttribute('aria-hidden', 'true')
    toggleBtn.setAttribute('aria-expanded', 'false')
  }
  if (toggleBtn) toggleBtn.addEventListener('click', () => (drawer && drawer.classList.contains('is-open')) ? closeDrawer() : openDrawer())
  closeEls.forEach(el => el.addEventListener('click', closeDrawer))
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (drawer && drawer.classList.contains('is-open')) closeDrawer()
  })

  const revealEls = Array.from(document.querySelectorAll('.reveal'))
  if (revealEls.length && !prefersReduced && 'IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(ent => {
        if (!ent.isIntersecting) return
        ent.target.classList.add('is-visible')
        revealObs.unobserve(ent.target)
      })
    }, { threshold: 0.18 })
    revealEls.forEach(el => revealObs.observe(el))
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'))
  }

  document.querySelectorAll('[data-stagger]').forEach(parent => {
    const step = Number(parent.getAttribute('data-stagger') || '0')
    if (!Number.isFinite(step) || step <= 0) return
    const items = Array.from(parent.querySelectorAll('.reveal'))
    items.forEach((el, i) => {
      el.style.transitionDelay = `${i * step}ms`
    })
  })

  const animateCount = (el) => {
    const target = Number(el.getAttribute('data-target') || '0')
    const decimals = Number(el.getAttribute('data-decimals') || '0')
    const startAt = Number(el.getAttribute('data-from') || '0')
    const dur = Number(el.getAttribute('data-duration') || '1200')
    const out = el.querySelector('[data-num]') || el
    const start = performance.now()
    const fmt = (n) => n.toFixed(decimals)
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3)
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur)
      const v = startAt + (target - startAt) * easeOutCubic(p)
      out.textContent = fmt(v)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const countEls = Array.from(document.querySelectorAll('[data-countup]'))
  if (countEls.length && !prefersReduced && 'IntersectionObserver' in window) {
    const countObs = new IntersectionObserver((entries) => {
      entries.forEach(ent => {
        if (!ent.isIntersecting) return
        const el = ent.target
        if (el.getAttribute('data-counted') === '1') return
        el.setAttribute('data-counted', '1')
        animateCount(el)
        countObs.unobserve(el)
      })
    }, { threshold: 0.28 })
    countEls.forEach(el => countObs.observe(el))
  } else {
    countEls.forEach(el => {
      const target = el.getAttribute('data-target')
      const decimals = Number(el.getAttribute('data-decimals') || '0')
      const out = el.querySelector('[data-num]') || el
      if (target != null) out.textContent = Number(target).toFixed(decimals)
    })
  }

  const initSwipers = () => {
    const els = Array.from(document.querySelectorAll('[data-swiper]'))
    els.forEach(el => {
      if (el.getAttribute('data-swiper-inited') === '1') return
      if (!window.Swiper) return
      const paginationEl = el.closest('.hero-bg') ? el.closest('.hero').querySelector('.swiper-pagination') : el.querySelector('.swiper-pagination')
      const prevEl = el.closest('.hero-bg') ? el.closest('.hero').querySelector('[data-swiper-prev]') : el.querySelector('[data-swiper-prev]')
      const nextEl = el.closest('.hero-bg') ? el.closest('.hero').querySelector('[data-swiper-next]') : el.querySelector('[data-swiper-next]')
      const allowTouchMove = el.getAttribute('data-touch') !== 'false'
      const speed = Number(el.getAttribute('data-speed') || '1200')
      const delay = Number(el.getAttribute('data-autoplay') || '5000')
      const effect = el.getAttribute('data-effect') || 'fade'
      const loop = el.getAttribute('data-loop') !== 'false'
      el.setAttribute('data-swiper-inited', '1')
      new Swiper(el, {
        loop,
        slidesPerView: 1,
        effect,
        fadeEffect: { crossFade: true },
        speed,
        allowTouchMove,
        autoplay: prefersReduced ? false : { delay, disableOnInteraction: false },
        pagination: paginationEl ? { el: paginationEl, clickable: true } : undefined,
        navigation: (prevEl && nextEl) ? { prevEl, nextEl } : undefined
      })
    })
  }
  initSwipers()

  const fitMaps = Array.from(document.querySelectorAll('[data-fit-map]'))
  const updateFit = (wrap) => {
    const stage = wrap.querySelector('[data-fit-stage]') || wrap
    const img = wrap.querySelector('img')
    const layer = wrap.querySelector('[data-fit-layer]')
    if (!stage || !img || !layer) return
    const cw = stage.clientWidth
    const ch = stage.clientHeight
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    if (!cw || !ch || !iw || !ih) return
    const scale = Math.min(cw / iw, ch / ih)
    const rw = iw * scale
    const rh = ih * scale
    const ox = (cw - rw) / 2
    const oy = (ch - rh) / 2
    stage.style.setProperty('--fit-left', ox + 'px')
    stage.style.setProperty('--fit-top', oy + 'px')
    stage.style.setProperty('--fit-width', rw + 'px')
    stage.style.setProperty('--fit-height', rh + 'px')
  }
  fitMaps.forEach(wrap => {
    const img = wrap.querySelector('img')
    if (!img) return
    const run = () => updateFit(wrap)
    if (img.complete) run()
    img.addEventListener('load', run)
    window.addEventListener('resize', () => run(), { passive: true })
  })

  const lazyEls = Array.from(document.querySelectorAll('img[data-lazy]'))
  const loadLazy = (img) => {
    const src = img.getAttribute('data-lazy')
    if (!src) return
    const onLoad = () => img.classList.add('is-loaded')
    img.addEventListener('load', onLoad, { once: true })
    img.src = src
  }
  if (lazyEls.length && 'IntersectionObserver' in window) {
    const lazyObs = new IntersectionObserver((entries) => {
      entries.forEach(ent => {
        if (!ent.isIntersecting) return
        const img = ent.target
        loadLazy(img)
        lazyObs.unobserve(img)
      })
    }, { threshold: 0.18, rootMargin: '120px' })
    lazyEls.forEach(img => lazyObs.observe(img))
  } else {
    lazyEls.forEach(loadLazy)
  }

  const lightbox = document.querySelector('[data-lightbox]')
  const lightboxImg = lightbox ? lightbox.querySelector('img') : null
  const openLightbox = (src) => {
    if (!lightbox || !lightboxImg) return
    lightboxImg.src = src
    lightbox.classList.add('is-open')
    lightbox.setAttribute('aria-hidden', 'false')
  }
  const closeLightbox = () => {
    if (!lightbox || !lightboxImg) return
    lightbox.classList.remove('is-open')
    lightbox.setAttribute('aria-hidden', 'true')
    lightboxImg.src = ''
  }
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      const t = e.target
      if (!(t instanceof HTMLElement)) return
      if (t.closest('[data-lightbox-close]')) return closeLightbox()
      if (t.classList.contains('lightbox-backdrop')) return closeLightbox()
    })
  }
  document.addEventListener('click', (e) => {
    const t = e.target
    if (!(t instanceof HTMLElement)) return
    const trigger = t.closest('[data-lightbox-src]')
    if (!trigger) return
    const src = trigger.getAttribute('data-lightbox-src')
    if (!src) return
    e.preventDefault()
    openLightbox(src)
  })

  const forms = Array.from(document.querySelectorAll('form[data-form]'))
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const btn = form.querySelector('button[type="submit"]')
      if (btn) btn.disabled = true
      window.setTimeout(() => {
        if (btn) btn.disabled = false
        form.reset()
        const toast = document.querySelector('[data-toast]')
        if (toast) {
          toast.textContent = toast.getAttribute('data-toast') || '提交成功'
          toast.classList.add('is-visible')
          window.setTimeout(() => toast.classList.remove('is-visible'), 2200)
        }
      }, 600)
    })
  })
})()
