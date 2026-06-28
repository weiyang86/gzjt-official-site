(() => {
  const root = document.querySelector('[data-detail]')
  if (!root) return

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
  const idFromPath = (() => {
    const m = path.match(/\/news\/detail\/([^\/?#]+)/)
    return m ? decodeURIComponent(m[1]) : ''
  })()
  const id = qs.get('id') || idFromPath || ''
  const kind = root.getAttribute('data-detail') || ''

  const newsList = Array.isArray(window.NEWS_LIST) ? window.NEWS_LIST : []

  const projects = {
    p1:{ title:'川藏铁路康定枢纽站', date:'2026', source:'交通工程', cover:'../../配图/318康定市过境段公路工程项目434互通工程.jpg' },
    p3:{ title:'泸定大渡河特大桥', date:'2026', source:'交通工程', cover:'../../配图/雅砻江大桥.jpg' },
    p6:{ title:'丹巴古碉藏寨文旅综合体', date:'2024', source:'文旅开发', cover:'../../配图/海螺沟路基建成后2.jpg' }
  }

  const articles = {
    a1:{ title:'开展专题学习与交流研讨，推动学用结合', date:'2026-05-18', source:'党委办公室', cover:'../../配图/国道317线（川藏公路北线）雀儿山隧道工程.jpg' },
    s1:{ title:'学习要点：理论学习与高质量发展方法论', date:'2026-06-01', source:'学习专栏', cover:'../../配图/雅砻江大桥.jpg' },
    job:{ title:'人才招聘入口（示意）', date:'2026-06-01', source:'人力资源部', cover:'../../配图/海螺沟路基建成前1.JPG' }
  }

  const dict = kind === 'project' ? projects : articles
  const cur = kind === 'news'
    ? (newsList.find(x => String(x.id) === String(id)) || null)
    : (dict[id] || null)

  const titleEl = document.querySelector('[data-detail-title]')
  const metaEl = document.querySelector('[data-detail-meta]')
  const coverEl = document.querySelector('[data-detail-cover]')
  const bodyEl = document.querySelector('[data-detail-body]')

  const fallback = {
    title: document.title.replace('｜甘孜州建设投资集团有限公司',''),
    date: '2026-06-01',
    source: '甘孜州建设投资集团有限公司',
    cover: '../../配图/雅砻江大桥.jpg'
  }
  const val = cur ? {
    title: cur.title,
    date: cur.dateText || cur.date || '',
    source: cur.category ? `分类：${cur.category}` : '',
    cover: cur.cover || ''
  } : fallback

  if (titleEl) titleEl.textContent = val.title
  if (metaEl) metaEl.textContent = `发布时间：${val.date}${val.source ? ` · ${val.source}` : ''}${cur && cur.views ? ` · 阅读：${cur.views}` : ''}`
  if (coverEl) coverEl.src = resolveCover(val.cover)
  if (bodyEl) {
    bodyEl.innerHTML = [
      (cur && cur.summary) ? cur.summary : '为提升信息发布的可读性与可检索性，本页面采用统一详情页模板展示内容。后续可接入 CMS/接口将正文、附件、关联内容动态渲染。',
      '集团坚持以高质量发展为主线，强化安全、质量、进度、成本协同管控，推进标准化、数字化治理能力建设。',
      '本段为示例正文，可替换为真实新闻稿、项目介绍或学习文章内容。'
    ].map(t => `<p>${t}</p>`).join('')
  }

  const back = document.querySelector('[data-back]')
  if (back) {
    const href = kind === 'news' ? '../news/index.html' : (kind === 'project' ? '../projects/index.html' : '../party/index.html')
    back.setAttribute('href', href)
  }

  if (kind === 'news' && newsList.length) {
    const idx = newsList.findIndex(x => String(x.id) === String(id))
    const prev = idx > 0 ? newsList[idx - 1] : null
    const next = idx >= 0 && idx < newsList.length - 1 ? newsList[idx + 1] : null

    const pager = document.querySelector('.pager')
    if (pager) {
      const links = Array.from(pager.querySelectorAll('a'))
      const apply = (a, item, fallbackText) => {
        if (!a) return
        if (item) {
          a.href = `../detail/news-detail.html?id=${encodeURIComponent(item.id)}`
          const small = a.querySelector('small')
          if (small) small.textContent = item.title || ''
        } else {
          a.href = '../news/index.html'
          const small = a.querySelector('small')
          if (small) small.textContent = fallbackText
        }
      }
      apply(links[0], prev, '已是第一篇')
      apply(links[1], next, '已是最后一篇')
    }

    const grid = document.querySelector('.grid')
    if (grid) {
      const cards = Array.from(grid.querySelectorAll('a.card')).slice(0, 2)
      const recs = newsList.filter(x => String(x.id) !== String(id)).slice(0, 2)
      cards.forEach((card, i) => {
        const item = recs[i]
        if (!item) return
        card.href = `../detail/news-detail.html?id=${encodeURIComponent(item.id)}`
        const pill = card.querySelector('.pill')
        const meta = card.querySelector('.meta')
        const blocks = Array.from(card.querySelectorAll('div'))
        const title = blocks.find(d => /font-weight:\s*950/.test(d.getAttribute('style') || '')) || null
        if (pill) pill.textContent = item.category || ''
        if (title) title.textContent = item.title || ''
        if (meta) meta.textContent = item.dateText || item.date || ''
      })
    }
  }
})()
