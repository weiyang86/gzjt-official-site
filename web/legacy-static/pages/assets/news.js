(() => {
  const root = document.querySelector('[data-news-page]')
  if (!root) return

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const rootPrefix = location.pathname.replace(/\\/g, '/').includes('/pages/') ? '../../' : ''
  const fallbackChannelMap = {
    政务简讯: 'gov-briefs',
    集团要闻: 'group-news',
    集团新闻: 'group-news',
    行业聚焦: 'industry-news',
    行业要闻: 'industry-news',
    媒体聚焦: 'media-focus',
    通知公告: 'announcements'
  }
  const fallbackChannels = [
    { slug: 'gov-briefs', name: '政务简讯' },
    { slug: 'group-news', name: '集团要闻' },
    { slug: 'industry-news', name: '行业聚焦' },
    { slug: 'media-focus', name: '媒体聚焦' },
    { slug: 'announcements', name: '通知公告' }
  ]

  const resolveCover = (value) => {
    if (!value) return ''
    if (/^(https?:)?\/\//.test(value) || value.startsWith('data:')) return value
    if (value.startsWith('/')) return value
    if (value.startsWith('../') || value.startsWith('./')) return value
    return rootPrefix + value.replace(/^\/+/, '')
  }
  const fetchJson = async (path) => {
    try {
      const res = await fetch(path)
      const contentType = res.headers.get('content-type') || ''
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      if (!/application\/json/i.test(contentType)) throw new Error(`Unexpected content-type: ${contentType}`)
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
  const timeValue = (value) => {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return 0
    return date.getTime()
  }
  const escapeHtml = (value) => String(value || '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
  const limitText = (value, max = 80) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim()
    return text.length > max ? `${text.slice(0, max - 1)}…` : text
  }
  const staticData = (window.NEWS_LIST || []).map(item => ({
    id: String(item.id),
    channelSlug: fallbackChannelMap[item.category] || 'group-news',
    category: item.category || '',
    newsSubcategory: item.subCategory || '',
    title: item.title || '',
    date: item.date || '',
    dateText: item.dateText || longDate(item.date) || item.date || '',
    day: item.day || dayText(item.date),
    month: item.month || monthText(item.date),
    views: item.views || '',
    img: resolveCover(item.cover || ''),
    excerpt: item.summary || '',
    summary: item.summary || '',
    source: item.source || '',
    author: item.author || ''
  }))

  const ensureReveal = (() => {
    if (prefersReduced || !('IntersectionObserver' in window)) return (els) => els.forEach(el => el.classList.add('is-visible'))
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        obs.unobserve(entry.target)
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
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        load(entry.target)
        obs.unobserve(entry.target)
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
  const heroTitleEl = document.querySelector('[data-news-hero-title]')
  const heroSubtitleEl = document.querySelector('[data-news-hero-subtitle]')
  const heroLinkEl = document.querySelector('[data-news-hero-link]')
  const heroSwiperEl = document.querySelector('[data-news-hero-swiper]')
  const heroSwiperWrap = document.querySelector('[data-news-hero-swiper-wrapper]')
  const heroStats = Array.from(root.querySelectorAll('.corp-stats .stat-item'))
  const statLabelEl = document.querySelector('[data-news-stat-label]')
  const sectionTitleEl = document.querySelector('[data-news-section-title]')
  const sectionLeadEl = document.querySelector('[data-news-section-lead]')
  const crumbCurrentEl = document.querySelector('[data-news-crumb-current]')

  const searchParams = new URLSearchParams(window.location.search)
  const initialChannel = searchParams.get('channel') || 'all'
  const state = {
    mode: 'fallback',
    activeChannel: initialChannel,
    keyword: '',
    page: 1,
    pageSize: 8,
    items: staticData,
    totalCount: (() => {
      const preset = Number(window.__NEWS_TOTAL_COUNT)
      return Number.isFinite(preset) && preset > 0 ? preset : staticData.length
    })(),
    channels: [...fallbackChannels]
  }

  const getCurrentChannel = () => state.channels.find(item => item.slug === state.activeChannel) || null
  const getTabs = () => [{ slug: 'all', label: '全部' }, ...state.channels.map(item => ({ slug: item.slug, label: item.name }))]
  const getFiltered = () => {
    const keyword = state.keyword.trim().toLowerCase()
    return state.items
      .filter(item => state.activeChannel === 'all' ? true : item.channelSlug === state.activeChannel)
      .filter(item => !keyword ? true : `${item.title} ${item.excerpt} ${item.source}`.toLowerCase().includes(keyword))
      .sort((a, b) => timeValue(b.date || b.dateText) - timeValue(a.date || a.dateText))
  }
  const syncUrl = () => {
    const url = new URL(window.location.href)
    if (state.activeChannel === 'all') url.searchParams.delete('channel')
    else url.searchParams.set('channel', state.activeChannel)
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }

  const renderList = (items) => {
    if (!listEl) return
    const start = (state.page - 1) * state.pageSize
    const slice = items.slice(start, start + state.pageSize)
    if (!slice.length) {
      listEl.innerHTML = '<div class="card" style="padding:24px 20px;color:rgba(11,18,32,.68)">当前分类下暂无符合条件的新闻，请切换分类或调整关键词后重试。</div>'
      return
    }
    listEl.innerHTML = slice.map(item => {
      const href = `../detail/news-detail.html?id=${encodeURIComponent(item.id)}`
      const tag = item.newsSubcategory ? `${item.category} · ${item.newsSubcategory}` : item.category
      return `
        <a class="news-item reveal" data-anim="fadeUp" href="${href}">
          <span class="news-date-tag">
            <span class="nd-day">${escapeHtml(item.day)}</span>
            <span class="nd-month">${escapeHtml(item.month)}</span>
          </span>
          <span class="thumb"><img class="lazy" data-lazy="${escapeHtml(item.img || '../../img/国道318线康定市过境段公路工程项目434互通工程（后北门）.jpg')}" alt=""></span>
          <span class="news-content">
            <b class="news-title">${escapeHtml(limitText(item.title, 48))}</b>
            <span class="news-desc">${escapeHtml(limitText(item.excerpt || item.summary || '查看该资讯详情。', 96))}</span>
            <span class="news-meta-row">
              <span class="news-cat-tag">${escapeHtml(tag || '新闻中心')}</span>
              <span class="news-views">${escapeHtml(item.dateText || '')}</span>
            </span>
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
    const btn = (page, text = String(page), active = false) => `<button class="page-btn${active ? ' is-active' : ''}" type="button" data-page="${page}">${text}</button>`
    const parts = [btn(Math.max(1, state.page - 1), '上一页')]
    for (let page = 1; page <= pages; page += 1) {
      if (pages > 7) {
        if (page === 1 || page === pages || Math.abs(page - state.page) <= 1) {
          parts.push(btn(page, String(page), page === state.page))
        } else if (page === 2 && state.page > 4) {
          parts.push('<span style="opacity:.55;padding:0 6px">…</span>')
        } else if (page === pages - 1 && state.page < pages - 3) {
          parts.push('<span style="opacity:.55;padding:0 6px">…</span>')
        }
      } else {
        parts.push(btn(page, String(page), page === state.page))
      }
    }
    parts.push(btn(Math.min(pages, state.page + 1), '下一页'))
    pagerEl.innerHTML = parts.join('')
    pagerEl.querySelectorAll('button[data-page]').forEach(button => {
      button.addEventListener('click', () => {
        const page = Number(button.getAttribute('data-page') || '1')
        if (!Number.isFinite(page)) return
        state.page = page
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
        state.page = 1
        syncUrl()
        if (state.mode === 'api') await refreshApiData()
        update()
      })
    })
  }
  const renderSubTabs = () => {
    if (!subTabsWrap) return
    subTabsWrap.hidden = true
    subTabsWrap.style.display = 'none'
    subTabsWrap.innerHTML = ''
  }
  const updateStats = (filteredItems) => {
    const total = state.activeChannel === 'all'
      ? (Number.isFinite(Number(state.totalCount)) ? Number(state.totalCount) : state.items.length || 0)
      : filteredItems.length
    const label = state.activeChannel === 'all' ? '新闻总数' : `${getCurrentChannel()?.name || '当前分类'}数量`
    const numEl = heroStats[0]?.querySelector('.stat-num')
    if (numEl) {
      numEl.setAttribute('data-target', String(total))
      numEl.textContent = String(total)
    }
    if (statLabelEl) statLabelEl.textContent = label
  }
  const updatePageContext = (filteredItems) => {
    const current = getCurrentChannel()
    const currentName = current ? current.name : '新闻中心'
    const count = filteredItems.length
    if (heroTitleEl) heroTitleEl.textContent = current ? current.name : '新闻中心'
    if (heroSubtitleEl) {
      heroSubtitleEl.textContent = current
        ? `当前展示“${currentName}”分类下 ${count} 条资讯，按发布时间由近到远排序，支持关键词检索。`
        : `当前展示 ${count} 条资讯，覆盖集团新闻、行业动态、媒体聚焦与通知公告，支持分类浏览、搜索与分页。`
    }
    if (sectionTitleEl) sectionTitleEl.textContent = current ? currentName : '资讯聚合'
    if (sectionLeadEl) {
      sectionLeadEl.textContent = current
        ? `当前列表仅展示“${currentName}”分类下的内容，已按发布时间由近到远排序。`
        : '按分类浏览或输入关键词搜索，列表支持分页展示。'
    }
    if (crumbCurrentEl) crumbCurrentEl.textContent = current ? currentName : '新闻中心'
    document.title = current ? `${currentName}｜新闻中心｜甘孜州建设投资集团有限公司` : '新闻中心｜甘孜州建设投资集团有限公司'
    if (heroLinkEl) heroLinkEl.setAttribute('href', '#content')
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
    const params = new URLSearchParams({ page: '1', pageSize: '100', scope: 'news' })
    if (state.activeChannel !== 'all') params.set('channelSlug', state.activeChannel)
    if (state.keyword.trim()) params.set('keyword', state.keyword.trim())
    const result = await fetchJson(`/api/public/cms/articles?${params.toString()}`)
    if (!result || !Array.isArray(result.items)) return false
    if (!result.items.length && staticData.length) return false
    state.mode = 'api'
    state.items = result.items.map(normalizeApiArticle)
    if (state.activeChannel === 'all' && !state.keyword.trim()) {
      const total = Number(result.total)
      if (Number.isFinite(total) && total >= 0) state.totalCount = total
    }
    return true
  }
  const refreshTotalCount = async () => {
    const payload = await fetchJson('/api/public/news-total')
    if (payload && Number.isFinite(Number(payload.total))) {
      state.totalCount = Number(payload.total)
      return true
    }
    const result = await fetchJson('/api/public/cms/articles?page=1&pageSize=1&scope=news')
    if (result && Number.isFinite(Number(result.total))) {
      state.totalCount = Number(result.total)
      return true
    }
    return false
  }
  const loadChannels = async () => {
    const channels = await fetchJson('/api/public/cms/channels?type=news')
    if (!Array.isArray(channels) || !channels.length) {
      state.channels = [...fallbackChannels]
      return false
    }
    state.channels = channels
      .filter(item => item && typeof item.slug === 'string' && item.slug && item.name)
      .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0))
    return state.channels.length > 0
  }
  const ensureActiveChannel = () => {
    const valid = state.activeChannel === 'all' || state.channels.some(item => item.slug === state.activeChannel)
    if (!valid) state.activeChannel = 'all'
  }
  const update = () => {
    ensureActiveChannel()
    renderTabs()
    renderSubTabs()
    const filteredItems = getFiltered()
    renderList(filteredItems)
    renderPager(filteredItems.length)
    updatePageContext(filteredItems)
    updateStats(filteredItems)
  }

  updateStats(getFiltered())

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
    ensureActiveChannel()
    syncUrl()
    await refreshTotalCount()
    await refreshApiData()
    update()
  })()
})()
