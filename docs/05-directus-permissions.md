# Directus 权限设计

## 1. 权限目标

前台访问必须遵循最小权限原则：只读取已发布或启用的公开内容，不能读取草稿、归档、后台用户、角色、权限或任何敏感配置。

本文件仅说明 Directus Studio 中的权限配置方案，不连接真实 Directus，不写自动权限脚本。

## 2. 角色划分建议

| 角色 | 用途 | 说明 |
| --- | --- | --- |
| `Administrator` | 系统管理员 | Directus 默认管理员，拥有全部权限，仅限可信人员 |
| `Editor` | 内容编辑 | 可创建和编辑内容，但发布可按流程另行限制 |
| `Public` | 官网前台匿名访问 | 只读 published/enabled 内容，不能访问系统集合 |

## 3. Public 权限总原则

Public 角色必须满足：

- 前台只能读 `published` / `enabled` 内容。
- 不能读 `draft` 内容。
- 不能读 `archived` 内容。
- 不能读 `directus_users`。
- 不能读 `directus_roles`。
- 不能读 `directus_permissions`。
- 不能创建、更新、删除任何业务集合数据。
- 文件读取仅限公开内容引用到的文件；敏感文件不要上传到公开资产中。

## 4. Public 集合权限矩阵

| 集合 | Read | Create | Update | Delete | 过滤条件 |
| --- | --- | --- | --- | --- | --- |
| `channels` | 允许 | 禁止 | 禁止 | 禁止 | `status = enabled` |
| `articles` | 允许 | 禁止 | 禁止 | 禁止 | `status = published` |
| `companies` | 允许 | 禁止 | 禁止 | 禁止 | `status = enabled` |
| `business_sectors` | 允许 | 禁止 | 禁止 | 禁止 | `status = enabled` |
| `pages` | 允许 | 禁止 | 禁止 | 禁止 | `status = published` |
| `banners` | 允许 | 禁止 | 禁止 | 禁止 | `status = published` |
| `site_settings` | 允许 | 禁止 | 禁止 | 禁止 | `enabled = true` |
| `directus_files` | 谨慎允许 | 禁止 | 禁止 | 禁止 | 仅公开资产；避免上传敏感文件 |
| `directus_users` | 禁止 | 禁止 | 禁止 | 禁止 | 无 |
| `directus_roles` | 禁止 | 禁止 | 禁止 | 禁止 | 无 |
| `directus_permissions` | 禁止 | 禁止 | 禁止 | 禁止 | 无 |

## 5. Public 字段权限建议

### `articles`

Public 允许读取字段：

- `id`
- `title`
- `subtitle`
- `cover`
- `summary`
- `content`
- `main_channel`
- `related_company`
- `related_sector`
- `source`
- `author`
- `publish_at`
- `status`
- `is_top`
- `is_home_recommend`
- `sort`
- `attachments`

Public 不应读取系统审计字段，除非前端确有需要，例如：

- `user_created`
- `user_updated`
- `date_created`
- `date_updated`

### `channels`

Public 允许读取 `id`、`name`、`slug`、`parent`、`description`、`route_path`、`status`、`sort`。

### `companies`

Public 允许读取 `id`、`name`、`slug`、`logo`、`summary`、`content`、`address`、`phone`、`status`、`sort`。

### `business_sectors`

Public 允许读取 `id`、`name`、`slug`、`icon`、`cover`、`summary`、`content`、`status`、`sort`。

### `pages`

Public 允许读取 `id`、`title`、`slug`、`summary`、`content`、`cover`、`seo_title`、`seo_description`、`status`、`sort`。

### `banners`

Public 允许读取 `id`、`title`、`subtitle`、`image`、`link_url`、`position`、`status`、`sort`、`start_at`、`end_at`。

### `site_settings`

Public 允许读取站点展示所需字段，例如站点名称、Logo、页脚文案、SEO 文案和公开联系方式。不要在该集合保存密钥、密码、服务器地址或内部账号。

## 6. 首页查询权限要求

首页公开接口或前台请求必须满足：

| 首页区域 | 权限过滤 |
| --- | --- |
| 首页轮播 | `banners.position = home` 且 `banners.status = published` |
| 集团新闻 | `articles.main_channel.slug = group-news` 且 `articles.status = published` |
| 业务动态 | `articles.main_channel.slug = business-news` 且 `articles.status = published` |
| 党建群团 | `articles.main_channel.slug = party-mass` 且 `articles.status = published` |
| 公示公告 | `articles.main_channel.slug = announcements` 且 `articles.status = published` |

## 7. Editor 权限建议

Editor 可用于日常内容维护，但不建议授予系统配置和用户权限管理能力：

- 可以创建和编辑 `channels`、`articles`、`companies`、`business_sectors`、`pages`、`banners`。
- 是否允许直接设置 `status=published` 由发布流程决定；如需审核流程，可限制普通 Editor 只能保存 `draft`。
- 不允许管理 `directus_users`、`directus_roles`、`directus_permissions`。
- 不允许修改生产部署相关配置或密钥。

## 8. 前端 API 接入建议

- 不建议静态页面直接散落调用 Directus；应在 `web/` 内统一封装 CMS API 请求。
- 如继续使用 `web/services/cms-api/`，建议由该服务负责聚合首页数据、追加状态过滤、限制字段和处理错误。
- 前台详情接口必须同时检查文章 ID/slug 与 `status=published`，避免草稿通过直接 URL 泄露。
- Public token 或匿名权限只用于读取公开内容，不能出现在可写接口中。

## 9. 权限验收清单

- [ ] 匿名访问可读取 published 文章。
- [ ] 匿名访问不可读取 draft 文章。
- [ ] 匿名访问不可读取 archived 文章。
- [ ] 匿名访问只可读取 enabled 栏目、公司、业务板块和站点配置。
- [ ] 匿名访问不可读取 `directus_users`。
- [ ] 匿名访问不可读取 `directus_roles`。
- [ ] 匿名访问不可读取 `directus_permissions`。
- [ ] 匿名访问不可创建、更新或删除任意业务集合。
- [ ] 首页各区域返回结果符合指定 slug 与发布状态过滤。
