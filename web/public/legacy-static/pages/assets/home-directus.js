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
  const parseDate = (value) => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const formatLongDate = (value) => {
    const date = parseDate(value)
    if (!date) return ''
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }
  const formatMonth = (value) => {
    const date = parseDate(value)
    if (!date) return ''
    return `${date.getMonth() + 1}月`
  }
  const formatDay = (value) => {
    const date = parseDate(value)
    if (!date) return '--'
    return String(date.getDate()).padStart(2, '0')
  }

  const setText = (selector, value, max = 80) => {
    const el = document.querySelector(selector)
    if (el && value) el.textContent = limitText(value, max)
  }

  const renderBanner = async () => {
    const payload = await fetchJson('/api/public/cms/articles?limit=5&fallback=none')
    const articles = Array.isArray(payload?.items) ? payload.items.slice(0, 5) : []
    if (!articles.length) return
    const banners = articles.map((article) => {
      const channelName = String(article.mainChannel?.name || '').trim()
      const publishDate = String(article.publishDate || '').trim()
      return {
        image: String(article.cover || '').trim() || '/img/index_bg.png',
        title: String(article.title || '最新文章').trim(),
        subtitle: String(article.subtitle || '').trim()
          || String(article.summary || '').trim()
          || [channelName, publishDate].filter(Boolean).join(' · '),
        linkUrl: detailUrl(article.id),
      }
    })
    const hero = document.querySelector('[data-home-banners]')
    const link = document.querySelector('[data-banner-link]')
    const dots = document.querySelector('[data-home-banner-dots]')
    let activeIndex = 0
    const showBanner = (index) => {
      const banner = banners[index]
      if (!banner) return
      activeIndex = index
      if (hero && banner.image) hero.style.setProperty('--home-hero-img', `url('${String(banner.image).replace(/[\\"']/g, '')}')`)
      const title = document.querySelector('[data-banner-title]')
      const subtitle = document.querySelector('[data-banner-subtitle]')
      if (title) {
        title.hidden = false
        setText('[data-banner-title]', banner.title, 48)
        title.style.fontSize = 'clamp(32px, 5vw, 60px)'
        title.style.letterSpacing = '2px'
      }
      if (subtitle) {
        subtitle.hidden = false
        setText('[data-banner-subtitle]', banner.subtitle, 100)
        subtitle.style.letterSpacing = '1px'
        subtitle.style.lineHeight = '1.6'
      }
      if (link) link.setAttribute('href', '/home')
      dots?.querySelectorAll('button').forEach((button, buttonIndex) => button.setAttribute('aria-current', buttonIndex === index ? 'true' : 'false'))
    }
    if (dots && banners.length > 1) {
      dots.innerHTML = banners.map((_, index) => `<button class="home-banner-dot" type="button" aria-label="切换到第${index + 1}张轮播图" aria-current="${index === 0}"></button>`).join('')
      dots.querySelectorAll('button').forEach((button, index) => button.addEventListener('click', () => showBanner(index)))
    } else if (dots) {
      dots.remove()
    }
    showBanner(0)
    if (banners.length > 1) window.setInterval(() => showBanner((activeIndex + 1) % banners.length), 6000)
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
    const payload = await fetchJson('/api/public/cms/articles?scope=news&channelSlug=group-news&limit=5&fallback=none')
    const articles = Array.isArray(payload?.items) ? payload.items : []
    const modernFeatured = document.querySelector('[data-home-news-featured]')
    const modernList = document.querySelector('[data-home-news-list]')
    if (modernFeatured && modernList) {
      if (!articles.length) {
        modernFeatured.hidden = true
        modernList.innerHTML = '<p class="news-empty">暂无已发布新闻</p>'
        return
      }
      const featured = articles[0]
      const featuredHref = detailUrl(featured.id)
      const featuredBg = featured.cover ? `--news-featured-img: url('${featured.cover}');` : ''
      modernFeatured.hidden = false
      modernFeatured.innerHTML = `
        <a class="news-featured-bg-link" href="${featuredHref}" aria-label="${articleTitle(featured, 54)}">
          <div class="news-featured-bg" style="${featuredBg}"></div>
          <div class="news-featured-pattern"></div>
          <div class="news-featured-content">
            <span class="news-tag">${escapeHtml(featured.mainChannel?.name || '头条要闻')}</span>
            <h3 class="news-featured-title">${articleTitle(featured, 54)}</h3>
            <p class="news-featured-excerpt">${articleSummary(featured, 110)}</p>
            <span class="news-date">${escapeHtml(formatLongDate(featured.publishDate) || articleDate(featured))}</span>
          </div>
        </a>`
      modernList.innerHTML = articles.slice(1, 5).map(item => `
        <a class="news-item reveal is-visible" href="${detailUrl(item.id)}" style="${item.cover ? `--news-img: url('${item.cover}');` : ''}">
          <div class="news-item-date">
            <div class="nid-day">${formatDay(item.publishDate)}</div>
            <div class="nid-month">${formatMonth(item.publishDate)}</div>
          </div>
          <div class="news-item-body">
            <h4 class="news-item-title">${articleTitle(item, 52)}</h4>
            <div class="news-item-meta">
              <span class="news-cat">${escapeHtml(item.mainChannel?.name || '集团新闻')}</span>
              <span>${escapeHtml(formatLongDate(item.publishDate) || articleDate(item))}</span>
            </div>
          </div>
        </a>`).join('')
      return
    }
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

  const renderTopicArticles = async () => {
    const payload = await fetchJson('/api/public/cms/articles?scope=news&channelSlug=party-mass&limit=4&fallback=none')
    const list = document.querySelector('[data-home-topic-links]')
    if (!list) return
    const articles = Array.isArray(payload?.items) ? payload.items : []
    if (!articles.length) {
      list.innerHTML = '<span class="news-empty">暂无已发布专题内容</span>'
      return
    }
    list.innerHTML = articles.map(item => `<a href="${detailUrl(item.id)}">${articleTitle(item, 48)}</a>`).join('')
  }

  const renderHomeQrs = async () => {
    const list = document.querySelector('[data-home-public-qrs]')
    if (!list) return
    const items = await fetchJson('/api/public/cms/public-platform-qrs')
    const validItems = Array.isArray(items) ? items.filter(item => item && item.image) : []
    const hasGroupQr = validItems.some(item => /集团.*官网|官网.*二维码/.test(String(item.title || '')))
    list.innerHTML = validItems.map(item => `
      <div class="footer-qr-card">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || '微信公众号二维码')}" loading="lazy">
        <span>${escapeHtml(item.title || '微信公众号二维码')}</span>
      </div>`).join('') + (hasGroupQr ? '' : `
      <div class="footer-qr-card">
        <div class="footer-qr-placeholder">集团官网二维码待上传</div>
        <span>集团官网二维码</span>
      </div>`)
  }

  const renderSiteSettings = async () => {
    const settings = await fetchJson('/api/public/cms/site-settings')
    if (!settings) return
    const footer = document.querySelector('[data-site-footer-text]')
    if (!footer) return
    const year = new Date().getFullYear()
    const text = settings.footerText || settings.siteName
    if (text) footer.textContent = `© ${year} ${limitText(text, 42)} 版权所有`
  }

  const initializeHomeContent = () => {
    renderBanner()
    renderHomeSections()
    renderGroupNews()
    renderTopicArticles()
    renderHomeQrs()
    renderSiteSettings()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeHomeContent, { once: true })
  else initializeHomeContent()
})()
