(() => {
  const root = document.querySelector('[data-notice-page]')
  if (!root) return

  const CMS_API_BASE = (window.CMS_API_BASE || localStorage.getItem('CMS_API_BASE') || '').replace(/\/$/, '')
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const rootPrefix = location.pathname.replace(/\\/g, '/').includes('/pages/') ? '../../' : ''
  const currentUrl = new URL(window.location.href)

  const tabsWrap = root.querySelector('[data-notice-tabs]')
  const searchInput = document.getElementById('noticeSearch')
  const listEl = document.getElementById('noticeList')
  const pagerEl = document.getElementById('noticePager')
  const heroSubtitleEl = root.querySelector('[data-notice-hero-subtitle]')
  const sectionTitleEl = root.querySelector('[data-notice-section-title]')
  const sectionLeadEl = root.querySelector('[data-notice-section-lead]')
  const currentTagEl = root.querySelector('[data-notice-current-tag]')
  const breadcrumbCurrentEl = document.querySelector('[data-notice-breadcrumb-current]')

  const fallbackItems = (window.NEWS_LIST || [])
    .filter(item => /公告|公示/.test(String(item.category || '')))
    .map(item => normalizeStaticArticle(item))

  const state = {
    channels: [],
    items: fallbackItems,
    activeChannel: currentUrl.searchParams.get('channel') || 'all',
    keyword: '',
    page: 1,
    pageSize: 10,
    mode: Array.isArray(fallbackItems) && fallbackItems.length ? 'fallback' : 'empty'
  }

  function resolveCover(p) {
    if (!p) return ''
    if (/^(https?:)?\/\//.test(p) || p.startsWith('data:') || p.startsWith('/')) return p
    if (p.startsWith('../') || p.startsWith('./')) return p
    return rootPrefix + p.replace(/^\/+/, '')
  }

  function longDate(value) {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return ''
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  function dayText(value) {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return '--'
    return String(date.getDate()).padStart(2, '0')
  }

  function monthText(value) {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return ''
    return `${date.getMonth() + 1}月`
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
  }

  function limitText(value, max = 90) {
    const text = String(value || '').replace(/\s+/g, ' ').trim()
    return text.length > max ? `${text.slice(0, max - 1)}…` : text
  }

  async function fetchJson(pathname) {
    const targets = []
    if (pathname.startsWith('/')) targets.push(pathname)
    if (CMS_API_BASE) targets.push(`${CMS_API_BASE}${pathname}`)
    for (const target of [...new Set(targets)]) {
      try {
        const res = await fetch(target)
        const contentType = res.headers.get('content-type') || ''
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        if (!/application\/json/i.test(contentType)) throw new Error(`Unexpected content-type: ${contentType}`)
        return await res.json()
      } catch (error) {
        console.warn(`[notice] ${target} failed, trying next source if available.`, error)
      }
    }
    return null
  }

  function ensureReveal(scope) {
    const elements = Array.from((scope || root).querySelectorAll('.reveal'))
    if (prefersReduced || !('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-visible'))
      return
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.18 })
    elements.forEach(el => observer.observe(el))
  }

  function ensureLazy(scope) {
    const images = Array.from((scope || root).querySelectorAll('img[data-lazy]'))
    const load = (img) => {
      const src = img.getAttribute('data-lazy')
      if (!src) return
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true })
      img.src = src
    }
    if (!('IntersectionObserver' in window)) {
      images.forEach(load)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        load(entry.target)
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.1, rootMargin: '120px' })
    images.forEach(img => observer.observe(img))
  }

  function normalizeStaticArticle(item) {
    return {
      id: String(item.id || ''),
      channelSlug: 'announcements',
      category: item.category || '公示公告',
      title: item.title || '',
      summary: item.summary || '',
      excerpt: item.summary || '',
      img: resolveCover(item.cover || '../../img/雅砻江大桥.jpg'),
      source: item.source || '',
      author: item.author || '',
      date: item.date || '',
      dateText: item.dateText || item.date || '',
      day: item.day || dayText(item.date),
      month: item.month || monthText(item.date)
    }
  }

  function getChannelBySlug(slug) {
    return state.channels.find(item => item && item.slug === slug) || null
  }

  function getCurrentChannelLabel() {
    if (state.activeChannel === 'all') return '全部公示公告'
    return getChannelBySlug(state.activeChannel)?.name || '公示公告'
  }

  function syncChannelQuery() {
    const url = new URL(window.location.href)
    if (state.activeChannel === 'all') {
      url.searchParams.delete('channel')
    } else {
      url.searchParams.set('channel', state.activeChannel)
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }

  function normalizeApiArticle(item) {
    const publishDate = item.publishAt || item.publishDate || ''
    return {
      id: String(item.id),
      channelSlug: item.mainChannel?.slug || '',
      category: item.mainChannel?.name || '公示公告',
      title: item.title || '',
      summary: item.summary || '',
      excerpt: item.summary || '',
      img: resolveCover(item.cover || '../../img/雅砻江大桥.jpg'),
      source: item.source || '',
      author: item.author || '',
      date: publishDate,
      dateText: longDate(publishDate) || publishDate,
      day: dayText(publishDate),
      month: monthText(publishDate)
    }
  }

  function getTabs() {
    return [{ slug: 'all', label: '全部' }, ...state.channels.map(item => ({ slug: item.slug, label: item.name }))]
  }

  function getFilteredItems() {
    const keyword = state.keyword.trim().toLowerCase()
    return state.items
      .filter(item => state.activeChannel === 'all' ? true : item.channelSlug === state.activeChannel)
      .filter(item => !keyword ? true : `${item.title} ${item.summary} ${item.source}`.toLowerCase().includes(keyword))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  }

  function renderTabs() {
    if (!tabsWrap) return
    tabsWrap.innerHTML = getTabs().map(tab => `
      <button class="tab${state.activeChannel === tab.slug ? ' is-active' : ''}" type="button" data-notice-tab="${escapeHtml(tab.slug)}">${escapeHtml(tab.label)}</button>
    `).join('')
    tabsWrap.querySelectorAll('[data-notice-tab]').forEach(button => {
      button.addEventListener('click', async () => {
        state.activeChannel = button.getAttribute('data-notice-tab') || 'all'
        state.page = 1
        syncChannelQuery()
        if (state.mode === 'api') await refreshApiData()
        update()
      })
    })
  }

  function renderList(items, showEmpty = true) {
    if (!listEl) return
    const start = (state.page - 1) * state.pageSize
    const slice = items.slice(start, start + state.pageSize)
    if (!slice.length) {
      listEl.innerHTML = showEmpty ? '<div class="notice-empty">暂无符合条件的公示公告。</div>' : ''
      return
    }
    listEl.innerHTML = slice.map(item => `
      <a class="notice-item reveal" data-anim="fadeUp" href="${rootPrefix}pages/detail/notice-detail.html?id=${encodeURIComponent(item.id)}">
        <div class="notice-date">
          <strong>${escapeHtml(item.day)}</strong>
          <span>${escapeHtml(item.month)}</span>
        </div>
        <div>
          <b>${escapeHtml(limitText(item.title, 60))}</b>
          <p>${escapeHtml(limitText(item.summary || item.excerpt || '点击查看公示公告详情。', 88))}</p>
          <div class="notice-tail">
            <span>发布时间：${escapeHtml(item.dateText || '—')}</span>
            ${state.activeChannel === 'all' ? `<span>分类：${escapeHtml(item.category || '公示公告')}</span>` : ''}
            ${item.source ? `<span>来源：${escapeHtml(item.source)}</span>` : ''}
          </div>
        </div>
      </a>
    `).join('')
    ensureReveal(listEl)
    ensureLazy(listEl)
  }

  function renderPager(total) {
    if (!pagerEl) return
    if (total <= 0) {
      pagerEl.innerHTML = ''
      return
    }
    const pages = Math.max(1, Math.ceil(total / state.pageSize))
    state.page = Math.min(state.page, pages)
    const button = (page, text = String(page), active = false) => `<button class="page-btn${active ? ' is-active' : ''}" type="button" data-page="${page}">${text}</button>`
    const parts = [button(Math.max(1, state.page - 1), '上一页')]
    for (let p = 1; p <= pages; p += 1) {
      if (pages > 7) {
        if (p === 1 || p === pages || Math.abs(p - state.page) <= 1) {
          parts.push(button(p, String(p), p === state.page))
        } else if (p === 2 && state.page > 4) {
          parts.push('<span style="opacity:.55;padding:0 6px">…</span>')
        } else if (p === pages - 1 && state.page < pages - 3) {
          parts.push('<span style="opacity:.55;padding:0 6px">…</span>')
        }
      } else {
        parts.push(button(p, String(p), p === state.page))
      }
    }
    parts.push(button(Math.min(pages, state.page + 1), '下一页'))
    pagerEl.innerHTML = parts.join('')
    pagerEl.querySelectorAll('button[data-page]').forEach(buttonEl => {
      buttonEl.addEventListener('click', () => {
        const nextPage = Number(buttonEl.getAttribute('data-page') || '1')
        if (!Number.isFinite(nextPage)) return
        state.page = nextPage
        update()
        const top = root.querySelector('[data-notice-top]')
        if (top) top.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
      })
    })
  }

  async function loadChannels() {
    const channels = await fetchJson('/api/public/cms/channels?type=notice')
    if (!Array.isArray(channels) || !channels.length) return
    state.channels = channels
      .filter(item => item && item.slug)
      .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0))
    if (state.activeChannel !== 'all' && !getChannelBySlug(state.activeChannel)) {
      state.activeChannel = 'all'
      syncChannelQuery()
    }
  }

  async function refreshApiData() {
    const params = new URLSearchParams({ page: '1', pageSize: '100', scope: 'notice' })
    if (state.activeChannel !== 'all') params.set('channelSlug', state.activeChannel)
    if (state.keyword.trim()) params.set('keyword', state.keyword.trim())
    const result = await fetchJson(`/api/public/cms/articles?${params.toString()}`)
    if (!result || !Array.isArray(result.items)) return
    state.mode = 'api'
    state.items = result.items.map(normalizeApiArticle)
  }

  function updateSectionHeader() {
    const currentLabel = getCurrentChannelLabel()
    if (sectionTitleEl) sectionTitleEl.textContent = currentLabel
    if (breadcrumbCurrentEl) breadcrumbCurrentEl.textContent = currentLabel
    if (currentTagEl) currentTagEl.textContent = `当前分类：${state.activeChannel === 'all' ? '全部' : currentLabel}`
    if (sectionLeadEl) {
      sectionLeadEl.textContent = state.activeChannel === 'all'
        ? '集中查看全部公示公告内容，支持按分类切换、按关键词检索与分页浏览。'
        : `当前页面仅展示“${currentLabel}”分类下的已发布公示公告，按发布时间倒序排列。`
    }
    if (document.title) {
      document.title = state.activeChannel === 'all'
        ? '公示公告｜甘孜州建设投资集团有限公司'
        : `${currentLabel}｜公示公告｜甘孜州建设投资集团有限公司`
    }
  }

  function updateHeroSubtitle(items) {
    if (!heroSubtitleEl) return
    if (!items.length) {
      heroSubtitleEl.textContent = state.activeChannel === 'all'
        ? '当前暂无已发布公示公告，后续发布内容会在此页按分类集中展示。'
        : `当前分类“${getCurrentChannelLabel()}”暂无已发布公示公告，可切换其他分类继续查看。`
      return
    }
    if (state.activeChannel === 'all') {
      heroSubtitleEl.textContent = `当前共展示 ${items.length} 条已发布公示公告，支持按分类快速定位，并按发布时间倒序浏览。`
      return
    }
    heroSubtitleEl.textContent = `当前展示“${getCurrentChannelLabel()}”分类下 ${items.length} 条已发布内容，已按发布时间由近到远排序。`
  }

  function update() {
    renderTabs()
    const items = getFilteredItems()
    updateSectionHeader()
    renderList(items, items.length === 0)
    renderPager(items.length)
    updateHeroSubtitle(items)
    ensureReveal(root)
    ensureLazy(root)
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
    await loadChannels()
    await refreshApiData()
    update()
  })()
})()
