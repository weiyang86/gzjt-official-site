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

  const setText = (selector, value) => {
    const el = document.querySelector(selector)
    if (el) el.textContent = value
  }

  setText('[data-page-title]', title)
  setText('[data-page-kicker]', toKicker(trail))
  setText('[data-page-tag]', children.length ? '栏目导航' : '内容说明')
  const isOrgRoot = pathname === '/group/organization'
  setText('[data-page-sub]', children.length
    ? (isOrgRoot ? '当前为“组织架构”栏目入口，以下以组织架构图形式展示层级入口，点击模块可进入对应栏目。' : `当前为“${title}”栏目入口，以下展示该栏目下的页面结构。`)
    : `当前为“${title}”内容页入口，采用统一无轮播模板。`)
  setText('[data-page-desc]', children.length
    ? (isOrgRoot ? '组织架构图仅改变入口表达形式，页面整体风格沿用站点统一设计。' : '页面结构保持统一，仅承载面包屑导航、栏目标题与内容区域，便于后续按栏目批量扩展。')
    : '当前页面不使用轮播图与 Banner，保留统一站点风格，后续可直接填充正文内容。')

  document.title = `${title}｜甘孜州建设投资集团有限公司`

  const crumb = document.querySelector('[data-breadcrumb]')
  if (crumb) {
    const parts = [{ title: '首页', path: '/A版官网首页.html' }].concat(trail.map(item => ({ title: item.title, path: item.path })))
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
    if (isOrgRoot) {
      childrenGrid.innerHTML = `
        <article class="card reveal" data-anim="fadeUp" style="grid-column:span 12">
          <div class="card-pad">
            <div class="pill">集团总部</div>
            <div class="org" style="margin-top:14px">
              <svg viewBox="0 0 1200 520" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="集团总部组织架构图">
                <defs>
                  <linearGradient id="orgTopHq" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#B71C1C"></stop>
                    <stop offset="45%" stop-color="#8E1633"></stop>
                    <stop offset="100%" stop-color="#2E4A7D"></stop>
                  </linearGradient>
                </defs>

                <g fill="none" stroke="#D9DDE5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
                  <line x1="600" y1="104" x2="600" y2="140"></line>
                  <line x1="160" y1="140" x2="1040" y2="140"></line>
                  <line x1="260" y1="140" x2="260" y2="170"></line>
                  <line x1="600" y1="140" x2="600" y2="170"></line>
                  <line x1="940" y1="140" x2="940" y2="170"></line>

                  <line x1="260" y1="228" x2="260" y2="402"></line>
                  <line x1="600" y1="228" x2="600" y2="402"></line>
                  <line x1="940" y1="228" x2="940" y2="240"></line>
                  <line x1="780" y1="240" x2="1070" y2="240"></line>
                  <line x1="780" y1="240" x2="780" y2="260"></line>
                  <line x1="1070" y1="240" x2="1070" y2="260"></line>
                </g>

                <a href="/group/organization/headquarters" xlink:href="/group/organization/headquarters" aria-label="进入集团总部">
                  <g>
                    <rect x="390" y="36" width="420" height="68" rx="34" fill="url(#orgTopHq)"></rect>
                    <text x="600" y="70" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF" font-size="20" font-weight="850">集团总部</text>
                  </g>
                </a>

                <a href="/group/organization/headquarters/party-committee" xlink:href="/group/organization/headquarters/party-committee" aria-label="进入党委">
                  <g>
                    <rect x="120" y="170" width="280" height="58" rx="22" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="260" y="199" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="16" font-weight="800">党委</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/board" xlink:href="/group/organization/headquarters/board" aria-label="进入董事会">
                  <g>
                    <rect x="460" y="170" width="280" height="58" rx="22" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="600" y="199" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="16" font-weight="800">董事会</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters" xlink:href="/group/organization/headquarters" aria-label="进入职能部门">
                  <g>
                    <rect x="800" y="170" width="280" height="58" rx="22" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="940" y="199" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="16" font-weight="800">职能部门</text>
                  </g>
                </a>

                <a href="/group/organization/headquarters/discipline-committee" xlink:href="/group/organization/headquarters/discipline-committee" aria-label="进入纪委">
                  <g>
                    <rect x="140" y="285" width="240" height="52" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="260" y="311" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="15" font-weight="750">纪委</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/mass-union" xlink:href="/group/organization/headquarters/mass-union" aria-label="进入群团工会">
                  <g>
                    <rect x="140" y="350" width="240" height="52" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="260" y="376" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="15" font-weight="750">群团工会</text>
                  </g>
                </a>

                <a href="/group/organization/headquarters/board/strategy-investment" xlink:href="/group/organization/headquarters/board/strategy-investment" aria-label="进入战略投资委员会">
                  <g>
                    <rect x="380" y="285" width="250" height="52" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="505" y="311" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="14" font-weight="750">战略投资委员会</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/board/nomination-remuneration" xlink:href="/group/organization/headquarters/board/nomination-remuneration" aria-label="进入提名和薪酬与考核委员会">
                  <g>
                    <rect x="640" y="285" width="250" height="52" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="765" y="304" text-anchor="middle" fill="#263042" font-size="13" font-weight="750">
                      <tspan x="765" dy="0">提名和薪酬与考核</tspan>
                      <tspan x="765" dy="18">委员会</tspan>
                    </text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/board/audit-risk" xlink:href="/group/organization/headquarters/board/audit-risk" aria-label="进入审计和风险委员会">
                  <g>
                    <rect x="380" y="350" width="250" height="52" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="505" y="376" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="14" font-weight="750">审计和风险委员会</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/board/budget" xlink:href="/group/organization/headquarters/board/budget" aria-label="进入预算管理委员会">
                  <g>
                    <rect x="640" y="350" width="250" height="52" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="765" y="376" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="14" font-weight="750">预算管理委员会</text>
                  </g>
                </a>

                <a href="/group/organization/headquarters/party-admin" xlink:href="/group/organization/headquarters/party-admin" aria-label="进入党群综合部">
                  <g>
                    <rect x="650" y="260" width="260" height="50" rx="18" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="780" y="285" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="14" font-weight="720">党群综合部</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/chief-engineer" xlink:href="/group/organization/headquarters/chief-engineer" aria-label="进入总工办">
                  <g>
                    <rect x="940" y="260" width="260" height="50" rx="18" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="1070" y="285" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="14" font-weight="720">总工办</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/finance" xlink:href="/group/organization/headquarters/finance" aria-label="进入财务资金部">
                  <g>
                    <rect x="650" y="310" width="260" height="50" rx="18" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="780" y="335" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="14" font-weight="720">财务资金部</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/hr" xlink:href="/group/organization/headquarters/hr" aria-label="进入人力资源部">
                  <g>
                    <rect x="940" y="310" width="260" height="50" rx="18" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="1070" y="335" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="14" font-weight="720">人力资源部</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/risk-audit" xlink:href="/group/organization/headquarters/risk-audit" aria-label="进入风控审计部">
                  <g>
                    <rect x="650" y="360" width="260" height="50" rx="18" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="780" y="385" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="14" font-weight="720">风控审计部</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/business-cooperation" xlink:href="/group/organization/headquarters/business-cooperation" aria-label="进入经营合作管理部">
                  <g>
                    <rect x="940" y="360" width="260" height="50" rx="18" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="1070" y="379" text-anchor="middle" fill="#263042" font-size="13" font-weight="720">
                      <tspan x="1070" dy="0">经营合作管理</tspan>
                      <tspan x="1070" dy="18">部</tspan>
                    </text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/env-safety" xlink:href="/group/organization/headquarters/env-safety" aria-label="进入环安管理部">
                  <g>
                    <rect x="650" y="410" width="260" height="50" rx="18" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="780" y="435" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="14" font-weight="720">环安管理部</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/investment-ops" xlink:href="/group/organization/headquarters/investment-ops" aria-label="进入投资运营部">
                  <g>
                    <rect x="940" y="410" width="260" height="50" rx="18" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="1070" y="435" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="14" font-weight="720">投资运营部</text>
                  </g>
                </a>
                <a href="/group/organization/headquarters/project-promotion" xlink:href="/group/organization/headquarters/project-promotion" aria-label="进入项目促进中心">
                  <g>
                    <rect x="650" y="460" width="260" height="50" rx="18" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="780" y="485" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="14" font-weight="720">项目促进中心</text>
                  </g>
                </a>
              </svg>
            </div>
          </div>
        </article>

        <article class="card reveal" data-anim="fadeUp" style="grid-column:span 12;margin-top:18px">
          <div class="card-pad">
            <div class="pill">集团所属公司</div>
            <div class="org" style="margin-top:14px">
              <svg viewBox="0 0 1200 820" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="集团所属公司组织架构图">
                <defs>
                  <linearGradient id="orgTopSub" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#B71C1C"></stop>
                    <stop offset="45%" stop-color="#8E1633"></stop>
                    <stop offset="100%" stop-color="#2E4A7D"></stop>
                  </linearGradient>
                </defs>

                <g fill="none" stroke="#D9DDE5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
                  <line x1="600" y1="104" x2="600" y2="140"></line>
                  <line x1="600" y1="228" x2="600" y2="300"></line>
                  <line x1="340" y1="300" x2="860" y2="300"></line>
                  <line x1="340" y1="300" x2="340" y2="320"></line>
                  <line x1="860" y1="300" x2="860" y2="320"></line>
                </g>

                <a href="/group/organization/subsidiaries" xlink:href="/group/organization/subsidiaries" aria-label="进入集团所属公司">
                  <g>
                    <rect x="390" y="36" width="420" height="68" rx="34" fill="url(#orgTopSub)"></rect>
                    <text x="600" y="70" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF" font-size="20" font-weight="850">集团所属公司</text>
                  </g>
                </a>

                <a href="/group/organization/subsidiaries/level-4" xlink:href="/group/organization/subsidiaries/level-4" aria-label="进入第四层级下属公司">
                  <g>
                    <rect x="360" y="170" width="480" height="58" rx="22" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="600" y="190" text-anchor="middle" fill="#263042" font-size="14" font-weight="850">
                      <tspan x="600" dy="0">第四层级 - 下属公司</tspan>
                      <tspan x="600" dy="18">（9家）</tspan>
                    </text>
                  </g>
                </a>

                <a href="/group/organization/subsidiaries/level-4/pm" xlink:href="/group/organization/subsidiaries/level-4/pm" aria-label="进入甘孜州项目管理有限公司">
                  <g>
                    <rect x="80" y="320" width="520" height="56" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="340" y="348" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="13" font-weight="700">甘孜州项目管理有限公司</text>
                  </g>
                </a>
                <a href="/group/organization/subsidiaries/level-4/construction" xlink:href="/group/organization/subsidiaries/level-4/construction" aria-label="进入甘孜州天路工程建设有限公司">
                  <g>
                    <rect x="600" y="320" width="520" height="56" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="860" y="348" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="13" font-weight="700">甘孜州天路工程建设有限公司</text>
                  </g>
                </a>

                <a href="/group/organization/subsidiaries/level-4/supply-chain" xlink:href="/group/organization/subsidiaries/level-4/supply-chain" aria-label="进入甘孜州天路供应链管理有限公司">
                  <g>
                    <rect x="80" y="394" width="520" height="56" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="340" y="422" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="13" font-weight="700">甘孜州天路供应链管理有限公司</text>
                  </g>
                </a>
                <a href="/group/organization/subsidiaries/level-4/enterprise-mgmt" xlink:href="/group/organization/subsidiaries/level-4/enterprise-mgmt" aria-label="进入甘孜州企业管理有限公司">
                  <g>
                    <rect x="600" y="394" width="520" height="56" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="860" y="422" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="13" font-weight="700">甘孜州企业管理有限公司</text>
                  </g>
                </a>

                <a href="/group/organization/subsidiaries/level-4/consulting" xlink:href="/group/organization/subsidiaries/level-4/consulting" aria-label="进入甘孜州资询有限公司">
                  <g>
                    <rect x="80" y="468" width="520" height="56" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="340" y="496" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="13" font-weight="700">甘孜州资询有限公司</text>
                  </g>
                </a>
                <a href="/group/organization/subsidiaries/level-4/low-altitude-service" xlink:href="/group/organization/subsidiaries/level-4/low-altitude-service" aria-label="进入甘孜州低空飞行运营服务有限公司">
                  <g>
                    <rect x="600" y="468" width="520" height="56" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="860" y="487" text-anchor="middle" fill="#263042" font-size="12.5" font-weight="700">
                      <tspan x="860" dy="0">甘孜州低空飞行运营服务</tspan>
                      <tspan x="860" dy="18">有限公司</tspan>
                    </text>
                  </g>
                </a>

                <a href="/group/organization/subsidiaries/level-4/design" xlink:href="/group/organization/subsidiaries/level-4/design" aria-label="进入甘孜州建投工程勘察设计有限公司">
                  <g>
                    <rect x="80" y="542" width="520" height="56" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="340" y="570" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="13" font-weight="700">甘孜州建投工程勘察设计有限公司</text>
                  </g>
                </a>
                <a href="/group/organization/subsidiaries/level-4/sc-jiaojian-tianlu" xlink:href="/group/organization/subsidiaries/level-4/sc-jiaojian-tianlu" aria-label="进入四川交建天路建设工程有限公司">
                  <g>
                    <rect x="600" y="542" width="520" height="56" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="860" y="570" text-anchor="middle" dominant-baseline="middle" fill="#263042" font-size="13" font-weight="700">四川交建天路建设工程有限公司</text>
                  </g>
                </a>

                <a href="/group/organization/subsidiaries/level-4/zhongyou-jinhongda" xlink:href="/group/organization/subsidiaries/level-4/zhongyou-jinhongda" aria-label="进入甘孜州中油金宏达能源有限责任公司">
                  <g>
                    <rect x="80" y="616" width="520" height="56" rx="20" fill="#FFFFFF" fill-opacity="0.92" stroke="#D9DDE5"></rect>
                    <text x="340" y="635" text-anchor="middle" fill="#263042" font-size="12.5" font-weight="700">
                      <tspan x="340" dy="0">甘孜州中油金宏达能源</tspan>
                      <tspan x="340" dy="18">有限责任公司</tspan>
                    </text>
                  </g>
                </a>
              </svg>
            </div>
          </div>
        </article>
      `
      return
    }

    childrenGrid.innerHTML = children.map((item, index) => `
      <article class="card reveal" data-anim="${index % 2 === 0 ? 'fadeUp' : 'fadeLeft'}" style="grid-column:span 4">
        <div class="card-pad">
          <div class="pill">栏目入口</div>
          <h3 style="margin:14px 0 8px;font-size:22px;font-weight:800">${item.title}</h3>
          <p style="margin:0 0 16px;color:rgba(11,18,32,.64);line-height:1.8">进入“${item.title}”栏目，后续可在当前统一模板中继续扩展内容。</p>
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
