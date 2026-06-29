#!/usr/bin/env node
/**
 * Bootstrap Directus collections, fields, relations, and local test data.
 * Uses Directus REST API only; does not run SQL and does not modify web pages.
 */

const DIRECTUS_URL = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const log = (msg) => console.log(`• ${msg}`);
const warn = (msg) => console.warn(`⚠️  ${msg}`);

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD. Please run `set -a; source .env.directus; set +a` and check .env.directus.');
  process.exit(1);
}

async function request(path, { method = 'GET', token, body, expected = [200, 201, 204] } = {}) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { raw: text }; }
  }
  if (!expected.includes(res.status)) {
    const message = data?.errors?.map((e) => e.message).join('; ') || text || res.statusText;
    const err = new Error(`${method} ${path} failed (${res.status}): ${message}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data?.data ?? data;
}

async function login() {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const token = data?.access_token;
  if (!token) throw new Error('Directus login succeeded but no access_token was returned.');
  log(`Logged in to ${DIRECTUS_URL}`);
  return token;
}

const selectOptions = (choices) => ({
  choices: choices.map((value) => ({ text: value, value })),
});

const collections = [
  ['channels', '栏目'],
  ['companies', '下属公司'],
  ['business_sectors', '业务板块'],
  ['pages', '单页'],
  ['banners', '轮播'],
  ['articles', '文章'],
  ['site_settings', '站点配置'],
  ['home_sections', '首页区块'],
  ['quick_links', '快捷链接'],
  ['friend_links', '友情链接'],
];

const fields = {
  channels: [
    stringField('name', true), stringField('slug', true), m2oField('parent'), selectField('type', ['list', 'page', 'link', 'module'], 'list'),
    stringField('path'), integerField('sort'), booleanField('visible', true), selectField('status', ['enabled', 'disabled'], 'enabled'),
    booleanField('is_news_category', false), textField('description'), stringField('source_file'),
  ],
  companies: [
    stringField('name', true), stringField('short_name'), stringField('slug', true), fileField('logo'), fileField('cover'),
    textField('intro', 'input-rich-text-html'), stringField('address'), textField('main_business'), stringField('registered_capital'), stringField('source_file'),
    integerField('sort'), selectField('status', ['enabled', 'disabled'], 'enabled'),
  ],
  business_sectors: [
    stringField('name', true), stringField('slug', true), fileField('cover'), textField('intro', 'input-rich-text-html'), stringField('source_file'),
    integerField('sort'), selectField('status', ['enabled', 'disabled'], 'enabled'),
  ],
  pages: [
    stringField('title', true), stringField('slug', true), fileField('cover'), textField('content', 'input-rich-text-html'), stringField('source_file'),
    selectField('status', ['draft', 'published', 'archived'], 'draft'),
  ],
  banners: [
    stringField('title', true), stringField('subtitle'), fileField('image'), stringField('image_url'), stringField('link_url'), stringField('source_file'),
    selectField('position', ['home', 'news', 'business', 'party'], 'home'), integerField('sort'),
    selectField('status', ['draft', 'published', 'archived'], 'draft'),
  ],
  articles: [
    stringField('title', true), stringField('subtitle'), fileField('cover'), stringField('cover_url'), textField('summary'), textField('content', 'input-rich-text-html'),
    stringField('source'), stringField('author'), datetimeField('publish_at'), selectField('status', ['draft', 'published', 'archived'], 'draft'),
    booleanField('is_top', false), booleanField('is_home_recommend', false), integerField('sort'), stringField('news_subcategory'), filesField('attachments'), stringField('source_file'),
    m2oField('main_channel'), m2oField('related_company'), m2oField('related_sector'),
  ],
  site_settings: [
    stringField('site_name', true), fileField('logo'), textField('footer_text'), stringField('address'), stringField('phone'),
    stringField('email'), stringField('icp'), stringField('copyright'),
  ],
  home_sections: [
    stringField('title', true), stringField('slug', true), stringField('subtitle'), textField('description'), stringField('collection_key'), stringField('source_file'),
    stringField('channel_slug'), integerField('limit'), integerField('sort'), selectField('status', ['enabled', 'disabled'], 'enabled'),
  ],
  quick_links: [
    stringField('title', true), stringField('slug', true), stringField('url', true), stringField('position'), textField('summary'), stringField('source_file'),
    fileField('icon'), integerField('sort'), selectField('status', ['enabled', 'disabled'], 'enabled'),
  ],
  friend_links: [
    stringField('title', true), stringField('url', true), stringField('position'), stringField('source_file'), integerField('sort'), selectField('status', ['enabled', 'disabled'], 'enabled'),
  ],
};


const customerRoles = [
  { key: 'system_admin', name: '系统管理员', description: '技术管理员；保留模型、角色、权限和系统配置能力。', admin_access: true, app_access: true },
  { key: 'group_content_manager', name: '集团内容管理员', description: '集团内容维护；不管理系统集合、模型和权限。', admin_access: false, app_access: true },
  { key: 'publisher', name: '审核发布员', description: '审核、发布和归档内容。', admin_access: false, app_access: true },
  { key: 'company_reporter', name: '下属公司通讯员', description: '下属公司供稿；默认创建草稿，不直接发布。', admin_access: false, app_access: true },
  { key: 'readonly_viewer', name: '只读查看员', description: '后台只读查看内容。', admin_access: false, app_access: true },
];

const rolePermissionPlans = {
  group_content_manager: [
    rw('articles'), rw('companies'), rw('business_sectors'), rw('pages'), rw('banners'), read('channels'), read('site_settings'), read('directus_files'),
  ],
  publisher: [
    rw('articles'), rw('pages'), rw('banners'), read('channels'), read('companies'), read('business_sectors'), read('site_settings'), read('directus_files'),
  ],
  company_reporter: [
    createAndRead('articles', { status: { _eq: 'draft' } }), read('channels'), read('companies'), read('business_sectors'), read('directus_files'),
  ],
  readonly_viewer: [
    read('channels'), read('articles'), read('companies'), read('business_sectors'), read('pages'), read('banners'), read('site_settings'), read('directus_files'),
  ],
};

function read(collection, permissions = {}) { return { collection, action: 'read', permissions, fields: ['*'] }; }
function createAndRead(collection, permissions = {}) { return [read(collection, permissions), { collection, action: 'create', permissions: {}, validation: {}, presets: { status: 'draft' }, fields: ['*'] }, { collection, action: 'update', permissions, validation: {}, presets: {}, fields: ['*'] }].flat(); }
function rw(collection, permissions = {}) { return ['read', 'create', 'update'].map((action) => ({ collection, action, permissions, validation: {}, presets: {}, fields: ['*'] })); }

const relations = [
  { collection: 'channels', field: 'parent', related_collection: 'channels' },
  { collection: 'companies', field: 'logo', related_collection: 'directus_files' },
  { collection: 'companies', field: 'cover', related_collection: 'directus_files' },
  { collection: 'business_sectors', field: 'cover', related_collection: 'directus_files' },
  { collection: 'pages', field: 'cover', related_collection: 'directus_files' },
  { collection: 'banners', field: 'image', related_collection: 'directus_files' },
  { collection: 'articles', field: 'cover', related_collection: 'directus_files' },
  { collection: 'site_settings', field: 'logo', related_collection: 'directus_files' },
  { collection: 'quick_links', field: 'icon', related_collection: 'directus_files' },
  { collection: 'articles', field: 'main_channel', related_collection: 'channels' },
  { collection: 'articles', field: 'related_company', related_collection: 'companies' },
  { collection: 'articles', field: 'related_sector', related_collection: 'business_sectors' },
];

function stringField(field, required = false) { return { field, type: 'string', meta: { interface: 'input', required }, schema: { is_nullable: !required } }; }
function textField(field, iface = 'input-multiline') { return { field, type: 'text', meta: { interface: iface }, schema: { is_nullable: true } }; }
function integerField(field) { return { field, type: 'integer', meta: { interface: 'input' }, schema: { is_nullable: true } }; }
function booleanField(field, defaultValue = false) { return { field, type: 'boolean', meta: { interface: 'boolean' }, schema: { default_value: defaultValue, is_nullable: false } }; }
function datetimeField(field) { return { field, type: 'dateTime', meta: { interface: 'datetime' }, schema: { is_nullable: true } }; }
function selectField(field, choices, defaultValue) { return { field, type: 'string', meta: { interface: 'select-dropdown', options: selectOptions(choices) }, schema: { default_value: defaultValue, is_nullable: false } }; }
function fileField(field) { return { field, type: 'uuid', meta: { interface: 'file-image', special: ['file'] }, schema: { is_nullable: true } }; }
function filesField(field) { return { field, type: 'json', meta: { interface: 'list', note: 'Store attachment file IDs for local bootstrap; can be converted to Directus Files UI later.' }, schema: { is_nullable: true } }; }
function m2oField(field) { return { field, type: 'integer', meta: { interface: 'select-dropdown-m2o', special: ['m2o'] }, schema: { is_nullable: true } }; }

async function ensureCollection(token, collection, note) {
  const collections = await request('/collections', { token });
  const exists = Array.isArray(collections) && collections.some((item) => item?.collection === collection);
  if (exists) {
    log(`Collection exists: ${collection}`);
    return;
  }
  await request('/collections', {
    token,
    method: 'POST',
    body: { collection, meta: { collection, icon: 'article', note, display_template: '{{name}}{{title}}{{site_name}}' }, schema: {} },
  });
  log(`Created collection: ${collection}`);
}

async function ensureField(token, collection, fieldDef) {
  const fields = await request(`/fields/${collection}`, { token });
  const exists = Array.isArray(fields) && fields.some((item) => item?.field === fieldDef.field);
  if (exists) {
    log(`Field exists: ${collection}.${fieldDef.field}`);
    return;
  }
  await request(`/fields/${collection}`, { token, method: 'POST', body: fieldDef });
  log(`Created field: ${collection}.${fieldDef.field}`);
}

async function ensureRelation(token, relation) {
  const body = {
    many_collection: relation.collection,
    many_field: relation.field,
    one_collection: relation.related_collection,
  };
  try {
    await request('/relations', { token, method: 'POST', body });
    log(`Created relation: ${relation.collection}.${relation.field} -> ${relation.related_collection}`);
  } catch (err) {
    const msg = String(err.message || '');
    if (err.status === 400 || err.status === 409 || msg.includes('already') || msg.includes('exists')) {
      log(`Relation exists or was already linked: ${relation.collection}.${relation.field}`);
      return;
    }
    warn(`Could not create relation ${relation.collection}.${relation.field}: ${err.message}`);
  }
}

async function upsertBySlug(token, collection, slug, item) {
  const existing = await request(`/items/${collection}?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`, { token });
  const found = Array.isArray(existing) ? existing[0] : existing?.[0];
  if (found?.id) {
    await request(`/items/${collection}/${found.id}`, { token, method: 'PATCH', body: item });
    log(`Updated seed: ${collection}.${slug}`);
    return found.id;
  }
  const created = await request(`/items/${collection}`, { token, method: 'POST', body: { ...item, slug } });
  log(`Created seed: ${collection}.${slug}`);
  return created.id;
}

async function upsertByTitle(token, collection, title, item) {
  const existing = await request(`/items/${collection}?filter[title][_eq]=${encodeURIComponent(title)}&limit=1`, { token });
  const found = Array.isArray(existing) ? existing[0] : existing?.[0];
  if (found?.id) {
    await request(`/items/${collection}/${found.id}`, { token, method: 'PATCH', body: item });
    log(`Updated seed: ${collection}.${title}`);
    return found.id;
  }
  const created = await request(`/items/${collection}`, { token, method: 'POST', body: { ...item, title } });
  log(`Created seed: ${collection}.${title}`);
  return created.id;
}

async function patchByTitleIfExists(token, collection, title, item) {
  const existing = await request(`/items/${collection}?filter[title][_eq]=${encodeURIComponent(title)}&limit=1`, { token });
  const found = Array.isArray(existing) ? existing[0] : existing?.[0];
  if (!found?.id) return;
  await request(`/items/${collection}/${found.id}`, { token, method: 'PATCH', body: item });
  log(`Patched existing seed: ${collection}.${title}`);
}

async function seedData(token) {
  const channelSeeds = [
    ['政务简讯', 'gov-briefs'], ['集团要闻', 'group-news'], ['业务动态', 'business-news'],
    ['党建群团', 'party-mass'], ['通知公告', 'announcements'], ['行业聚焦', 'industry-news'], ['媒体聚焦', 'media-focus'],
  ];
  const channelIds = new Map();
  for (const [name, slug] of channelSeeds) {
    const id = await upsertBySlug(token, 'channels', slug, { name, type: 'list', path: `/channels/${slug}`, sort: channelIds.size + 1, visible: true, status: 'enabled', is_news_category: true, description: `${name}分类` });
    channelIds.set(slug, id);
  }

  for (let i = 1; i <= 3; i += 1) {
    await upsertByTitle(token, 'banners', `首页轮播示例 ${i}`, {
      subtitle: '本地 Directus 初始化测试轮播',
      image_url: ['/img/雅砻江大桥.jpg', '/img/国道318线康定市过境段公路工程项目434互通工程（后北门）.jpg', '/img/国道317线（川藏公路北线）雀儿山隧道工程.jpg'][i - 1] || '/img/雅砻江大桥.jpg',
      position: 'home',
      sort: i,
      status: 'published',
      link_url: '/',
    });
  }

  const newsBannerSeeds = [
    {
      title: '新闻中心',
      subtitle: '聚合集团新闻、行业动态、通知公告、媒体聚焦，支持分类浏览、搜索与详情跳转。',
      image_url: '/img/雅砻江大桥.jpg',
      link_url: '/pages/news/index.html#content',
      position: 'news',
      sort: 1,
      status: 'published',
    },
    {
      title: '重点工程进展',
      subtitle: '聚焦重大工程关键节点、安全质量与建设成果，持续讲好甘孜建投发展故事。',
      image_url: '/img/国道318线康定市过境段公路工程项目434互通工程（后北门）.jpg',
      link_url: '/pages/news/index.html#content',
      position: 'news',
      sort: 2,
      status: 'published',
    },
    {
      title: '雪域通道建设',
      subtitle: '围绕交通工程、产业发展和民生服务，持续发布一线项目建设与治理动态。',
      image_url: '/img/国道317线（川藏公路北线）雀儿山隧道工程.jpg',
      link_url: '/pages/news/index.html#content',
      position: 'news',
      sort: 3,
      status: 'published',
    },
  ];
  for (const banner of newsBannerSeeds) {
    await upsertByTitle(token, 'banners', banner.title, banner);
  }

  await upsertBySlug(token, 'companies', 'gzjt-construction-test', { name: '甘孜建投测试建设有限公司', short_name: '测试建设', intro: '用于本地初始化验证的示例公司。', address: '示例地址', main_business: '项目建设、运营管理', registered_capital: '示例注册资本', sort: 1, status: 'enabled' });
  await upsertBySlug(token, 'companies', 'gzjt-operation-test', { name: '甘孜建投测试运营有限公司', short_name: '测试运营', intro: '用于本地初始化验证的示例公司。', address: '示例地址', main_business: '交旅融合、资产运营', registered_capital: '示例注册资本', sort: 2, status: 'enabled' });

  await upsertBySlug(token, 'business_sectors', 'project-construction', { name: '项目建设', intro: '项目建设示例业务板块。', sort: 1, status: 'enabled' });
  await upsertBySlug(token, 'business_sectors', 'operation-management', { name: '经营管理', intro: '经营管理示例业务板块。', sort: 2, status: 'enabled' });
  await upsertBySlug(token, 'business_sectors', 'transport-tourism', { name: '交旅融合', intro: '交旅融合示例业务板块。', sort: 3, status: 'enabled' });

  await upsertBySlug(token, 'pages', 'group-intro', { title: '集团简介', content: '<p>本内容为本地 Directus 初始化测试数据。</p>', status: 'published' });
  await upsertBySlug(token, 'pages', 'contact', { title: '联系我们', content: '<p>本内容为本地 Directus 初始化测试数据。</p>', status: 'published' });

  const newsArticles = [
    {
      title: '雅砻江大桥关键节点顺利贯通，区域通行能力持续提升',
      channel: 'group-news',
      cover_url: '/img/雅砻江大桥.jpg',
      summary: '集团统筹推进重点交通工程建设，强化安全、质量与工期协同管理，持续提升区域路网韧性与民生出行保障能力。',
      content: '<p>雅砻江大桥项目近期完成关键节点施工任务，主桥结构施工效率和现场组织能力持续提升，工程整体迈入新的建设阶段。</p><p>项目团队围绕“安全、质量、进度、成本”四个维度协同推进，严格执行高原地区桥梁施工标准，强化现场风险辨识、工序验收和全过程质量追踪。</p><p>下一步，集团将继续统筹资源配置，压实各参建单位责任，推动后续桥面系、附属工程与交通组织衔接工作，为区域通行能力提升和沿线产业联动夯实基础。</p>',
      source: '集团融媒中心',
      author: '新闻中心',
      publish_at: '2025-06-08T09:00:00+08:00',
      status: 'published',
      is_top: true,
      is_home_recommend: true,
      sort: 1,
    },
    {
      title: '国道318线康定市过境段434互通工程施工组织优化，关键节点推进',
      channel: 'industry-news',
      cover_url: '/img/国道318线康定市过境段公路工程项目434互通工程（后北门）.jpg',
      summary: '国道318线康定市过境段 434 互通工程持续优化施工组织，关键工序推进平稳，高原复杂地形条件下的履约能力进一步增强。',
      content: '<p>国道318线康定市过境段 434 互通工程围绕交通疏解、交叉施工和工序衔接开展专项优化，项目部建立了“周调度、日跟踪、节点销项”的推进机制。</p><p>针对高原地区气候多变、施工窗口期短的特点，项目团队提前部署人员、材料与机械设备，加强临建保障和安全巡检，确保关键节点按计划推进。</p><p>工程建成后，将进一步提升康定城区过境交通效率，改善片区通行环境，为区域路网协同和城市功能提升提供支撑。</p>',
      source: '工程管理部',
      author: '项目一线',
      publish_at: '2025-06-05T10:00:00+08:00',
      status: 'published',
      is_top: true,
      is_home_recommend: true,
      sort: 2,
    },
    {
      title: '雀儿山隧道工程关键工序安全管控到位，施工组织稳步推进',
      channel: 'gov-briefs',
      news_subcategory: '省委、省政府',
      cover_url: '/img/雀儿山隧道建成前1.jpeg',
      summary: '围绕重点项目建设要求，集团对雀儿山隧道工程关键工序实施全过程安全管控和质量复核，施工组织总体平稳有序。',
      content: '<p>雀儿山隧道工程持续聚焦关键工序风险点，严格落实专项施工方案、班前安全交底与现场带班制度，确保人员、设备与工序协同运行。</p><p>在施工推进过程中，项目部同步加强监测量测、材料抽检和隐患闭环整改，持续提升标准化管理水平。</p><p>当前，工程建设整体平稳推进，集团将继续强化责任链条和过程控制，为高原重点通道建设提供坚实保障。</p>',
      source: '甘孜州政府信息转载',
      author: '政务信息组',
      publish_at: '2025-06-02T10:30:00+08:00',
      status: 'published',
      is_top: false,
      is_home_recommend: false,
      sort: 3,
    },
    {
      title: '雀儿山隧道建成前阶段性成果汇总，现场标准化持续提升',
      channel: 'gov-briefs',
      news_subcategory: '州委、州政府',
      cover_url: '/img/国道318线康定市过境段公路工程项目434互通工程（后北门）.jpg',
      summary: '项目建设阶段性成果持续显现，现场文明施工、工序质量控制与协同管理能力进一步提升。',
      content: '<p>围绕高原重点工程建设要求，集团系统梳理了雀儿山隧道阶段性建设成果，对进度达成、质量控制和安全文明施工情况进行了全面复盘。</p><p>项目团队通过工序样板引路、标准化作业和智慧巡检等方式，持续提升现场精细化管理水平。</p><p>后续将继续完善过程资料、强化质量闭环与经验沉淀，为后续类似项目建设提供可复用的管理样本。</p>',
      source: '康巴传媒',
      author: '政务信息组',
      publish_at: '2025-05-28T15:00:00+08:00',
      status: 'published',
      is_top: false,
      is_home_recommend: false,
      sort: 4,
    },
    {
      title: '雀儿山隧道建成后运行态势良好，通行条件显著改善',
      channel: 'media-focus',
      cover_url: '/img/雅砻江大桥.jpg',
      summary: '媒体持续关注雀儿山隧道建成后的通行表现和区域联动效应，工程综合效益逐步显现。',
      content: '<p>雀儿山隧道建成投运后，沿线通行效率和安全性得到明显改善，区域交通组织能力和物流周转效率持续提升。</p><p>多家媒体聚焦项目建设成果，从民生改善、产业联动和旅游发展等角度进行了跟踪报道，展示了重大交通工程的综合带动作用。</p><p>集团将继续做好项目后评价和运维协同，为后续工程建设、运营管理和品牌传播积累经验。</p>',
      source: '四川日报',
      author: '媒体联络组',
      publish_at: '2025-05-20T09:00:00+08:00',
      status: 'published',
      is_top: false,
      is_home_recommend: false,
      sort: 5,
    },
    {
      title: '集团召开二季度重点项目推进会，压实年度目标任务',
      channel: 'group-news',
      cover_url: '/img/雀儿山隧道建成前1.jpeg',
      summary: '集团召开二季度重点项目推进会，围绕年度目标任务、重点工程节点和经营指标进行再部署再压实。',
      content: '<p>会议通报了重点项目推进情况、投资完成情况和重点风险事项，要求各业务条线聚焦年度目标，坚持结果导向和问题导向。</p><p>会议强调，要抓好重点工程节点攻坚，提升前期策划、施工组织和要素保障效率，推动项目建设与资金计划协同联动。</p><p>同时，要压实责任链条，加强项目履约、成本管控和安全质量管理，为集团全年高质量发展目标实现提供坚强支撑。</p>',
      source: '集团办公室',
      author: '集团办公室',
      publish_at: '2025-05-15T14:00:00+08:00',
      status: 'published',
      is_top: false,
      is_home_recommend: true,
      sort: 6,
    },
    {
      title: '关于办公区节能改造与安全检查安排的通知',
      channel: 'announcements',
      cover_url: '/img/国道318线康定市过境段公路工程项目434互通工程（后北门）.jpg',
      summary: '为进一步提升办公区节能管理和安全生产水平，现就节能改造与专项检查有关事项予以通知。',
      content: '<p>根据集团年度后勤与安全工作安排，将于近期组织开展办公区照明、用电及消防设施专项检查，并同步推进节能设备更新改造。</p><p>请各部门结合实际提前做好自查自纠，重点排查线路使用、设备维护和重点区域消防安全等情况。</p><p>检查结果将纳入季度综合管理评价，相关整改事项须在规定时限内完成闭环销项。</p>',
      source: '综合管理部',
      author: '综合管理部',
      publish_at: '2025-05-10T09:30:00+08:00',
      status: 'published',
      is_top: false,
      is_home_recommend: false,
      sort: 7,
    },
    {
      title: '州级重点项目谋划培训举行，提升投融资协同能力',
      channel: 'gov-briefs',
      news_subcategory: '州委、州政府',
      cover_url: '/img/雅砻江大桥.jpg',
      summary: '州级重点项目谋划培训围绕项目包装、投融资协同和运营策划展开，进一步提升项目全生命周期管理能力。',
      content: '<p>培训聚焦重大项目策划储备、投融资模式创新和项目运营协同，围绕项目可研、资金测算、实施路径等内容进行了系统讲解。</p><p>集团相关业务骨干结合在建项目和储备项目案例，分享了项目谋划、推进与落地过程中的实务经验。</p><p>下一步，集团将进一步提升重大项目策划储备质量，强化“投融建运”一体化能力，为区域高质量发展提供更强支撑。</p>',
      source: '甘孜发布',
      author: '政务信息组',
      publish_at: '2025-05-06T11:00:00+08:00',
      status: 'published',
      is_top: false,
      is_home_recommend: false,
      sort: 8,
    },
  ];
  for (const article of newsArticles) {
    await upsertByTitle(token, 'articles', article.title, {
      subtitle: article.subtitle || '',
      cover_url: article.cover_url || '',
      summary: article.summary || '',
      content: article.content || '',
      source: article.source || '本地测试',
      author: article.author || 'Directus Bootstrap',
      publish_at: article.publish_at,
      status: article.status || 'published',
      is_top: Boolean(article.is_top),
      is_home_recommend: Boolean(article.is_home_recommend),
      sort: article.sort || 0,
      main_channel: channelIds.get(article.channel) || null,
      news_subcategory: article.news_subcategory || '',
      attachments: [],
    });
  }

  for (const title of [
    '集团新闻示例文章 1',
    '集团新闻示例文章 2',
    '业务动态示例文章 1',
    '业务动态示例文章 2',
    '党建群团示例文章 1',
    '党建群团示例文章 2',
    '公示公告示例文章 1',
    '公示公告示例文章 2',
  ]) {
    await patchByTitleIfExists(token, 'articles', title, { status: 'archived' });
  }

  const existingSettings = await request('/items/site_settings?limit=1', { token });
  const payload = { site_name: '甘孜建设投资集团官方网站（本地测试）', footer_text: '本数据仅用于本地 Directus 初始化测试。', address: '示例地址', phone: '000-00000000', email: 'admin@example.com', icp: '示例备案号', copyright: 'Copyright 本地测试' };
  const settings = Array.isArray(existingSettings) ? existingSettings[0] : existingSettings?.[0];
  if (settings?.id) await request(`/items/site_settings/${settings.id}`, { token, method: 'PATCH', body: payload });
  else await request('/items/site_settings', { token, method: 'POST', body: payload });
  log('Upserted seed: site_settings');

  const homeSections = [
    ['首页轮播', 'home-banners', 'banners', '', 3, 1],
    ['集团新闻', 'home-group-news', 'articles', 'group-news', 5, 2],
    ['业务动态', 'home-business-news', 'articles', 'business-news', 4, 3],
    ['党建群团', 'home-party-mass', 'articles', 'party-mass', 4, 4],
    ['公示公告', 'home-announcements', 'articles', 'announcements', 4, 5],
  ];
  for (const [title, slug, collectionKey, channelSlug, limit, sort] of homeSections) {
    await upsertBySlug(token, 'home_sections', slug, { title, collection_key: collectionKey, channel_slug: channelSlug, limit, sort, status: 'enabled' });
  }

  const quickLinks = [
    ['了解集团', 'home-about', '/pages/about/index.html', 'home', 1],
    ['新闻中心', 'home-news', '/pages/news/index.html', 'home', 2],
    ['业务板块', 'home-business', '/pages/business/index.html', 'home', 3],
    ['联系我们', 'home-contact', '/pages/contact/index.html', 'home', 4],
  ];
  for (const [title, slug, url, position, sort] of quickLinks) {
    await upsertBySlug(token, 'quick_links', slug, { title, url, position, sort, status: 'enabled' });
  }

  const friendLinks = [
    ['甘孜建投官网首页', '/A版官网首页.html', 'footer', 1],
  ];
  for (const [title, url, position, sort] of friendLinks) {
    await upsertByTitle(token, 'friend_links', title, { url, position, sort, status: 'enabled' });
  }
}



async function getRoleByName(token, name) {
  const result = await request(`/roles?filter[name][_eq]=${encodeURIComponent(name)}&limit=1`, { token });
  return Array.isArray(result) ? result[0] : result?.[0];
}

async function ensureRole(token, role) {
  const existing = await getRoleByName(token, role.name);
  const body = { name: role.name, description: role.description, app_access: role.app_access, admin_access: role.admin_access };
  if (existing?.id) {
    await request(`/roles/${existing.id}`, { token, method: 'PATCH', body });
    log(`Role exists/updated: ${role.name}`);
    return existing.id;
  }
  const created = await request('/roles', { token, method: 'POST', body });
  log(`Created role: ${role.name}`);
  return created.id;
}

async function tryCreateRolePermission(token, roleId, permission) {
  try {
    await request('/permissions', {
      token,
      method: 'POST',
      body: { role: roleId, collection: permission.collection, action: permission.action, permissions: permission.permissions || {}, validation: permission.validation || {}, presets: permission.presets || {}, fields: permission.fields || ['*'] },
    });
    log(`Tried role permission: ${roleId} ${permission.collection}.${permission.action}`);
  } catch (err) {
    const msg = String(err.message || '');
    if (err.status === 400 || err.status === 409 || msg.includes('already') || msg.includes('exists')) {
      log(`Role permission exists or needs manual confirmation: ${permission.collection}.${permission.action}`);
      return;
    }
    throw err;
  }
}

async function tryConfigureCustomerRoles(token) {
  try {
    const roleIds = new Map();
    for (const role of customerRoles) roleIds.set(role.key, await ensureRole(token, role));
    for (const [roleKey, permissions] of Object.entries(rolePermissionPlans)) {
      const roleId = roleIds.get(roleKey);
      for (const permission of permissions.flat()) await tryCreateRolePermission(token, roleId, permission);
    }
    log('Customer roles were created/updated. Please verify Access Policies in Directus Studio before customer delivery.');
  } catch (err) {
    warn(`Customer role/policy auto-configuration was not completed: ${err.message}`);
    warn('Please configure customer roles manually in Directus 12: User Roles / Access Policies. See docs/06-directus-customer-roles.md.');
  }
}

async function tryConfigurePublicPermissions(token) {
  const permissions = [
    ['channels', { visible: { _eq: true }, status: { _eq: 'enabled' } }],
    ['articles', { status: { _eq: 'published' } }],
    ['companies', { status: { _eq: 'enabled' } }],
    ['business_sectors', { status: { _eq: 'enabled' } }],
    ['pages', { status: { _eq: 'published' } }],
    ['banners', { status: { _eq: 'published' } }],
    ['site_settings', {}],
  ];
  try {
    for (const [collection, permissionsFilter] of permissions) {
      await request('/permissions', {
        token,
        method: 'POST',
        body: { role: null, collection, action: 'read', permissions: permissionsFilter, validation: {}, presets: {}, fields: ['*'] },
      });
      log(`Configured or attempted Public read permission: ${collection}`);
    }
  } catch (err) {
    warn(`Public permission auto-configuration was not completed: ${err.message}`);
    warn('Collections and test data were created. Please confirm Public permissions manually in Directus 12: Settings → Access Policies / User Roles. See scripts/directus/README.md.');
  }
}

async function main() {
  const token = await login();
  for (const [collection, note] of collections) await ensureCollection(token, collection, note);
  for (const [collection, defs] of Object.entries(fields)) for (const field of defs) await ensureField(token, collection, field);
  for (const relation of relations) await ensureRelation(token, relation);
  await seedData(token);
  await tryConfigurePublicPermissions(token);
  await tryConfigureCustomerRoles(token);
  log('Directus bootstrap finished. If public API returns 403 or customer roles look incomplete, confirm Access Policies manually.');
}

main().catch((err) => {
  console.error(`\nBootstrap failed: ${err.message}`);
  process.exit(1);
});
