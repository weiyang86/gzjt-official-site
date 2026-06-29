# Directus 内容模型设计

## 1. 设计边界

本文件仅用于 Directus Studio 手工建模说明，不连接真实 Directus，不编写自动建表脚本，不包含真实业务数据。

当前官网前端位于 `web/`，页面入口集中在 `web/pages/`。内容模型按现有页面结构设计，优先支撑首页、集团概况、新闻中心、业务板块、党群工作、社会责任、联系我们、下属公司页面与详情页。

## 2. 集合总览

| 集合 | 用途 | 主要服务页面 |
| --- | --- | --- |
| `channels` | 栏目和文章分类树 | 首页新闻分区、新闻中心、党群工作、列表页、详情页 |
| `articles` | 新闻、动态、公告、党建、责任、项目等文章内容 | 首页信息流、新闻中心、党群工作、社会责任、项目详情、通用列表和详情页 |
| `companies` | 下属公司资料 | `web/pages/org/*/index.html`、下属公司相关新闻 |
| `business_sectors` | 业务板块资料 | `web/pages/business/index.html`、业务动态、业务相关详情页 |
| `pages` | 单页内容 | 集团概况、联系我们、责任说明等单页型页面 |
| `banners` | 轮播图和焦点图 | 首页轮播、栏目页头图预留 |
| `site_settings` | 站点级配置 | 页头页脚、SEO、联系方式、友情链接等全站配置 |
| `page_modules` | 页面模块占位和开发规划 | 简单后台中的一级栏目/二级页面管理占位，当前不替换前台页面 |

## 3. `channels` 栏目集合

### 定位

用于维护官网栏目、新闻分类和列表页入口。`articles.main_channel` 通过 Many-to-One 关联到 `channels`。

### 建议字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | UUID / Integer | 是 | 主键 |
| `name` | String | 是 | 栏目名称，例如“集团新闻” |
| `slug` | String | 是 | 栏目标识，前台查询使用，需唯一 |
| `parent` | M2O -> `channels` | 否 | 父级栏目 |
| `description` | Text | 否 | 栏目说明 |
| `route_path` | String | 否 | 前台路径，例如 `/pages/news/index.html` |
| `status` | Select | 是 | `enabled` / `disabled` |
| `sort` | Integer | 否 | 排序，数字越小越靠前 |

### 必备栏目 slug

| slug | 名称 | 用途 |
| --- | --- | --- |
| `group-news` | 集团新闻 | 首页集团新闻、新闻中心 |
| `business-news` | 业务动态 | 首页业务动态、业务板块相关列表 |
| `party-mass` | 党建群团 | 首页党建群团、党群工作页面 |
| `announcements` | 公示公告 | 首页公示公告、通知公告列表 |
| `social-responsibility` | 社会责任 | 社会责任页面内容列表 |
| `project-news` | 项目动态 | 项目页面、项目详情预留 |

## 4. `articles` 文章集合

### 定位

用于承载官网新闻、动态、公告、党建群团、社会责任、项目相关图文内容。前台只读取 `status=published` 的文章。

### 必需字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | UUID / Integer | 是 | 主键 |
| `title` | String | 是 | 标题 |
| `subtitle` | String | 否 | 副标题 |
| `cover` | File -> `directus_files` | 否 | 封面图 |
| `summary` | Text | 否 | 摘要 |
| `content` | Rich Text / Markdown | 是 | 正文 |
| `main_channel` | M2O -> `channels` | 是 | 主栏目 |
| `related_company` | M2O -> `companies` | 否 | 关联下属公司 |
| `related_sector` | M2O -> `business_sectors` | 否 | 关联业务板块 |
| `source` | String | 否 | 来源 |
| `author` | String | 否 | 作者 |
| `publish_at` | DateTime | 是 | 发布时间 |
| `status` | Select | 是 | `draft` / `published` / `archived` |
| `is_top` | Boolean | 否 | 是否置顶 |
| `is_home_recommend` | Boolean | 否 | 是否首页推荐 |
| `sort` | Integer | 否 | 排序 |
| `attachments` | Files / M2M -> `directus_files` | 否 | 附件 |

### `articles.status` 枚举

| 值 | 含义 | 前台可读 |
| --- | --- | --- |
| `draft` | 草稿 | 否 |
| `published` | 已发布 | 是 |
| `archived` | 归档 | 否 |

### 建议排序规则

1. `is_top=true` 优先。
2. `sort` 升序。
3. `publish_at` 倒序。

