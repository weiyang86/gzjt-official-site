(() => {
  const root = document.querySelector('[data-projects-page]')
  if (!root) return
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const data = [
    { id:'p1', name:'川藏铁路康定枢纽站', type:'交通工程', region:'康定市', year:'2026', img:'../../配图/318康定市过境段公路工程项目434互通工程.jpg' },
    { id:'p2', name:'稻城亚丁机场改扩建', type:'交通工程', region:'稻城县', year:'2025', img:'../../配图/国道318线康定市过境段公路工程项目434互通工程建成前（后北门）.jpeg' },
    { id:'p3', name:'泸定大渡河特大桥', type:'交通工程', region:'泸定县', year:'2026', img:'../../配图/雅砻江大桥.jpg' },
    { id:'p4', name:'理塘光伏发电基地', type:'产业投资', region:'理塘县', year:'2024', img:'../../配图/青岗坪隧道建成前.JPG' },
    { id:'p5', name:'道孚藏族民居改造工程', type:'房建工程', region:'甘孜县', year:'2025', img:'../../配图/青冈坪隧道建成后.jpg' },
    { id:'p6', name:'丹巴古碉藏寨文旅综合体', type:'文旅开发', region:'九龙县', year:'2024', img:'../../配图/海螺沟路基建成前1.JPG' },
    { id:'p7', name:'巴塘水电站建设项目', type:'产业投资', region:'巴塘县', year:'2026', img:'../../配图/海螺沟路基建成后2.jpg' }
  ]

  const typeSel = document.getElementById('projectType')
  const regionSel = document.getElementById('projectRegion')
  const yearSel = document.getElementById('projectYear')
  const listEl = document.getElementById('projectList')
  const countEl = document.getElementById('projectCount')
  const mapWrap = document.querySelector('[data-fit-map]')
  const placeTip = document.getElementById('placeTip')

  const getVal = (sel) => (sel ? (sel.value || '全部') : '全部')

  const getFiltered = () => {
    const t = getVal(typeSel)
    const r = getVal(regionSel)
    const y = getVal(yearSel)
    return data.filter(x => (t === '全部' ? true : x.type === t))
      .filter(x => (r === '全部' ? true : x.region === r))
      .filter(x => (y === '全部' ? true : x.year === y))
  }

  const render = () => {
    const items = getFiltered()
    if (countEl) countEl.textContent = String(items.length)
    if (!listEl) return
    listEl.innerHTML = items.map(x => {
      const href = `../detail/project-detail.html?id=${encodeURIComponent(x.id)}`
      return `
        <a class="card reveal" data-anim="fadeUp" href="${href}" style="grid-column: span 4; display:block;">
          <div style="height:180px; position:relative; overflow:hidden;">
            <img class="lazy" data-lazy="${x.img}" alt="">
            <div style="position:absolute; inset:0; background:linear-gradient(180deg,rgba(11,18,32,.06),rgba(11,18,32,.56));"></div>
          </div>
          <div class="card-pad">
            <div class="pill">${x.type}</div>
            <div style="margin-top:12px; font-weight:950; letter-spacing:.3px; font-size:16px; color:rgba(11,18,32,.90); line-height:1.35;">${x.name}</div>
            <div class="meta" style="margin-top:12px">${x.region} · ${x.year}</div>
          </div>
        </a>
      `
    }).join('')
    if (!prefersReduced) {
      const els = Array.from(listEl.querySelectorAll('.reveal'))
      els.forEach((el, i) => el.style.transitionDelay = `${i * 60}ms`)
    }
    window.dispatchEvent(new Event('scroll'))
  }

  ;[typeSel, regionSel, yearSel].forEach(sel => {
    if (!sel) return
    sel.addEventListener('change', render)
  })

  render()

  const points = Array.from(document.querySelectorAll('.proj-point'))
  points.forEach(p => {
    p.addEventListener('mouseenter', () => {
      const name = p.getAttribute('data-place') || ''
      if (!placeTip || !mapWrap || !name) return
      const wrapRect = mapWrap.getBoundingClientRect()
      const r = p.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      placeTip.textContent = name
      placeTip.style.left = (cx - wrapRect.left) + 'px'
      placeTip.style.top = (cy - wrapRect.top) + 'px'
      placeTip.classList.add('is-visible')
    })
    p.addEventListener('mouseleave', () => {
      if (placeTip) placeTip.classList.remove('is-visible')
    })
  })
})()
