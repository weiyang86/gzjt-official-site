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

  const setText = (selector, value) => {
    const el = document.querySelector(selector)
    if (el && value) el.textContent = value
  }

  const renderBanner = async () => {
    const banners = await fetchJson('/api/public/cms/banners?position=home')
    if (!Array.isArray(banners) || !banners.length) return
    const banner = banners[0]
    const hero = document.querySelector('[data-home-banners]')
    if (hero && banner.image) hero.style.setProperty('--home-hero-img', `url('${banner.image}')`)
    setText('[data-banner-title]', banner.title)
    setText('[data-banner-subtitle]', banner.subtitle)
    const link = document.querySelector('[data-banner-link]')
    if (link && banner.linkUrl) link.setAttribute('href', banner.linkUrl)
  }

  const escapeHtml = (value) => String(value || '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[ch]))
  const articleTitle = (item) => item && item.title ? escapeHtml(item.title) : '未命名文章'
  const articleDate = (item) => item && item.publishDate ? escapeHtml(item.publishDate) : ''
  const articleSummary = (item) => item && item.summary ? escapeHtml(item.summary) : ''

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
          <h2>${articleTitle(featured)}</h2>
          <p>${articleSummary(featured)}</p>
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
    list.innerHTML = articles.map(item => `<li><a href="${detailUrl(item.id)}">${articleTitle(item)}<br><span class="cms-date">${articleDate(item)}</span></a></li>`).join('')
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderBanner()
    renderGroupNews()
    renderChannel('business-news')
    renderChannel('party-mass')
    renderChannel('announcements')
  })
})()
