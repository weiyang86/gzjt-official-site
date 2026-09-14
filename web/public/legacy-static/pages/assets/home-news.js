(() => {
  const list = window.NEWS_LIST
  if (!Array.isArray(list) || list.length === 0) return

  const rootPrefix = location.pathname.replace(/\\/g, '/').includes('/pages/') ? '../../' : ''
  const resolveCover = (p) => {
    if (!p) return ''
    if (/^(https?:)?\/\//.test(p)) return p
    if (p.startsWith('data:')) return p
    if (p.startsWith('/')) return p
    if (p.startsWith('../') || p.startsWith('./')) return p
    return rootPrefix + p.replace(/^\/+/, '')
  }

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

  const featuredEl = document.querySelector('.news-section .news-featured')
  const featuredBg = featuredEl ? featuredEl.querySelector('.news-featured-bg') : null
  const featuredTag = featuredEl ? featuredEl.querySelector('.news-tag') : null
  const featuredTitle = featuredEl ? featuredEl.querySelector('.news-featured-title') : null
  const featuredExcerpt = featuredEl ? featuredEl.querySelector('.news-featured-excerpt') : null
  const featuredDate = featuredEl ? featuredEl.querySelector('.news-date') : null

  const top = list[0]
  if (featuredEl && top) {
    if (featuredBg) featuredBg.style.setProperty('--news-featured-img', `url('${resolveCover(top.cover)}')`)
    if (featuredTag) featuredTag.textContent = top.category || ''
    if (featuredTitle) featuredTitle.textContent = top.title || ''
    if (featuredExcerpt) featuredExcerpt.textContent = top.summary || ''
    if (featuredDate) featuredDate.textContent = top.dateText || ''
    featuredEl.addEventListener('click', () => navigate(`pages/detail/news-detail.html?id=${encodeURIComponent(top.id)}`))
  }

  const items = Array.from(document.querySelectorAll('.news-section .news-list .news-item'))
  items.forEach((el, idx) => {
    const data = list[idx + 1]
    if (!data) return
    el.style.setProperty('--news-img', `url('${resolveCover(data.cover)}')`)
    const dayEl = el.querySelector('.nid-day')
    const monthEl = el.querySelector('.nid-month')
    const titleEl = el.querySelector('.news-item-title')
    const catEl = el.querySelector('.news-cat')
    const metaEls = el.querySelectorAll('.news-item-meta span')
    if (dayEl) dayEl.textContent = data.day || ''
    if (monthEl) monthEl.textContent = data.month || ''
    if (titleEl) titleEl.textContent = data.title || ''
    if (catEl) catEl.textContent = data.category || ''
    if (metaEls.length >= 2) metaEls[1].textContent = data.views ? `阅读 ${data.views}` : ''
    el.addEventListener('click', () => navigate(`pages/detail/news-detail.html?id=${encodeURIComponent(data.id)}`))
  })
})()
