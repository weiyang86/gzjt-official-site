(() => {
  const CMS_API_BASE = (window.CMS_API_BASE || localStorage.getItem('CMS_API_BASE') || 'http://localhost:4000').replace(/\/$/, '')
  const detailUrl = (id) => `/pages/detail/news-detail.html?id=${encodeURIComponent(id)}`

  const fetchJson = async (path) => {
    try {
      const res = await fetch(`${CMS_API_BASE}${path}`)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return await res.json()
    } catch (err) {
      console.warn(`[home-directus] ${path} failed, keeping static fallback.`, err)
      return null
    }
  }

  const limitText = (value, max = 80) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim()
    return text.length > max ? `${text.slice(0, max - 1)}…` : text
  }

  const setText = (selector, value, max = 80) => {
    const el = document.querySelector(selector)
    if (el && value) el.textContent = limitText(value, max)
  }

  const renderBanner = async () => {
    const banners = await fetchJson('/api/public/cms/banners?position=home')
    if (!Array.isArray(banners) || !banners.length) return
    const banner = banners[0]
    const hero = document.querySelector('[data-home-banners]')
    if (hero && banner.image) hero.style.setProperty('--home-hero-img', `url('${banner.image}')`)
    setText('[data-banner-title]', banner.title, 36)
    setText('[data-banner-subtitle]', banner.subtitle, 96)
    const link = document.querySelector('[data-banner-link]')
    if (link && banner.linkUrl) link.setAttribute('href', banner.linkUrl)
  }

  const escapeHtml = (value) => String(value || '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[ch]))
  const escapeSelector = (value) => window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/[\\"\]]/g, '\\$&')
  const safeHref = (value) => {
    const href = String(value || '').trim()
    return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href) ? href : '#'
  }
  const articleTitle = (item, max = 46) => item && item.title ? escapeHtml(limitText(item.title, max)) : '未命名文章'
  const articleDate = (item) => item && item.publishDate ? escapeHtml(item.publishDate) : ''
  const articleSummary = (item, max = 96) => item && item.summary ? escapeHtml(limitText(item.summary, max)) : ''

  const renderGroupNews = async () => {
    const articles = await fetchJson('/api/public/cms/articles/by-channel/group-news?limit=5')
    if (!Array.isArray(articles) || !articles.length) return
    const root = document.querySelector('[data-home-section="group-news"]')
    if (!root) return
    const featured = articles[0]
    const cover = featured.cover || ''
    const featureHtml = `
      <a class="cms-feature" href="${detailUrl(featured.id)}" style="${cover ? `--card-img:url('${cover}')` : ''}">
        <div class="cms-feature-body">
          <div class="cms-date">${articleDate(featured)}</div>
          <h2>${articleTitle(featured, 54)}</h2>
          <p>${articleSummary(featured, 110)}</p>
        </div>
      </a>`
    const listHtml = `<div class="cms-list">${articles.slice(1).map(item => `
      <a class="cms-item" href="${detailUrl(item.id)}">
        <span class="cms-item-title">${articleTitle(item)}</span>
        <span class="cms-date">${articleDate(item)}</span>
      </a>`).join('')}</div>`
    root.innerHTML = featureHtml + listHtml
  }

  const renderChannel = async (slug, limit = 4) => {
    const articles = await fetchJson(`/api/public/cms/articles/by-channel/${encodeURIComponent(slug)}?limit=${limit}`)
    if (!Array.isArray(articles) || !articles.length) return
    const card = document.querySelector(`[data-channel-card="${slug}"]`)
    const list = card ? card.querySelector('ul') : null
    if (!list) return
    list.innerHTML = articles.map(item => `<li><a href="${detailUrl(item.id)}">${articleTitle(item, 42)}<br><span class="cms-date">${articleDate(item)}</span></a></li>`).join('')
  }

  const renderHomeSections = async () => {
    const sections = await fetchJson('/api/public/cms/home-sections')
    if (!Array.isArray(sections) || !sections.length) return
    sections.forEach(section => {
      const channel = section.channelSlug || section.collectionKey || section.slug
      if (!channel || !section.title) return
      const title = document.querySelector(`[data-cms-section-title="${escapeSelector(channel)}"]`)
      if (title) title.textContent = limitText(section.title, 28)
    })
  }

  const renderQuickLinks = async () => {
    const links = await fetchJson('/api/public/cms/quick-links?position=home')
    if (!Array.isArray(links) || !links.length) return
    const card = document.querySelector('[data-quick-links]')
    const list = card ? card.querySelector('ul') : null
    if (!list) return
    list.innerHTML = links.slice(0, 6).map(item => {
      const href = safeHref(item.url || item.linkUrl || '#')
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(limitText(item.title, 18))}</a></li>`
    }).join('')
  }

  const renderSiteSettings = async () => {
    const settings = await fetchJson('/api/public/cms/site-settings')
    if (!settings) return
    const footer = document.querySelector('[data-site-footer-text]')
    if (!footer) return
    const year = new Date().getFullYear()
    const text = settings.footerText || settings.siteName
    if (text) footer.textContent = `© ${year} ${limitText(text, 42)}`
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderBanner()
    renderHomeSections()
    renderGroupNews()
    renderChannel('business-news')
    renderChannel('party-mass')
    renderChannel('announcements')
    renderQuickLinks()
    renderSiteSettings()
  })
})()
