(() => {
  const root = document.querySelector('[data-detail]')
  if (!root) return
  const CMS_API_BASE = (window.CMS_API_BASE || localStorage.getItem('CMS_API_BASE') || 'http://localhost:4000').replace(/\/$/, '')

  const qs = new URLSearchParams(window.location.search)
  const path = location.pathname.replace(/\\/g, '/')
  const rootPrefix = path.includes('/pages/') ? '../../' : ''
  const resolveCover = (p) => {
    if (!p) return ''
    if (/^(https?:)?\/\//.test(p)) return p
    if (p.startsWith('data:')) return p
    if (p.startsWith('/')) return p
    if (p.startsWith('../') || p.startsWith('./')) return p
    return rootPrefix + p.replace(/^\/+/, '')
  }
  const fetchJson = async (pathname) => {
    try {
      const res = await fetch(`${CMS_API_BASE}${pathname}`)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return await res.json()
    } catch (err) {
      console.warn(`[detail] ${pathname} failed, keeping static fallback.`, err)
      return null
    }
  }
  const escapeHtml = (value) => String(value || '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
  const longDate = (value) => {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return ''
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }
  const idFromPath = (() => {
    const m = path.match(/\/news\/detail\/([^\/?#]+)/)
    return m ? decodeURIComponent(m[1]) : ''
  })()
  const id = qs.get('id') || idFromPath || ''
  const kind = root.getAttribute('data-detail') || ''
  const isArticleKind = kind === 'news' || kind === 'notice'
  const detailListPath = kind === 'notice' ? '../disclosure/index.html' : '../news/index.html'
  const detailPagePath = kind === 'notice' ? '../detail/notice-detail.html' : '../detail/news-detail.html'
  const articleScope = kind === 'notice' ? 'notice' : 'news'

  const newsList = Array.isArray(window.NEWS_LIST) ? window.NEWS_LIST : []

  const projects = {
    p1:{ title:'川藏铁路康定枢纽站', date:'2026', source:'交通工程', cover:'../../img/318康定市过境段公路工程项目434互通工程.jpg' },
    p3:{ title:'泸定大渡河特大桥', date:'2026', source:'交通工程', cover:'../../img/雅砻江大桥.jpg' },
    p6:{ title:'丹巴古碉藏寨文旅综合体', date:'2024', source:'文旅开发', cover:'../../img/海螺沟路基建成后2.jpg' }
  }

  const articles = {
    a1:{ title:'开展专题学习与交流研讨，推动学用结合', date:'2026-05-18', source:'党委办公室', cover:'../../img/国道317线（川藏公路北线）雀儿山隧道工程.jpg' },
    s1:{ title:'学习要点：理论学习与高质量发展方法论', date:'2026-06-01', source:'学习专栏', cover:'../../img/雅砻江大桥.jpg' },
    job:{ title:'人才招聘入口（示意）', date:'2026-06-01', source:'人力资源部', cover:'../../img/海螺沟路基建成前1.JPG' }
  }

  const dict = kind === 'project' ? projects : articles
  const cur = kind === 'news'
    ? (newsList.find(x => String(x.id) === String(id)) || null)
    : (dict[id] || null)

  const titleEl = document.querySelector('[data-detail-title]')
  const metaEl = document.querySelector('[data-detail-meta]')
  const coverEl = document.querySelector('[data-detail-cover]')
  const bodyEl = document.querySelector('[data-detail-body]')
  const attachmentsEl = document.querySelector('[data-detail-attachments]')
  const pagerEl = document.querySelector('[data-news-pager]')
  const relatedGridEl = document.querySelector('[data-news-related-grid]')

  const fallback = {
    title: document.title.replace('｜甘孜州建设投资集团有限公司',''),
    date: '2026-06-01',
    source: '甘孜州建设投资集团有限公司',
    cover: '../../img/雅砻江大桥.jpg'
  }

  const back = document.querySelector('[data-back]')
  if (back) {
    const href = isArticleKind ? detailListPath : (kind === 'project' ? '../projects/index.html' : '../party/index.html')
    back.setAttribute('href', href)
  }

  const renderBody = (html, summary = '') => {
    if (!bodyEl) return
    if (html) {
      bodyEl.innerHTML = html
      return
    }
    bodyEl.innerHTML = [
      summary || '为提升信息发布的可读性与可检索性，本页面采用统一详情页模板展示内容。后续可接入 CMS/接口将正文、附件、关联内容动态渲染。',
      '集团坚持以高质量发展为主线，强化安全、质量、进度、成本协同管控，推进标准化、数字化治理能力建设。',
      '本段为示例正文，可替换为真实新闻稿、项目介绍或学习文章内容。'
    ].map(t => `<p>${escapeHtml(t)}</p>`).join('')
  }

  const renderAttachments = (attachments) => {
    if (!attachmentsEl) return
    if (!Array.isArray(attachments) || !attachments.length) {
      attachmentsEl.hidden = true
      attachmentsEl.innerHTML = ''
      return
    }
    attachmentsEl.hidden = false
    attachmentsEl.innerHTML = attachments.map((item, index) => `
      <div class="attach">
        <span><b>${escapeHtml(item.title || `附件${index + 1}`)}</b><br><small>${escapeHtml(item.url || '')}</small></span>
        <a class="btn" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noreferrer">下载</a>
      </div>
    `).join('')
  }

  const renderPager = (items) => {
    if (!pagerEl) return
    const links = Array.from(pagerEl.querySelectorAll('a'))
    const idx = items.findIndex(item => String(item.id) === String(id))
    const prev = idx > 0 ? items[idx - 1] : null
    const next = idx >= 0 && idx < items.length - 1 ? items[idx + 1] : null
    const apply = (anchor, item, fallbackText) => {
      if (!anchor) return
      const small = anchor.querySelector('small')
      if (item) {
        anchor.href = `${detailPagePath}?id=${encodeURIComponent(item.id)}`
        if (small) small.textContent = item.title || ''
      } else {
        anchor.href = detailListPath
        if (small) small.textContent = fallbackText
      }
    }
    apply(links[0], prev, '已是第一篇')
    apply(links[1], next, '已是最后一篇')
  }

  const renderRelated = (items) => {
    if (!relatedGridEl) return
    const related = items.filter(item => String(item.id) !== String(id)).slice(0, 3)
    if (!related.length) {
      relatedGridEl.innerHTML = ''
      return
    }
    relatedGridEl.innerHTML = related.map(item => `
      <a class="card reveal" data-anim="fadeUp" href="${detailPagePath}?id=${encodeURIComponent(item.id)}" style="grid-column:span 4;display:block;">
        <div class="card-pad">
          <div class="pill">${escapeHtml(item.category || (kind === 'notice' ? '公示公告' : '新闻资讯'))}</div>
          <div style="margin-top:12px;font-weight:950;letter-spacing:.3px;font-size:16px">${escapeHtml(item.title || '')}</div>
          <div class="meta" style="margin-top:10px">${escapeHtml(item.dateText || item.date || '')}</div>
        </div>
      </a>
    `).join('')
  }

  const renderNewsArticle = (item) => {
    const title = item.title || fallback.title
    const dateText = longDate(item.publishAt || item.publishDate || item.date) || item.publishDate || item.dateText || fallback.date
    const label = item.newsSubcategory
      ? `${item.mainChannel?.name || item.category || (kind === 'notice' ? '公示公告' : '新闻中心')} · ${item.newsSubcategory}`
      : (item.mainChannel?.name || item.category || (kind === 'notice' ? '公示公告' : '新闻中心'))
    const sourceParts = [label, item.source, item.author].filter(Boolean)
    if (titleEl) titleEl.textContent = title
    if (metaEl) metaEl.textContent = `发布时间：${dateText}${sourceParts.length ? ` · ${sourceParts.join(' · ')}` : ''}${item.views ? ` · 阅读：${item.views}` : ''}`
    if (coverEl) coverEl.src = resolveCover(item.cover || '../../img/雅砻江大桥.jpg')
    renderBody(item.content || '', item.summary || '')
    renderAttachments(item.attachments || [])
    document.title = `${title}｜甘孜州建设投资集团有限公司`
  }

  const renderNonNewsFallback = () => {
    const val = cur ? {
      title: cur.title,
      date: cur.dateText || cur.date || '',
      source: cur.category ? `分类：${cur.category}` : '',
      cover: cur.cover || ''
    } : fallback
    if (titleEl) titleEl.textContent = val.title
    if (metaEl) metaEl.textContent = `发布时间：${val.date}${val.source ? ` · ${val.source}` : ''}${cur && cur.views ? ` · 阅读：${cur.views}` : ''}`
    if (coverEl) coverEl.src = resolveCover(val.cover || '../../img/雅砻江大桥.jpg')
    renderBody('', cur && cur.summary ? cur.summary : '')
  }

  const renderNewsFallback = () => {
    const fallbackList = (kind === 'notice'
      ? newsList.filter(item => /公告|公示/.test(String(item.category || '')))
      : newsList
    ).map(item => ({
      id: String(item.id),
      title: item.title || '',
      date: item.date || '',
      dateText: item.dateText || item.date || '',
      category: item.category || '',
      newsSubcategory: item.subCategory || '',
      cover: item.cover || '../../img/雅砻江大桥.jpg',
      summary: item.summary || '',
      source: item.category || ''
    }))
    const current = fallbackList.find(item => String(item.id) === String(id)) || null
    renderNewsArticle(current || fallback)
    renderPager(fallbackList)
    renderRelated(fallbackList)
  }

  if (!isArticleKind) {
    renderNonNewsFallback()
    return
  }

  ;(async () => {
    const detail = id ? await fetchJson(`/api/public/cms/articles/${encodeURIComponent(id)}`) : null
    if (!detail) {
      renderNewsFallback()
      return
    }
    renderNewsArticle(detail)
    const channelSlug = detail.mainChannel?.slug || ''
    const query = channelSlug
      ? `/api/public/cms/articles?page=1&pageSize=100&scope=${encodeURIComponent(articleScope)}&channelSlug=${encodeURIComponent(channelSlug)}`
      : `/api/public/cms/articles?page=1&pageSize=100&scope=${encodeURIComponent(articleScope)}`
    const context = await fetchJson(query)
    const contextItems = Array.isArray(context?.items) && context.items.length
      ? context.items.map(item => ({
          id: String(item.id),
          title: item.title || '',
          date: item.publishAt || item.publishDate || '',
          dateText: longDate(item.publishAt || item.publishDate) || item.publishDate || '',
          category: item.mainChannel?.name || '',
          newsSubcategory: item.newsSubcategory || '',
          cover: item.cover || '../../img/雅砻江大桥.jpg',
          summary: item.summary || '',
          source: item.source || ''
        }))
      : (kind === 'notice'
          ? newsList.filter(item => /公告|公示/.test(String(item.category || '')))
          : newsList
        ).map(item => ({
          id: String(item.id),
          title: item.title || '',
          date: item.date || '',
          dateText: item.dateText || item.date || '',
          category: item.category || '',
          newsSubcategory: item.subCategory || '',
          cover: item.cover || '../../img/雅砻江大桥.jpg',
          summary: item.summary || '',
          source: item.category || ''
        }))
    renderPager(contextItems)
    renderRelated(contextItems)
  })()
})()
