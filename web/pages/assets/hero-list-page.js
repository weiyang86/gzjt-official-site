(() => {
  const decodeSafe = (v) => {
    try { return decodeURIComponent(v) } catch (e) { return v }
  }

  const normalize = (v) => (v || '').replace(/\\/g, '/').replace(/\/+$/, '') || '/'

  const flatten = (nodes, trail = [], parent = null) => {
    const res = []
    ;(nodes || []).forEach((node) => {
      const nextTrail = trail.concat(node)
      res.push({ node, trail: nextTrail, parent })
      if (node && Array.isArray(node.children) && node.children.length) {
        res.push(...flatten(node.children, nextTrail, node))
      }
    })
    return res
  }

  const toKicker = (trail) => trail.map(item => String(item.title || '').toUpperCase()).join(' / ') || 'SECTION'

  const pathname = normalize(decodeSafe(location.pathname))
  const all = flatten(window.SITE_NAV || [])
  const current = all.find(item => normalize(item.node && item.node.path) === pathname)

  const trail = current ? current.trail : []
  const node = current ? current.node : null
  const parent = current ? current.parent : null
  const title = node ? node.title : '栏目页'
  const children = node && Array.isArray(node.children) ? node.children : []
  const siblings = parent && Array.isArray(parent.children) ? parent.children.filter(item => item.path !== node.path) : []

  const topPath = normalize(trail[0] && trail[0].path)
  const heroImagesByRoot = {
    '/business-dynamics': [
      '/img/雅砻江大桥.jpg',
      '/img/318康定市过境段公路工程项目434互通工程.jpg',
      '/img/海螺沟路基建成后2.jpg'
    ],
    '/clean-gov': [
      '/img/雀儿山隧道建成后.jpeg',
      '/img/雀儿山隧道建成前1.jpeg',
      '/img/雀儿山隧道建成前2.jpeg'
    ],
    '/subsidiaries': [
      '/img/国道317线（川藏公路北线）雀儿山隧道工程.jpg',
      '/img/青冈坪隧道建成后.jpg',
      '/img/海螺沟路基建成前1.JPG'
    ],
    '/disclosure': [
      '/img/国道318线康定市过境段公路工程项目434互通工程建成前（后北门）.jpeg',
      '/img/青岗坪隧道建成前.JPG',
      '/img/海螺沟路基建成后2.jpg'
    ]
  }

  const setText = (selector, value) => {
    const el = document.querySelector(selector)
    if (el) el.textContent = value
  }

  const imgs = Array.from(document.querySelectorAll('.hero-bg .swiper-slide img'))
  const pics = heroImagesByRoot[topPath]
  if (imgs.length && Array.isArray(pics) && pics.length) {
    imgs.forEach((img, idx) => {
      const pick = pics[idx] || pics[pics.length - 1] || pics[0]
      img.setAttribute('src', encodeURI(pick))
    })
  }

  setText('[data-page-title]', title)
  setText('[data-page-kicker]', toKicker(trail))
  setText('[data-page-sub]', children.length ? `进入“${title}”栏目，以下为该栏目下的结构入口。` : `当前为“${title}”栏目内容页入口。`)
  setText('[data-page-desc]', children.length ? '按树形结构进入栏目，支持后续继续扩展更深层级。' : '当前页面采用统一模板展示内容，保持站点风格一致。')

  document.title = `${title}｜甘孜州建设投资集团有限公司`

  const crumb = document.querySelector('[data-breadcrumb]')
  if (crumb) {
    const parts = [{ title: '首页', path: '/index.html' }].concat(trail.map(item => ({ title: item.title, path: item.path })))
    crumb.innerHTML = parts.map((part, index) => {
      const isLast = index === parts.length - 1
      if (isLast) return `<span>${part.title}</span>`
      return `<a href="${part.path}"${index === 0 ? ' data-no-transition' : ''}>${part.title}</a><span class="crumb-sep">›</span>`
    }).join('')
  }

  const childrenSection = document.querySelector('[data-children-section]')
  const childrenGrid = document.querySelector('[data-children-grid]')
  if (childrenSection && childrenGrid && children.length) {
    childrenSection.hidden = false
    childrenGrid.innerHTML = children.map((item) => `
      <article class="card reveal" data-anim="fadeUp" style="grid-column:span 4">
        <div class="card-pad">
          <div class="pill">栏目入口</div>
          <h3 style="margin:14px 0 8px;font-size:22px;font-weight:800">${item.title}</h3>
          <p style="margin:0 0 16px;color:rgba(11,18,32,.64);line-height:1.8">进入“${item.title}”栏目。</p>
          <a class="btn btn--primary" href="${item.path}">进入栏目</a>
        </div>
      </article>
    `).join('')
  }

  const siblingsSection = document.querySelector('[data-siblings-section]')
  const siblingsTabs = document.querySelector('[data-siblings-tabs]')
  if (siblingsSection && siblingsTabs && siblings.length) {
    siblingsSection.hidden = false
    siblingsTabs.innerHTML = siblings.map(item => `<a class="tab" href="${item.path}">${item.title}</a>`).join('')
  }

  const y = document.getElementById('y')
  if (y) y.textContent = String(new Date().getFullYear())
})()