## 5. `companies` 下属公司集合

### 定位

用于维护下属公司基础资料，服务 `web/pages/org/` 下的公司页面，并为文章提供 `related_company` 关联。

### 建议字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | UUID / Integer | 是 | 主键 |
| `name` | String | 是 | 公司名称 |
| `slug` | String | 是 | 公司标识，对应页面路径或 API 查询 |
| `logo` | File | 否 | 公司 Logo |
| `summary` | Text | 否 | 简介 |
| `content` | Rich Text / Markdown | 否 | 详细介绍 |
| `address` | String | 否 | 地址 |
| `phone` | String | 否 | 电话 |
| `status` | Select | 是 | `enabled` / `disabled` |
| `sort` | Integer | 否 | 排序 |

### 建议 slug

可按现有页面目录维护：`investment`、`traffic`、`urban`、`consulting`、`digital`、`project-company`。

## 6. `business_sectors` 业务板块集合

### 定位

用于维护业务板块卡片、介绍与业务动态关联，服务业务板块页面与首页业务相关区域。

### 建议字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | UUID / Integer | 是 | 主键 |
| `name` | String | 是 | 板块名称 |
| `slug` | String | 是 | 板块标识 |
| `icon` | File | 否 | 图标 |
| `cover` | File | 否 | 封面图 |
| `summary` | Text | 否 | 简介 |
| `content` | Rich Text / Markdown | 否 | 详情 |
| `status` | Select | 是 | `enabled` / `disabled` |
| `sort` | Integer | 否 | 排序 |

## 7. `pages` 单页集合

### 定位

用于维护集团概况、联系我们、静态说明等单页内容。适合前台按 `slug` 读取并渲染到固定页面模板中。

### 建议字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | UUID / Integer | 是 | 主键 |
| `title` | String | 是 | 页面标题 |
| `slug` | String | 是 | 页面标识，例如 `about`、`contact` |
| `summary` | Text | 否 | 摘要 |
| `content` | Rich Text / Markdown | 否 | 页面正文 |
| `cover` | File | 否 | 页面头图 |
| `seo_title` | String | 否 | SEO 标题 |
| `seo_description` | Text | 否 | SEO 描述 |
| `status` | Select | 是 | `published` / `draft` / `archived` |
| `sort` | Integer | 否 | 排序 |

## 8. `banners` 轮播集合

### 定位

用于维护首页轮播和栏目焦点图。首页轮播必须从 `banners` 读取，并过滤 `position=home`、`status=published`。

### 建议字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | UUID / Integer | 是 | 主键 |
| `title` | String | 是 | 轮播标题 |
| `subtitle` | String | 否 | 副标题 |
| `image` | File | 是 | 轮播图 |
| `link_url` | String | 否 | 跳转链接 |
| `position` | Select | 是 | `home` / `news` / `business` / `party` 等 |
| `status` | Select | 是 | `draft` / `published` / `archived` |
| `sort` | Integer | 否 | 排序 |
| `start_at` | DateTime | 否 | 生效时间 |
| `end_at` | DateTime | 否 | 失效时间 |

## 9. `site_settings` 站点配置集合

### 定位

用于维护全站配置。建议使用 Singleton 模式，或使用 `key/value` 模式。首期推荐 Singleton，便于后台编辑。

### 建议字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `site_name` | String | 是 | 站点名称 |
| `site_logo` | File | 否 | 站点 Logo |
| `footer_text` | Text | 否 | 页脚文字 |
| `contact_phone` | String | 否 | 联系电话 |
| `contact_address` | String | 否 | 联系地址 |
| `icp_text` | String | 否 | ICP 备案文案 |
| `seo_title` | String | 否 | 默认 SEO 标题 |
| `seo_description` | Text | 否 | 默认 SEO 描述 |
| `enabled` | Boolean | 是 | 是否启用 |

## 10. 首页数据来源

首页各区域必须使用以下数据来源和过滤条件：

| 首页区域 | 集合 | 过滤条件 |
| --- | --- | --- |
| 首页轮播 | `banners` | `position=home`、`status=published` |
| 集团新闻 | `articles` | `main_channel.slug=group-news`、`status=published` |
| 业务动态 | `articles` | `main_channel.slug=business-news`、`status=published` |
| 党建群团 | `articles` | `main_channel.slug=party-mass`、`status=published` |
| 公示公告 | `articles` | `main_channel.slug=announcements`、`status=published` |

