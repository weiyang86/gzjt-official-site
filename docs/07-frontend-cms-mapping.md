# 前端内容盘点、CMS 映射与静态内容导入说明

## 1. 扫描范围与当前首页入口

本次盘点范围为 `web/` 下现有静态页面和 Directus 接入脚本，不修改页面视觉、CSS、动画或布局。

- 当前首页入口：`web/A版官网首页.html`。
- `web/server.js` 将 `/` 映射到 `/A版官网首页.html`，因此该文件是当前真正使用的首页入口。
- `web/index.html` 当前不存在；不要新建 `site/` 目录替代 `web/`。

## 2. 当前栏目页面入口

| 页面模块 | 入口文件 | 说明 |
| --- | --- | --- |
| 首页 | `web/A版官网首页.html` | 已通过 `home-directus.js` 读取 cms-api 首页数据 |
| 集团概况 | `web/pages/about/index.html` | 企业简介、发展历程、组织架构、领导班子、企业文化 |
| 新闻中心 | `web/pages/news/index.html` | 新闻聚合、Tab、搜索、分页和详情入口 |
| 业务板块 | `web/pages/business/index.html` | 业务板块、业务成果、典型案例、数据统计 |
| 联系我们 | `web/pages/contact/index.html` | 联系方式、地图、在线留言、招聘入口 |
| 详情页 | `web/pages/detail/*.html` | 新闻、文章、项目详情模板 |
| 下属公司 | `web/pages/org/*/index.html` | 投资、交通、城市、咨询、数字、项目公司等页面 |
| 党建工作 | `web/pages/party/index.html` | 党建板块、图片展示、视频展示 |
| 项目展示 | `web/pages/projects/index.html` | 项目地图、项目筛选、项目详情入口 |
| 社会责任 | `web/pages/responsibility/index.html` | 责任行动、社会贡献数据 |
| `web/pages/company` | 当前不存在 | 下属公司实际位于 `web/pages/org/` |

## 3. 应由 Directus 管理的内容

| 前端模块 | Directus collection | 字段映射 | 图片 | 链接 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 首页轮播 | `banners` | `title`、`subtitle`、`image`、`link_url`、`position=home`、`sort`、`status` | 是 | 是 | 已由首页脚本读取 |
| 首页集团新闻 | `articles` | `title`、`summary`、`cover`、`publish_at`、`main_channel=group-news`、`status` | 可选 | 详情页链接 | 已由首页脚本读取 |
| 首页业务动态 | `articles` | `title`、`summary`、`publish_at`、`main_channel=business-news`、`status` | 可选 | 详情页链接 | 已由首页脚本读取 |
| 首页党建群团 | `articles` | `title`、`summary`、`publish_at`、`main_channel=party-mass`、`status` | 可选 | 详情页链接 | 已由首页脚本读取 |
| 首页公示公告 | `articles` | `title`、`summary`、`publish_at`、`main_channel=announcements`、`status` | 可选 | 详情页链接 | 已由首页脚本读取 |
| 首页区块配置 | `home_sections` | `title`、`slug`、`subtitle`、`description`、`collection_key`、`channel_slug`、`limit`、`sort`、`status` | 否 | 可选 | 新增集合 |
| 首页快速入口 | `quick_links` | `title`、`slug`、`url`、`position`、`summary`、`icon`、`sort`、`status` | 可选 | 是 | 新增集合 |
| 新闻中心列表 | `articles` | 同文章字段，按 `main_channel.slug` 和 `status` 过滤 | 可选 | 是 | 可逐步接入 |
| 业务板块卡片 | `business_sectors` | `name`、`slug`、`cover`、`intro`、`sort`、`status` | 是 | 可选 | 可逐步接入 |
| 下属公司信息 | `companies` | `name`、`short_name`、`slug`、`logo`、`cover`、`intro`、`address`、`main_business`、`registered_capital`、`sort`、`status` | 是 | 可选 | 实际页面位于 `web/pages/org/` |
| 单页正文 | `pages` | `title`、`slug`、`cover`、`content`、`status` | 可选 | 可选 | 集团简介、联系我们等可逐步接入 |
| 友情链接/底部外链 | `friend_links` | `title`、`url`、`position`、`sort`、`status` | 否 | 是 | 新增集合 |

## 4. 建议保持静态的内容

| 内容 | 保持静态原因 |
| --- | --- |
| 页面整体布局、CSS、动画、导航交互 | 已通过客户确认，本任务禁止修改视觉 |
| 组织架构 SVG/复杂图形 | 结构复杂，后台维护成本高，适合后续单独建模 |
| 项目地图坐标和复杂地图图层 | 更适合静态资产或后续 GIS/地图模型 |
| 在线留言前端交互 | 当前为前端表单演示，后续如需真实提交再建模 |
| 业务板块和社会责任页的数字指标 | 目前不属于首页指标，先保持静态；后续如需动态化再评估 `home_metrics` 或页面指标模型 |
| CDN Swiper、站点基础脚本 | 属于页面运行基础，不进入 CMS |

## 5. 是否需要新增集合

需要新增：

- `home_sections`：维护首页区块标题、对应 collection/channel、显示数量和排序。
- `quick_links`：维护首页快速入口、栏目快捷按钮和底部相关推荐。
- `friend_links`：维护友情链接和外部相关站点。

暂不新增：

- `home_metrics`：当前首页入口未发现独立数字指标模块。

## 6. 静态内容导入策略

- `extract-static-content.mjs` 只扫描并生成 `seed-from-web.generated.json`，不写 Directus。
- 自动提取只保留高置信度字段：页面标题、H1/H2/H3、链接、图片、首段简介。
- 复杂模块会在 JSON 中标记 `uncertain=true`，导入前应人工复核。
- `import-static-content.mjs` 只新增或在 `FORCE_UPDATE=true` 时更新，默认不覆盖客户已维护内容。
