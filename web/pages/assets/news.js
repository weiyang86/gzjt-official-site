(() => {
  const root = document.querySelector('[data-news-page]')
  if (!root) return
  const CMS_API_BASE = (window.CMS_API_BASE || localStorage.getItem('CMS_API_BASE') || 'http://localhost:4000').replace(/\/$/, '')
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const fallbackChannelMap = {
    政务简讯: 'gov-briefs',
    集团要闻: 'group-news',
    集团新闻: 'group-news',
    行业聚焦: 'industry-news',
    行业要闻: 'industry-news',
    媒体聚焦: 'media-focus',
    通知公告: 'announcements'
  }

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
  const fetchJson = async (path) => {
    try {
      const res = await fetch(`${CMS_API_BASE}${path}`)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return await res.json()
    } catch (err) {
      console.warn(`[news] ${path} failed, keeping static fallback.`, err)
      return null
    }
  }
  const monthText = (value) => {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return ''
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]
  }
  const dayText = (value) => {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return '--'
    return String(date.getDate()).padStart(2, '0')
  }
  const longDate = (value) => {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return ''
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }
  const escapeHtml = (value) => String(value || '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
  const limitText = (value, max = 80) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim()
    return text.length > max ? `${text.slice(0, max - 1)}…` : text
  }
  const staticData = (window.NEWS_LIST || []).map(x => ({
    id: String(x.id),
    channelSlug: fallbackChannelMap[x.category] || 'group-news',
    category: x.category || '',
    newsSubcategory: x.subCategory || '',
    title: x.title || '',
    date: x.date || '',
    dateText: x.dateText || x.date || '',
    day: x.day || dayText(x.date),
    month: x.month || monthText(x.date),
    views: x.views || '',
    img: resolveCover(x.cover || ''),
    excerpt: x.summary || '',
    summary: x.summary || '',
    source: x.source || '',
    author: x.author || ''
  }))

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

  const tabsWrap = document.querySelector('[data-news-tabs]')
  const subTabsWrap = document.querySelector('[data-news-subtabs]')
  const searchInput = document.getElementById('newsSearch')
  const listEl = document.getElementById('newsList')
  const pagerEl = document.getElementById('newsPager')
  const featuredEl = document.getElementById('newsFeatured')
  const heroTitleEl = document.querySelector('[data-news-hero-title]')
  const heroSubtitleEl = document.querySelector('[data-news-hero-subtitle]')
  const heroLinkEl = document.querySelector('[data-news-hero-link]')
  const heroSwiperEl = document.querySelector('[data-news-hero-swiper]')
  const heroSwiperWrap = document.querySelector('[data-news-hero-swiper-wrapper]')
  const heroStats = Array.from(root.querySelectorAll('.corp-stats .stat-item'))

  const state = {
    mode: 'fallback',
    activeChannel: 'all',
    activeSubcategory: '',
    keyword: '',
    page: 1,
    pageSize: 6,
    items: staticData,
    channels: [],
    availableSubcategories: []
  }

  const getTabs = () => {
    const dynamic = state.channels.length
      ? state.channels.map(item => ({ slug: item.slug, label: item.name }))
      : [
          { slug: 'gov-briefs', label: '政务简讯' },
          { slug: 'group-news', label: '集团要闻' },
          { slug: 'industry-news', label: '行业聚焦' },
          { slug: 'media-focus', label: '媒体聚焦' },
          { slug: 'announcements', label: '通知公告' }
        ]
    return [{ slug: 'all', label: '全部' }, ...dynamic]
  }

  const getFiltered = () => {
    const keyword = state.keyword.trim().toLowerCase()
    return state.items
      .filter(item => state.activeChannel === 'all' ? true : item.channelSlug === state.activeChannel)
      .filter(item => state.activeSubcategory ? item.newsSubcategory === state.activeSubcategory : true)
      .filter(item => !keyword ? true : `${item.title} ${item.excerpt} ${item.source}`.toLowerCase().includes(keyword))
      .sort((a, b) => String(b.date || b.dateText).localeCompare(String(a.date || a.dateText)))
  }

  const setFeatured = (item) => {
    if (!featuredEl) return
    const titleEl = featuredEl.querySelector('[data-title]')
    const excerptEl = featuredEl.querySelector('[data-excerpt]')
    const metaEl = featuredEl.querySelector('[data-meta]')
    const imgEl = featuredEl.querySelector('img')
    const btn = featuredEl.querySelector('[data-news-featured-link]') || featuredEl.querySelector('a')
    if (!item) {
      if (titleEl) titleEl.textContent = '暂无匹配资讯'
      if (excerptEl) excerptEl.textContent = '当前筛选条件下暂无已发布内容，请切换分类或调整关键词。'
      if (metaEl) metaEl.textContent = '新闻中心'
      if (btn) btn.setAttribute('href', '../news/index.html')
      if (imgEl) imgEl.setAttribute('src', '../../img/雅砻江大桥.jpg')
      return
    }
    const href = `../detail/news-detail.html?id=${encodeURIComponent(item.id)}`
    const label = item.newsSubcategory ? `${item.category} · ${item.newsSubcategory}` : item.category
    if (titleEl) titleEl.textContent = item.title
    if (excerptEl) excerptEl.textContent = item.excerpt || item.summary || '查看该资讯详情。'
    if (metaEl) metaEl.textContent = `${label} · ${item.dateText}${item.views ? ` · 阅读 ${item.views}` : ''}`
    if (btn) {
      btn.href = href
      btn.removeAttribute('data-no-transition')
    }
    if (imgEl) {
      imgEl.setAttribute('src', item.img || '../../img/雅砻江大桥.jpg')
      imgEl.classList.add('is-loaded')
    }
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
    const start = (state.page - 1) * state.pageSize
    const slice = items.slice(start, start + state.pageSize)
    if (!slice.length) {
      listEl.innerHTML = '<div class="card" style="padding:24px 20px;color:rgba(11,18,32,.68)">暂无符合条件的资讯。</div>'
      return
    }
    listEl.innerHTML = slice.map(x => {
      const href = `../detail/news-detail.html?id=${encodeURIComponent(x.id)}`
      const tag = x.newsSubcategory ? `${x.category} · ${x.newsSubcategory}` : x.category
      return `
        <a class="news-item reveal" data-anim="fadeUp" href="${href}">
          <div class="news-date-tag">
            <div class="nd-day">${x.day}</div>
            <div class="nd-month">${x.month}</div>
          </div>
          <span class="thumb"><img class="lazy" data-lazy="${escapeHtml(x.img || '../../img/国道318线康定市过境段公路工程项目434互通工程（后北门）.jpg')}" alt=""></span>
          <span class="news-content">
            <b class="news-title">${escapeHtml(limitText(x.title, 42))}</b>
            <span class="news-desc">${escapeHtml(limitText(x.excerpt || x.summary || '查看该资讯详情。', 78))}</span>
            <div class="news-meta-row">
              <span class="news-cat-tag">${escapeHtml(tag)}</span>
              ${x.views ? `<span class="news-views">阅读 ${escapeHtml(x.views)}</span>` : ''}
            </div>
          </span>
        </a>
      `
    }).join('')
    enhanceDynamic(listEl)
  }

  const renderPager = (total) => {
    if (!pagerEl) return
    const pages = Math.max(1, Math.ceil(total / state.pageSize))
    state.page = Math.min(state.page, pages)
    const btn = (p, text = String(p), active = false) => `<button class="page-btn${active ? ' is-active' : ''}" type="button" data-page="${p}">${text}</button>`
    const parts = []
    parts.push(btn(Math.max(1, state.page - 1), '上一页'))
    for (let p = 1; p <= pages; p += 1) {
      if (pages > 7) {
        if (p === 1 || p === pages || Math.abs(p - state.page) <= 1) {
          parts.push(btn(p, String(p), p === state.page))
        } else if (p === 2 && state.page > 4) {
          parts.push(`<span style="opacity:.55;padding:0 6px">…</span>`)
        } else if (p === pages - 1 && state.page < pages - 3) {
          parts.push(`<span style="opacity:.55;padding:0 6px">…</span>`)
        }
      } else {
        parts.push(btn(p, String(p), p === state.page))
      }
    }
    parts.push(btn(Math.min(pages, state.page + 1), '下一页'))
    pagerEl.innerHTML = parts.join('')
    pagerEl.querySelectorAll('button[data-page]').forEach(b => {
      b.addEventListener('click', () => {
        const p = Number(b.getAttribute('data-page') || '1')
        if (!Number.isFinite(p)) return
        state.page = p
        update()
        const top = document.querySelector('[data-news-top]')
        if (top) top.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
      })
    })
  }

  const renderTabs = () => {
    if (!tabsWrap) return
    tabsWrap.innerHTML = getTabs().map(tab => `
      <button class="tab${state.activeChannel === tab.slug ? ' is-active' : ''}" type="button" data-channel-tab="${escapeHtml(tab.slug)}">${escapeHtml(tab.label)}</button>
    `).join('')
    tabsWrap.querySelectorAll('[data-channel-tab]').forEach(button => {
      button.addEventListener('click', async () => {
        state.activeChannel = button.getAttribute('data-channel-tab') || 'all'
        state.activeSubcategory = ''
        state.page = 1
        if (state.mode === 'api') await refreshApiData()
        update()
      })
    })
  }

  const renderSubTabs = () => {
    if (subTabsWrap) {
      state.activeSubcategory = ''
      subTabsWrap.hidden = true
      subTabsWrap.style.display = 'none'
      subTabsWrap.innerHTML = ''
    }
  }

  const updateStats = (allItems) => {
    if (heroStats[0]) heroStats[0].querySelector('.stat-num')?.setAttribute('data-target', String(allItems.length || 0))
    if (heroStats[0]) {
      const num = heroStats[0].querySelector('.stat-num')
      if (num) num.textContent = String(allItems.length || 0)
    }
  }

  const replaceHeroSlides = (banners) => {
    if (!heroSwiperWrap) return
    const slidesHtml = banners.map(item => `
      <div class="swiper-slide"><img alt="${escapeHtml(item.title || '新闻轮播')}" src="${escapeHtml(resolveCover(item.image || '../../img/雅砻江大桥.jpg'))}" /></div>
    `)
    if (heroSwiperEl && heroSwiperEl.swiper && typeof heroSwiperEl.swiper.removeAllSlides === 'function') {
      const swiper = heroSwiperEl.swiper
      if (swiper.params.loop && swiper.loopDestroy) swiper.loopDestroy()
      swiper.removeAllSlides()
      slidesHtml.forEach(html => swiper.appendSlide(html))
      if (swiper.params.loop && swiper.loopCreate) swiper.loopCreate()
      swiper.update()
      if (typeof swiper.slideToLoop === 'function') swiper.slideToLoop(0, 0)
      else swiper.slideTo(0, 0)
      return
    }
    heroSwiperWrap.innerHTML = slidesHtml.join('')
  }

  const renderHero = async () => {
    const banners = await fetchJson('/api/public/cms/banners?position=news')
    if (!Array.isArray(banners) || !banners.length) return
    const usable = banners.filter(item => item && item.image)
    if (usable.length) replaceHeroSlides(usable)
    const current = banners[0]
    if (heroTitleEl && current?.title) heroTitleEl.textContent = current.title
    if (heroSubtitleEl && current?.subtitle) heroSubtitleEl.textContent = current.subtitle
    if (heroLinkEl && current?.linkUrl) heroLinkEl.setAttribute('href', current.linkUrl)
  }

  const normalizeApiArticle = (item) => ({
    id: String(item.id),
    channelSlug: item.mainChannel?.slug || '',
    category: item.mainChannel?.name || '',
    newsSubcategory: item.newsSubcategory || '',
    title: item.title || '',
    date: item.publishAt || item.publishDate || '',
    dateText: longDate(item.publishAt || item.publishDate) || item.publishDate || '',
    day: dayText(item.publishAt || item.publishDate),
    month: monthText(item.publishAt || item.publishDate),
    views: item.views || '',
    img: resolveCover(item.cover || '../../img/雅砻江大桥.jpg'),
    excerpt: item.summary || '',
    summary: item.summary || '',
    source: item.source || '',
    author: item.author || ''
  })

  const refreshApiData = async () => {
    const params = new URLSearchParams({ page: '1', pageSize: '100' })
    if (state.activeChannel !== 'all') params.set('channelSlug', state.activeChannel)
    if (state.activeSubcategory) params.set('newsSubcategory', state.activeSubcategory)
    if (state.keyword.trim()) params.set('keyword', state.keyword.trim())
    const result = await fetchJson(`/api/public/cms/articles?${params.toString()}`)
    if (!result || !Array.isArray(result.items)) return false
    state.mode = 'api'
    state.items = result.items.map(normalizeApiArticle)
    state.availableSubcategories = []
    return true
  }

  const loadChannels = async () => {
    const channels = await fetchJson('/api/public/cms/channels?type=news')
    if (!Array.isArray(channels) || !channels.length) return false
    state.mode = 'api'
    const items = channels
      .filter(item => item && typeof item.slug === 'string' && item.slug)
      .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0))
    state.channels = items
    return true
  }

  const update = () => {
    renderTabs()
    renderSubTabs()
    const items = getFiltered()
    const featured = items[0] || null
    const listItems = items.length === 1 ? items : items.slice(1)
    setFeatured(featured)
    renderList(listItems)
    renderPager(listItems.length)
    updateStats(items)
    enhanceDynamic(featuredEl)
  }

  if (searchInput) {
    let timer = 0
    searchInput.addEventListener('input', () => {
      state.keyword = searchInput.value || ''
      state.page = 1
      window.clearTimeout(timer)
      timer = window.setTimeout(async () => {
        if (state.mode === 'api') await refreshApiData()
        update()
      }, 180)
    })
  }

  ;(async () => {
    await renderHero()
    await loadChannels()
    if (state.activeChannel === 'gov-briefs') state.activeSubcategory = defaultSubcategories[0]
    await refreshApiData()
    update()
  })()
})()