## 11. 前台 API 接入建议

- 所有前台 CMS 请求应在 `web/` 内统一封装，避免页面脚本分散直连 Directus。
- 前台列表接口默认追加 `status=published` 或 `status=enabled` 条件。
- 详情页按 `id` 或 `slug` 查询时，也必须附加发布状态过滤，防止草稿泄露。
- 首页建议一次性聚合所需数据，或由 `web/services/cms-api/` 提供 BFF 接口，降低静态页面复杂度。


## 12. 前端内容盘点后的模型优化

根据现有 `web/` 前端页面盘点，建议在原有模型基础上新增以下集合，用于承载“可由后台维护、但不适合放入 articles/pages 的首页和全站配置型内容”：

| 集合 | 是否新增 | 用途 | 主要字段 |
| --- | --- | --- | --- |
| `home_sections` | 是 | 首页区块配置，例如集团新闻区块、业务动态区块、党建群团区块、公示公告区块的标题、简介、排序、启用状态 | `title`、`slug`、`subtitle`、`description`、`collection_key`、`channel_slug`、`limit`、`sort`、`status` |
| `quick_links` | 是 | 首页快速入口、栏目页快捷按钮、底部相关推荐等可维护链接 | `title`、`slug`、`url`、`position`、`summary`、`icon`、`sort`、`status` |
| `friend_links` | 是 | 友情链接、底部外链、相关站点入口 | `title`、`url`、`position`、`sort`、`status` |
| `home_metrics` | 暂不新增 | 当前确认的首页入口 `web/A版官网首页.html` 未发现独立数字指标模块；业务板块和社会责任页存在数字展示，但可先保持静态或后续按页面级需求建模 | 暂无 |

### 建模边界

- 首页轮播仍使用 `banners`，通过 `position=home` 区分。
- 首页新闻类内容仍使用 `articles`，通过 `main_channel.slug` 区分。
- 首页区块标题、排序、显示数量等非文章内容使用 `home_sections`。
- 首页和栏目中的固定入口链接使用 `quick_links`，外部友情链接使用 `friend_links`。
- 当前不新增 `home_metrics`，避免为非首页数字展示过度建模。

### 静态导入追踪字段

为支持 `scripts/directus/extract-static-content.mjs` 与 `import-static-content.mjs` 的幂等导入，建议 `channels`、`articles`、`companies`、`business_sectors`、`pages`、`banners`、`home_sections`、`quick_links`、`friend_links` 保留 `source_file` 字段，用于记录内容来源的前端 HTML 文件。该字段仅用于迁移追踪和查重，不应作为前台展示字段。


## 13. `page_modules` 页面模块占位集合

### 定位

`page_modules` 用于简单后台展示和维护“一级栏目 - 二级页面模块”的占位清单。它记录每个二级页面当前对应的前端入口、内容形态和开发状态，当前阶段仅作为后台占位管理项和开发规划，不替换 `web/pages/` 现有静态页面，也不改变官网前台样式、布局、CSS、动画或路由。

### 建议字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | UUID / Integer | 是 | 主键 |
| `module_title` | String | 是 | 二级模块名称，例如“企业简介” |
| `module_code` | String | 是 | 二级模块编码，例如 `group-intro` |
| `parent_title` | String | 是 | 一级栏目名称，例如“集团概况” |
| `parent_code` | String | 是 | 一级栏目编码，例如 `group-overview` |
| `route_path` | String | 否 | 当前前端入口路径，例如 `/pages/about/index.html` |
| `content_type` | Select | 是 | `intro` / `timeline` / `org_chart` / `list` / `page` / `static` / `custom` |
| `dev_status` | Select | 是 | `developing` / `enabled` / `disabled`，初始化默认为 `developing` |
| `placeholder_text` | Text | 否 | 占位提示，默认“正在开发中” |
| `sort` | Integer | 否 | 排序 |
| `remark` | Text | 否 | 备注 |
| `status` | Select | 是 | `enabled` / `disabled` |

### 与 `channels` 的区别

- `channels` 服务新闻分类和前台栏目，主要用于 `articles.main_channel` 关联、新闻筛选与前台已发布内容读取。
- `page_modules` 服务后台页面管理占位和开发规划，用于告诉客户一级栏目下有哪些二级页面将逐步接入内容管理。
- 当前所有初始化二级模块都保持 `dev_status=developing`，后台可显示“正在开发中”；后续每个模块可逐步接入独立内容编辑后再切换为 `enabled`。
