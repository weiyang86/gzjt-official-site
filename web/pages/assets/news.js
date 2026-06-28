(() => {
  const root = document.querySelector('[data-news-page]')
  if (!root) return
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const navigate = (href) => {
    if (prefersReduced) {
      window.location.href = href
      return
    }
    document.body.classList.add('is-leaving')
    window.setTimeout(() => {
      window.location.href = href
    }, 680)
  }

  const rootPrefix = location.pathname.replace(/\\/g, '/').includes('/pages/') ? '../../' : ''
  const resolveCover = (p) => {
    if (!p) return ''
    if (/^(https?:)?\/\//.test(p)) return p
    if (p.startsWith('data:')) return p
    if (p.startsWith('/')) return p
    if (p.startsWith('../') || p.startsWith('./')) return p
    return rootPrefix + p.replace(/^\/+/, '')
  }

  const ensureReveal = (() => {
    if (prefersReduced) return (els) => els.forEach(el => el.classList.add('is-visible'))
    if (!('IntersectionObserver' in window)) return (els) => els.forEach(el => el.classList.add('is-visible'))
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(ent => {
        if (!ent.isIntersecting) return
        ent.target.classList.add('is-visible')
        obs.unobserve(ent.target)
      })
    }, { threshold: 0.18 })
    return (els) => els.forEach(el => obs.observe(el))
  })()

  const ensureLazy = (() => {
    const load = (img) => {
      const src = img.getAttribute('data-lazy')
      if (!src) return
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true })
      img.src = src
    }
    if (!('IntersectionObserver' in window)) return (imgs) => imgs.forEach(load)
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(ent => {
        if (!ent.isIntersecting) return
        const img = ent.target
        load(img)
        obs.unobserve(img)
      })
    }, { threshold: 0.18, rootMargin: '120px' })
    return (imgs) => imgs.forEach(img => obs.observe(img))
  })()

  const enhanceDynamic = (scope) => {
    if (!scope) return
    const revealEls = Array.from(scope.querySelectorAll('.reveal')).filter(el => el.getAttribute('data-dyn-reveal') !== '1')
    revealEls.forEach(el => el.setAttribute('data-dyn-reveal', '1'))
    ensureReveal(revealEls)

    const imgs = Array.from(scope.querySelectorAll('img[data-lazy]')).filter(img => img.getAttribute('data-dyn-lazy') !== '1')
    imgs.forEach(img => img.setAttribute('data-dyn-lazy', '1'))
    ensureLazy(imgs)
  }

  const data = (window.NEWS_LIST || []).map(x => ({
    id: String(x.id),
    cat: x.category || '',
    subcat: x.subCategory || '',
    title: x.title || '',
    date: x.dateText || x.date || '',
    day: x.day || '',
    month: x.month || '',
    views: x.views || '',
    img: resolveCover(x.cover || ''),
    excerpt: x.summary || ''
  }))

  const tabs = Array.from(document.querySelectorAll('[data-news-tab]'))
  const subTabsWrap = document.querySelector('[data-news-subtabs]')
  const subTabs = Array.from(document.querySelectorAll('[data-news-subtab]'))
  const searchInput = document.getElementById('newsSearch')
  const listEl = document.getElementById('newsList')
  const pagerEl = document.getElementById('newsPager')
  const featuredEl = document.getElementById('newsFeatured')

  let activeCat = '全部'
  let activeSub = '省委、省政府'
  let keyword = ''
  let page = 1
  const pageSize = 6

  const getFiltered = () => {
    const kw = keyword.trim().toLowerCase()
    return data
      .filter(x => {
        if (activeCat === '全部') return true
        if (activeCat === '政务简讯') {
          if (x.cat !== '政务简讯') return false
          if (!activeSub) return true
          return x.subcat === activeSub
        }
        return x.cat === activeCat
      })
      .filter(x => !kw ? true : (x.title + x.excerpt + x.source).toLowerCase().includes(kw))
      .sort((a,b) => String(b.date).localeCompare(String(a.date)))
  }

  const setFeatured = (items) => {
    if (!featuredEl) return
    const top = items[0]
    if (!top) return
    const href = `../detail/news-detail.html?id=${encodeURIComponent(top.id)}`
    featuredEl.querySelector('[data-title]').textContent = top.title
    featuredEl.querySelector('[data-excerpt]').textContent = top.excerpt
    const label = top.subcat ? `${top.cat} · ${top.subcat}` : top.cat
    featuredEl.querySelector('[data-meta]').textContent = `${label} · ${top.date}${top.views ? ` · 阅读 ${top.views}` : ''}`
    const btn = featuredEl.querySelector('a')
    if (btn) {
      btn.href = href
      btn.removeAttribute('data-no-transition')
    }
    featuredEl.querySelector('img').setAttribute('data-lazy', top.img)
    if (!featuredEl.dataset.boundFeaturedClick) {
      featuredEl.dataset.boundFeaturedClick = '1'
      featuredEl.addEventListener('click', (e) => {
        const t = e.target
        if (!(t instanceof HTMLElement)) return
        if (t.closest('a')) return
        const a = featuredEl.querySelector('a')
        if (!a) return
        navigate(a.href)
      })
    }
  }

  const renderList = (items) => {
    if (!listEl) return
    const start = (page - 1) * pageSize
    const slice = items.slice(start, start + pageSize)
    listEl.innerHTML = slice.map(x => {
      const href = `../detail/news-detail.html?id=${encodeURIComponent(x.id)}`
      const tag = x.subcat ? `${x.cat} · ${x.subcat}` : x.cat
      return `
        <a class="news-item reveal" data-anim="fadeUp" href="${href}">
          <div class="news-date-tag">
            <div class="nd-day">${x.day}</div>
            <div class="nd-month">${x.month}</div>
          </div>
          <span class="thumb"><img class="lazy" data-lazy="${x.img}" alt=""></span>
          <span class="news-content">
            <b class="news-title">${x.title}</b>
            <span class="news-desc">${x.excerpt}</span>
            <div class="news-meta-row">
              <span class="news-cat-tag">${tag}</span>
              ${x.views ? `<span class="news-views">阅读 ${x.views}</span>` : ''}
            </div>
          </span>
        </a>
      `
    }).join('')
    enhanceDynamic(listEl)
  }

  const renderPager = (total) => {
    if (!pagerEl) return
    const pages = Math.max(1, Math.ceil(total / pageSize))
    page = Math.min(page, pages)
    const btn = (p, text = String(p), active = false) => `<button class="page-btn${active ? ' is-active' : ''}" type="button" data-page="${p}">${text}</button>`
    const parts = []
    parts.push(btn(Math.max(1, page - 1), '上一页'))
    for (let p = 1; p <= pages; p += 1) {
      if (pages > 7) {
        if (p === 1 || p === pages || Math.abs(p - page) <= 1) {
          parts.push(btn(p, String(p), p === page))
        } else if (p === 2 && page > 4) {
          parts.push(`<span style="opacity:.55;padding:0 6px">…</span>`)
        } else if (p === pages - 1 && page < pages - 3) {
          parts.push(`<span style="opacity:.55;padding:0 6px">…</span>`)
        }
      } else {
        parts.push(btn(p, String(p), p === page))
      }
    }
    parts.push(btn(Math.min(pages, page + 1), '下一页'))
    pagerEl.innerHTML = parts.join('')
    pagerEl.querySelectorAll('button[data-page]').forEach(b => {
      b.addEventListener('click', () => {
        const p = Number(b.getAttribute('data-page') || '1')
        if (!Number.isFinite(p)) return
        page = p
        update()
        const top = document.querySelector('[data-news-top]')
        if (top) top.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
      })
    })
  }

  const updateTabs = () => {
    tabs.forEach(t => t.classList.toggle('is-active', (t.getAttribute('data-news-tab') || '') === activeCat))
    subTabs.forEach(t => t.classList.toggle('is-active', (t.getAttribute('data-news-subtab') || '') === activeSub))
    if (subTabsWrap) {
      subTabsWrap.hidden = activeCat !== '政务简讯'
      subTabsWrap.style.display = activeCat === '政务简讯' ? '' : 'none'
    }
  }

  const update = () => {
    const items = getFiltered()
    updateTabs()
    setFeatured(items)
    renderList(items)
    renderPager(items.length)
    enhanceDynamic(featuredEl)
  }

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      activeCat = t.getAttribute('data-news-tab') || '全部'
      if (activeCat !== '政务简讯') activeSub = ''
      if (activeCat === '政务简讯' && !activeSub) activeSub = '省委、省政府'
      page = 1
      update()
    })
  })

  subTabs.forEach(t => {
    t.addEventListener('click', () => {
      activeSub = t.getAttribute('data-news-subtab') || ''
      page = 1
      update()
    })
  })

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      keyword = searchInput.value || ''
      page = 1
      update()
    })
  }

  update()
})()
