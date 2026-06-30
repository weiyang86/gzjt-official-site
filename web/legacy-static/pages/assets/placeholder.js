(() => {
  const decodeSafe = (v) => {
    try { return decodeURIComponent(v) } catch (e) { return v }
  }

  const flatten = (nodes, trail = []) => {
    const res = []
    ;(nodes || []).forEach((n) => {
      const nextTrail = trail.concat(n)
      res.push({ node: n, trail: nextTrail })
      if (n && n.children && n.children.length) {
        res.push(...flatten(n.children, nextTrail))
      }
    })
    return res
  }

  const pathname = decodeSafe(location.pathname.replace(/\\/g, '/')).replace(/\/+$/, '') || '/'
  const all = flatten(window.SITE_NAV || [])
  const hit = all.find(x => (x.node?.path || '').replace(/\/+$/, '') === pathname)
  const trail = hit ? hit.trail : []

  const title = trail.length ? trail[trail.length - 1].title : '内容建设中'
  const pageTitleEl = document.querySelector('[data-page-title]')
  if (pageTitleEl) pageTitleEl.textContent = title
  document.title = `${title}｜甘孜州建设投资集团有限公司`

  const crumb = document.querySelector('[data-breadcrumb]')
  if (crumb) {
    const parts = [{ title: '首页', path: '/index.html' }]
    trail.forEach(n => parts.push({ title: n.title, path: n.path }))
    crumb.innerHTML = parts.map((p, idx) => {
      const isLast = idx === parts.length - 1
      if (isLast) return `<span>${p.title}</span>`
      return `<a href="${p.path}"${idx === 0 ? ' data-no-transition' : ''}>${p.title}</a><span class="crumb-sep">›</span>`
    }).join('')
  }

  const y = document.getElementById('y')
  if (y) y.textContent = String(new Date().getFullYear())
})()

