(() => {
  const pathname = location.pathname.replace(/\\/g, '/')
  let decodedPathname = pathname
  try { decodedPathname = decodeURIComponent(pathname) } catch (e) {}
  const isHome = decodedPathname === '/' || /\/(A版官网首页|index)\.html$/i.test(decodedPathname)
  const isCms = /^\/cms(\/|$)/.test(pathname)
  const isApi = /^\/api(\/|$)/.test(pathname)
  const shouldEnhance = !isHome && !isCms && !isApi

  const ensureTransition = () => {
    if (!document.querySelector('.page-transition')) {
      const el = document.createElement('div')
      el.className = 'page-transition'
      document.body.insertBefore(el, document.body.firstChild)
    }
  }

  const ensureShell = () => {
    if (document.querySelector('.page-shell')) return
    const shell = document.createElement('div')
    shell.className = 'page-shell'
    const children = Array.from(document.body.children)
    children.forEach(node => {
      if (!(node instanceof HTMLElement)) return
      if (node.classList.contains('page-transition')) return
      if (node.id === 'navbar') return
      if (node.id === 'sideNav') return
      if (node.classList.contains('back-to-top')) return
      if (node.tagName === 'SCRIPT') return
      shell.appendChild(node)
    })
    document.body.insertBefore(shell, document.body.firstChild)
  }

  const normalizeSecondaryLayout = () => {
    if (!shouldEnhance) return
    document.querySelector('.global-navbar')?.remove()
    document.querySelector('.global-brand-float')?.remove()
    document.body.classList.remove('has-global-header')

    const shell = document.querySelector('.page-shell')
    if (shell && shell.parentNode) {
      const parent = shell.parentNode
      while (shell.firstChild) parent.insertBefore(shell.firstChild, shell)
      parent.removeChild(shell)
    }

    const breadcrumb = document.querySelector('.breadcrumb')
    const hero = document.querySelector('main.page .hero')
    if (breadcrumb && hero && breadcrumb.previousElementSibling !== hero) {
      hero.insertAdjacentElement('afterend', breadcrumb)
    }

    ensureNavConfig().then((nav) => {
      renderSecondaryNav(nav)
    })
  }

  const ensureNavConfig = () => new Promise((resolve) => {
    if (window.SITE_NAV && Array.isArray(window.SITE_NAV)) return resolve(window.SITE_NAV)
    const existing = document.querySelector('script[data-site-nav]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.SITE_NAV || []), { once: true })
      existing.addEventListener('error', () => resolve([]), { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = '/pages/assets/site-nav.js'
    s.defer = true
    s.setAttribute('data-site-nav', '1')
    s.addEventListener('load', () => resolve(window.SITE_NAV || []), { once: true })
    s.addEventListener('error', () => resolve([]), { once: true })
    document.head.appendChild(s)
  })

  const renderSecondaryNav = (nav) => {
    if (!shouldEnhance) return
    const header = document.querySelector('.site-header')
    if (!header) return
    const navEl = header.querySelector('.nav')
    const drawerLinks = document.querySelector('.drawer .drawer-links')
    const items = (Array.isArray(nav) ? nav : [])
      .filter(x => x && typeof x === 'object' && typeof x.title === 'string' && typeof x.path === 'string')
      .filter(x => !x.hidden)
      .map(x => ({ title: x.title, path: x.path }))

    if (navEl && items.length) {
      navEl.innerHTML = items.map(i => `<a href="${i.path}">${i.title}</a>`).join('')
    }
    if (drawerLinks && items.length) {
      drawerLinks.innerHTML = items.map(i => `<a href="${i.path}">${i.title}</a>`).join('')
    }

    const pathNow = decodedPathname.replace(/\/+$/, '') || '/'
    const active = items
      .map(i => ({ ...i, clean: i.path.replace(/\/+$/, '') || '/' }))
      .filter(i => i.clean !== '/' && pathNow.startsWith(i.clean))
      .sort((a, b) => b.clean.length - a.clean.length)[0]

    if (navEl) {
      navEl.querySelectorAll('a').forEach(a => {
        const href = (a.getAttribute('href') || '').replace(/\/+$/, '') || '/'
        if (active && href === active.clean) a.setAttribute('aria-current', 'page')
        else a.removeAttribute('aria-current')
      })
    }
    if (drawerLinks) {
      drawerLinks.querySelectorAll('a').forEach(a => {
        const href = (a.getAttribute('href') || '').replace(/\/+$/, '') || '/'
        if (active && href === active.clean) a.setAttribute('aria-current', 'page')
        else a.removeAttribute('aria-current')
      })
    }
  }

  const injectFloat = () => {
    if (!shouldEnhance) return
    if (document.querySelector('.global-float')) return
    const wrap = document.createElement('div')
    wrap.className = 'global-float'
    const phone = '0836-283XXXX'
    const email = 'gzjt@ganzi.gov.cn'
    const contactHref = '/pages/contact/index.html#form'
    wrap.innerHTML = `
      <div class="gfloat-item" data-action="top" aria-label="返回顶部">
        <div class="gfloat-ico">↑</div>
      </div>
      <div class="gfloat-item" aria-label="联系电话">
        <div class="gfloat-ico">☎</div>
        <div class="gfloat-pop"><b>联系电话</b><span>${phone}</span></div>
      </div>
      <div class="gfloat-item" aria-label="联系邮箱">
        <div class="gfloat-ico">@</div>
        <div class="gfloat-pop"><b>联系邮箱</b><span>${email}</span></div>
      </div>
      <div class="gfloat-item" aria-label="微信二维码">
        <div class="gfloat-ico">⌁</div>
        <div class="gfloat-pop">
          <b>微信二维码</b>
          <span>扫码关注公众号</span>
          <div class="gfloat-qr" aria-hidden="true">
            <svg viewBox="0 0 21 21" fill="none">
              <rect width="21" height="21" fill="#fff"/>
              ${(() => {
                const blocks = []
                const on = (x,y,w=1,h=1) => blocks.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0B1220"/>`)
                const finder = (ox,oy) => {
                  on(ox,oy,7,7); on(ox+1,oy+1,5,5,''); on(ox+2,oy+2,3,3)
                }
                const ring = (ox,oy) => {
                  on(ox,oy,7,1); on(ox,oy+6,7,1); on(ox,oy,1,7); on(ox+6,oy,1,7)
                  on(ox+2,oy+2,3,1); on(ox+2,oy+4,3,1); on(ox+2,oy+2,1,3); on(ox+4,oy+2,1,3)
                }
                ring(0,0); ring(14,0); ring(0,14)
                const dots = [
                  [9,0],[10,0],[8,2],[9,2],[11,2],[9,3],[8,4],[10,4],[12,4],
                  [8,6],[9,6],[10,6],[12,6],[8,8],[9,8],[11,8],[12,8],[13,8],
                  [8,10],[10,10],[11,10],[13,10],[8,11],[9,11],[12,11],[13,11],
                  [8,12],[10,12],[11,12],[12,12],[14,12],[15,12],[16,12],[17,12],
                  [9,13],[11,13],[12,13],[14,13],[16,13],
                  [8,14],[10,14],[12,14],[14,14],[16,14],[18,14],
                  [8,16],[9,16],[11,16],[12,16],[14,16],[16,16],[18,16],
                  [8,18],[10,18],[12,18],[13,18],[15,18],[17,18],[18,18]
                ]
                dots.forEach(([x,y]) => on(x,y,1,1))
                return blocks.join('')
              })()}
            </svg>
          </div>
        </div>
      </div>
      <a class="gfloat-item" href="${contactHref}" aria-label="在线留言">
        <div class="gfloat-ico">✎</div>
        <div class="gfloat-pop"><b>在线留言</b><span>跳转联系我们</span></div>
      </a>
    `
    document.body.appendChild(wrap)
    wrap.querySelector('[data-action="top"]')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const bindTransitions = () => {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const clearLeaving = () => {
      document.body.classList.remove('is-leaving')
      document.body.classList.add('is-ready')
    }
    window.addEventListener('pageshow', clearLeaving)
    const should = (a) => {
      if (!a) return false
      const href = a.getAttribute('href') || ''
      if (!href) return false
      if (href.startsWith('#')) return false
      if (a.hasAttribute('data-no-transition')) return false
      if (a.target && a.target !== '_self') return false
      return true
    }
    document.addEventListener('click', (e) => {
      const t = e.target
      if (!(t instanceof HTMLElement)) return
      const a = t.closest('a')
      if (!a) return
      if (!should(a)) return
      if (prefersReduced) return
      e.preventDefault()
      document.body.classList.add('is-leaving')
      window.setTimeout(() => { window.location.href = a.href }, 680)
    })
    window.setTimeout(() => document.body.classList.add('is-ready'), 30)
  }

  const syncStickyOffsets = () => {
    const header = document.querySelector('.site-header')
    if (!header) return
    const apply = () => {
      const h = Math.max(0, Math.round(header.getBoundingClientRect().height))
      document.documentElement.style.setProperty('--site-header-offset', `${h}px`)
    }
    document.body.classList.add('has-site-header')
    apply()
    requestAnimationFrame(apply)
    if (window.__stickyOffsetBound) return
    window.__stickyOffsetBound = true
    let raf = 0
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        apply()
      })
    }
    window.addEventListener('resize', schedule, { passive: true })
    window.addEventListener('scroll', schedule, { passive: true })
  }

  ensureTransition()
  normalizeSecondaryLayout()
  injectFloat()
  bindTransitions()
  syncStickyOffsets()

  if (!isHome) return
  const homeLinks = document.querySelectorAll('.nav-link')
  homeLinks.forEach(a => {
    const href = a.getAttribute('href') || ''
    if (!href.startsWith('#')) return
    a.addEventListener('click', () => {
      document.querySelectorAll('.nav-link').forEach(x => x.classList.remove('active'))
      a.classList.add('active')
    })
  })
})()
