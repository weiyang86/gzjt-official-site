(() => {
  const buildSubsidiaries = (companies) => (companies || []).map((c) => ({
    title: c.title,
    path: c.path,
    children: [
      { title: '公司简介', path: `${c.path}/profile`, children: [] },
      { title: '业务动态', path: `${c.path}/dynamics`, children: [] }
    ]
  }))

  const subsidiariesCompanies = [
    { title: '甘孜州项目管理有限公司', path: '/subsidiaries/pm' },
    { title: '甘孜州天路工程建设有限公司', path: '/subsidiaries/construction' },
    { title: '甘孜州资询有限公司', path: '/subsidiaries/consulting' },
    { title: '甘孜州天路供应链管理有限公司', path: '/subsidiaries/supply-chain' },
    { title: '甘孜州建投工程勘察设计有限公司', path: '/subsidiaries/design' },
    { title: '丹巴片区项目联合临时党支部', path: '/subsidiaries/danba-party' },
    { title: '稻城片区项目联合临时党支部', path: '/subsidiaries/daocheng-party' },
    { title: '道孚片区项目联合临时党支部', path: '/subsidiaries/daofu-party' }
  ]
  const orgSubsidiariesCompanies = [
    { title: '甘孜州项目管理有限公司', path: '/group/organization/subsidiaries/level-4/pm' },
    { title: '甘孜州天路工程建设有限公司', path: '/group/organization/subsidiaries/level-4/construction' },
    { title: '甘孜州天路供应链管理有限公司', path: '/group/organization/subsidiaries/level-4/supply-chain' },
    { title: '甘孜州企业管理有限公司', path: '/group/organization/subsidiaries/level-4/enterprise-mgmt' },
    { title: '甘孜州资询有限公司', path: '/group/organization/subsidiaries/level-4/consulting' },
    { title: '甘孜州低空飞行运营服务有限公司', path: '/group/organization/subsidiaries/level-4/low-altitude-service' },
    { title: '甘孜州建投工程勘察设计有限公司', path: '/group/organization/subsidiaries/level-4/design' },
    { title: '四川交建天路建设工程有限公司', path: '/group/organization/subsidiaries/level-4/sc-jiaojian-tianlu' },
    { title: '甘孜州中油金宏达能源有限责任公司', path: '/group/organization/subsidiaries/level-4/zhongyou-jinhongda' }
  ]

  window.SITE_NAV = [
    {
      title: '集团概况',
      path: '/group',
      children: [
        { title: '集团简介', path: '/group/profile', children: [] },
        { title: '发展历程', path: '/group/history', children: [] },
        {
          title: '组织架构',
          path: '/group/organization',
          children: [
            {
              title: '集团总部',
              path: '/group/organization/headquarters',
              children: [
                {
                  title: '党委',
                  path: '/group/organization/headquarters/party-committee',
                  children: [
                    { title: '纪委', path: '/group/organization/headquarters/discipline-committee', children: [] },
                    { title: '群团工会', path: '/group/organization/headquarters/mass-union', children: [] }
                  ]
                },
                {
                  title: '董事会',
                  path: '/group/organization/headquarters/board',
                  children: [
                    { title: '战略投资委员会', path: '/group/organization/headquarters/board/strategy-investment', children: [] },
                    { title: '提名和薪酬与考核委员会', path: '/group/organization/headquarters/board/nomination-remuneration', children: [] },
                    { title: '审计和风险委员会', path: '/group/organization/headquarters/board/audit-risk', children: [] },
                    { title: '预算管理委员会', path: '/group/organization/headquarters/board/budget', children: [] }
                  ]
                },
                { title: '党群综合部', path: '/group/organization/headquarters/party-admin', children: [] },
                { title: '总工办', path: '/group/organization/headquarters/chief-engineer', children: [] },
                { title: '财务资金部', path: '/group/organization/headquarters/finance', children: [] },
                { title: '人力资源部', path: '/group/organization/headquarters/hr', children: [] },
                { title: '风控审计部', path: '/group/organization/headquarters/risk-audit', children: [] },
                { title: '经营合作管理部', path: '/group/organization/headquarters/business-cooperation', children: [] },
                { title: '环安管理部', path: '/group/organization/headquarters/env-safety', children: [] },
                { title: '投资运营部', path: '/group/organization/headquarters/investment-ops', children: [] },
                { title: '项目促进中心', path: '/group/organization/headquarters/project-promotion', children: [] }
              ]
            },
            {
              title: '集团所属公司',
              path: '/group/organization/subsidiaries',
              children: [
                {
                  title: '第四层级 - 下属公司（9家）',
                  path: '/group/organization/subsidiaries/level-4',
                  children: buildSubsidiaries(orgSubsidiariesCompanies)
                }
              ]
            }
          ]
        },
        { title: '领导班子', path: '/group/leadership', children: [] },
        { title: '企业文化', path: '/group/culture', children: [] }
      ]
    },
    {
      title: '公示公告',
      path: '/disclosure',
      children: [
        {
          title: '人才招聘（人力资源）',
          path: '/disclosure/recruitment',
          children: [
            { title: '社会招聘', path: '/disclosure/recruitment/social', children: [] },
            { title: '校园招聘', path: '/disclosure/recruitment/campus', children: [] },
            { title: '内部招聘', path: '/disclosure/recruitment/internal', children: [] }
          ]
        },
        { title: '人事管理', path: '/disclosure/hr', children: [] },
        { title: '公告列表', path: '/disclosure/notice', children: [] },
        { title: '招标采购', path: '/disclosure/procurement', children: [] }
      ]
    },
    {
      title: '新闻中心',
      path: '/news-center',
      children: [
        {
          title: '政务简讯',
          path: '/news-center/gov-brief',
          children: [
            { title: '省委、省政府', path: '/news-center/gov-brief/provincial', children: [] },
            { title: '州委、州政府', path: '/news-center/gov-brief/prefecture', children: [] }
          ]
        },
        { title: '集团要闻', path: '/news-center/group', children: [] },
        { title: '行业聚焦', path: '/news-center/industry', children: [] },
        { title: '媒体聚焦', path: '/news-center/media', children: [] },
        { title: '通知公告', path: '/news-center/notice', children: [] }
      ]
    },
    {
      title: '业务动态',
      path: '/business-dynamics',
      children: [
        { title: '投资发展', path: '/business-dynamics/investment', children: [] },
        { title: '聚焦1344发展战略', path: '/business-dynamics/strategy-1344', children: [] },
        { title: '项目建设', path: '/business-dynamics/construction', children: [] },
        { title: '经营管理', path: '/business-dynamics/operation', children: [] },
        { title: '安全环保', path: '/business-dynamics/safety', children: [] },
        { title: '科技创新', path: '/business-dynamics/innovation', children: [] },
        { title: '改革攻坚', path: '/business-dynamics/reform', children: [] },
        { title: '依法治企', path: '/business-dynamics/rule-of-law', children: [] },
        { title: '基层动态', path: '/business-dynamics/grassroots', children: [] }
      ]
    },
    {
      title: '业务发展',
      path: '/business-dev',
      children: [
        { title: '投资发展', path: '/business-dev/investment', children: [] },
        { title: '项目建设', path: '/business-dev/construction', children: [] },
        { title: '经营管理', path: '/business-dev/operation', children: [] },
        { title: '安全环保', path: '/business-dev/safety', children: [] },
        { title: '科技创新', path: '/business-dev/innovation', children: [] }
      ]
    },
    {
      title: '下属企业',
      path: '/subsidiaries',
      hidden: true,
      children: buildSubsidiaries(subsidiariesCompanies)
    },
    {
      title: '党建群团',
      path: '/party-masses',
      children: [
        { title: '聚焦党代会', path: '/party-masses/congress', children: [] },
        { title: '主题教育', path: '/party-masses/education', children: [] },
        { title: '基层党建', path: '/party-masses/grassroots', children: [] },
        { title: '学习贯彻二十大精神', path: '/party-masses/20th', children: [] },
        { title: '专题学习', path: '/party-masses/special-study', children: [] },
        { title: '工会工作', path: '/party-masses/union', children: [] },
        { title: '青年工作', path: '/party-masses/youth', children: [] },
        { title: '统战工作', path: '/party-masses/united-front', children: [] },
        { title: '妇联工作', path: '/party-masses/women', children: [] }
      ]
    },
    {
      title: '廉洁建投',
      path: '/clean-gov',
      children: [
        { title: '廉政检查', path: '/clean-gov/inspection', children: [] },
        { title: '巡察工作', path: '/clean-gov/patrol', children: [] },
        { title: '廉洁法规', path: '/clean-gov/regulations', children: [] },
        { title: '警示教育', path: '/clean-gov/education', children: [] }
      ]
    },
    {
      title: '社会责任',
      path: '/social-responsibility',
      children: [
        { title: '乡村振兴', path: '/social-responsibility/rural', children: [] },
        { title: '抢险救灾', path: '/social-responsibility/rescue', children: [] },
        { title: '志愿服务', path: '/social-responsibility/volunteer', children: [] },
        { title: '社会公益', path: '/social-responsibility/public-welfare', children: [] }
      ]
    },
    {
      title: '联系我们',
      path: '/contact-us',
      children: [
        { title: '联系电话', path: '/contact-us/phone', children: [] },
        { title: '电子邮箱', path: '/contact-us/email', children: [] },
        { title: '办公地址', path: '/contact-us/address', children: [] },
        { title: '地图导航', path: '/contact-us/map', children: [] }
      ]
    }
  ]
})()
