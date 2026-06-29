# ADMIN-07 页面模块占位模型与初始化计划

## 1. 目标与边界

`page_modules` 是面向简单后台的“页面模块占位管理项”，用于把官网一级栏目下的二级页面先纳入后台可见、可维护的开发规划中。

本阶段只完成 Directus 模型、初始化数据和文档说明：

- 当前不替换前端页面。
- 不修改 `web/pages/` 下任何页面文件。
- 不修改官网前台 CSS、布局、动画和路由。
- 不做二级页面动态化渲染。
- 所有二级模块默认处于 `dev_status=developing`，占位文案为“正在开发中”。

## 2. 新增集合：`page_modules`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `module_title` | String | 二级模块名称，例如“企业简介”。 |
| `module_code` | String | 二级模块编码，例如 `group-intro`，用于幂等更新和后续路由/接口识别。 |
| `parent_title` | String | 一级栏目名称，例如“集团概况”。 |
| `parent_code` | String | 一级栏目编码，例如 `group-overview`。 |
| `route_path` | String | 当前对应的前端入口路径，例如 `/pages/about/index.html`。 |
| `content_type` | Select | 内容形态：`intro` / `timeline` / `org_chart` / `list` / `page` / `static` / `custom`。 |
| `dev_status` | Select | 开发状态：`developing` / `enabled` / `disabled`，默认 `developing`。 |
| `placeholder_text` | Text | 占位提示，默认“正在开发中”。 |
| `sort` | Integer | 排序值，按一级栏目分段设置。 |
| `remark` | Text | 备注，记录当前为 ADMIN-07 占位项。 |
| `status` | Select | 管理项状态：`enabled` / `disabled`。 |

## 3. 初始化一级栏目与二级模块

| 一级栏目 | 一级编码 | 二级模块 |
| --- | --- | --- |
| 集团概况 | `group-overview` | 企业简介、发展历程时间轴、组织架构图、集团主要领导 |
| 新闻中心 | `news-center` | 集团新闻、行业要闻、媒体聚焦 |
| 业务板块 | `business` | 项目建设、经营管理、交旅融合、特许服务、新兴产业 |
| 下属公司 | `companies` | 公司列表、公司简介、公司动态 |
| 党建群团 | `party-mass` | 党建动态、群团工作、工会工作、青年工作 |
| 项目建设 | `projects` | 项目动态、安全环保、科技创新 |
| 社会责任 | `responsibility` | 社会责任、乡村振兴、志愿服务 |
| 信息公开 | `information` | 人才招聘、公示公告、集中招采采购平台 |
| 联系我们 | `contact` | 电话、邮箱、地址 |

初始化数据按当前 `web/pages/` 现有入口映射 `route_path`：集团概况对应 `/pages/about/index.html`，新闻中心对应 `/pages/news/index.html`，业务板块对应 `/pages/business/index.html`，下属公司对应 `/pages/org`，党建群团对应 `/pages/party/index.html`，项目建设对应 `/pages/projects/index.html`，社会责任对应 `/pages/responsibility/index.html`，信息公开暂按现有兼容路径 `/disclosure` 预留，联系我们对应 `/pages/contact/index.html`。

## 4. 与 `channels` 的区别

- `channels` 服务新闻分类和前台栏目读取，主要被 `articles.main_channel` 关联，用于新闻列表、筛选、发布和前台已发布内容展示。
- `page_modules` 服务后台页面管理占位和开发规划，描述一级栏目下有哪些二级页面需要后续逐步接入内容编辑。
- 两者允许存在相同业务名称，例如“集团新闻”既可以作为 `channels` 新闻分类，也可以作为 `page_modules` 中“新闻中心”下的页面模块占位。

## 5. 后续扩展方向

后续可按模块逐步开发独立内容编辑能力：

1. 对 `content_type=intro` 的模块接入富文本或单页内容编辑。
2. 对 `content_type=timeline` 的模块新增时间轴条目集合。
3. 对 `content_type=org_chart` 的模块接入组织架构图片或节点数据。
4. 对 `content_type=list` 的模块复用 `articles`、`companies` 或专用集合。
5. 当某个模块真实上线后，将 `dev_status` 从 `developing` 调整为 `enabled`。

## 6. 初始化与验证

运行 bootstrap：

```bash
set -a
source .env.directus
set +a
DIRECTUS_URL=http://localhost:8055 node scripts/directus/bootstrap-directus.mjs
```

验证数据：

```bash
curl 'http://localhost:8055/items/page_modules?fields=id,parent_title,parent_code,module_title,module_code,route_path,content_type,dev_status,placeholder_text,status,sort&sort=sort&limit=50'
```

如果接口返回 403，请使用 Directus 管理员账号进入 Studio 查看 `page_modules` 集合，或检查角色/访问策略；本集合当前主要供后台管理规划使用，不要求开放 Public 读取权限。

## 7. 回滚方式

- 代码回滚：`git revert <ADMIN-07-commit>`。
- 本地 Directus 回滚：可在 Directus Studio 删除 `page_modules` 集合及其初始化数据；生产环境必须先备份数据库和 uploads，再评估是否删除集合。
- 前台回滚：本任务未修改前台页面、样式或路由，无需前台专项回滚。
