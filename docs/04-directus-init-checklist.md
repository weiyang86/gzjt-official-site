# Directus 初始化清单

## 1. 使用范围

本清单用于本地或测试环境中通过 Directus Studio 手工初始化内容模型、字段、权限和首批测试数据。不连接真实生产 Directus，不写自动建表脚本，不录入真实业务数据。

## 2. 初始化前检查

- 已阅读 `docs/03-directus-content-model.md`。
- 已使用本地示例环境变量启动 Directus。
- 已确认 `.env.directus` 和 `.data/` 不会提交到 Git。
- 已准备占位图片、示例标题和示例正文；不得使用真实客户隐私数据、真实密码或真实密钥。

## 3. Directus Studio 手工建模顺序

建议按依赖关系从基础集合到内容集合创建：

1. 创建 `channels`。
2. 创建 `companies`。
3. 创建 `business_sectors`。
4. 创建 `pages`。
5. 创建 `banners`。
6. 创建 `articles`，并配置到 `channels`、`companies`、`business_sectors`、`directus_files` 的关系字段。
7. 创建 `site_settings`，建议设置为 Singleton。
8. 配置 Public 角色只读权限和过滤条件。
9. 录入首批测试数据。
10. 使用 API 或 Directus 预览检查发布状态过滤是否生效。

## 4. 集合创建检查项

### `channels`

- [ ] 创建 `name`、`slug`、`parent`、`description`、`route_path`、`status`、`sort` 字段。
- [ ] 将 `slug` 设置为唯一。
- [ ] 将 `status` 限制为 `enabled` / `disabled`。
- [ ] 录入首页必备栏目 slug。

### `companies`

- [ ] 创建 `name`、`slug`、`logo`、`summary`、`content`、`address`、`phone`、`status`、`sort` 字段。
- [ ] 将 `slug` 设置为唯一。
- [ ] 将 `status` 限制为 `enabled` / `disabled`。
- [ ] 按 `web/pages/org/` 现有页面录入公司测试数据。

### `business_sectors`

- [ ] 创建 `name`、`slug`、`icon`、`cover`、`summary`、`content`、`status`、`sort` 字段。
- [ ] 将 `slug` 设置为唯一。
- [ ] 将 `status` 限制为 `enabled` / `disabled`。

### `pages`

- [ ] 创建 `title`、`slug`、`summary`、`content`、`cover`、`seo_title`、`seo_description`、`status`、`sort` 字段。
- [ ] 将 `slug` 设置为唯一。
- [ ] 将 `status` 限制为 `draft` / `published` / `archived`。

### `banners`

- [ ] 创建 `title`、`subtitle`、`image`、`link_url`、`position`、`status`、`sort`、`start_at`、`end_at` 字段。
- [ ] 将 `position` 至少配置 `home`。
- [ ] 将 `status` 限制为 `draft` / `published` / `archived`。

### `articles`

- [ ] 创建 `title`、`subtitle`、`cover`、`summary`、`content`、`source`、`author`、`publish_at`、`status`、`is_top`、`is_home_recommend`、`sort`、`attachments` 字段。
- [ ] 配置 `main_channel` 为 M2O -> `channels`。
- [ ] 配置 `related_company` 为 M2O -> `companies`。
- [ ] 配置 `related_sector` 为 M2O -> `business_sectors`。
- [ ] 配置 `cover` 与 `attachments` 到 `directus_files`。
- [ ] 将 `status` 限制为 `draft` / `published` / `archived`。

### `site_settings`

- [ ] 创建 `site_name`、`site_logo`、`footer_text`、`contact_phone`、`contact_address`、`icp_text`、`seo_title`、`seo_description`、`enabled` 字段。
- [ ] 建议设置为 Singleton。
- [ ] 只录入示例配置，不录入真实生产联系方式或备案信息。

## 5. 首批测试数据录入清单

### 栏目 `channels`

至少录入以下 enabled 栏目：

- [ ] `group-news`：集团新闻。
- [ ] `business-news`：业务动态。
- [ ] `party-mass`：党建群团。
- [ ] `announcements`：公示公告。
- [ ] `social-responsibility`：社会责任。
- [ ] `project-news`：项目动态。

### 首页轮播 `banners`

- [ ] 新增 2-3 条 `position=home`、`status=published` 的示例轮播。
- [ ] 新增 1 条 `status=draft` 的示例轮播，用于验证 Public 不可读草稿。

### 文章 `articles`

每个首页分区至少录入 2 条 `status=published` 示例文章：

- [ ] 集团新闻：`main_channel.slug=group-news`。
- [ ] 业务动态：`main_channel.slug=business-news`。
- [ ] 党建群团：`main_channel.slug=party-mass`。
- [ ] 公示公告：`main_channel.slug=announcements`。

额外录入：

- [ ] 每个栏目至少 1 条 `status=draft` 示例文章，用于验证 Public 不可读草稿。
- [ ] 至少 1 条 `is_top=true` 示例文章，用于验证置顶排序。
- [ ] 至少 1 条带 `cover` 的示例文章。
- [ ] 至少 1 条带 `attachments` 的示例文章。

### 下属公司 `companies`

按现有 `web/pages/org/` 页面准备示例数据：

- [ ] `investment`。
- [ ] `traffic`。
- [ ] `urban`。
- [ ] `consulting`。
- [ ] `digital`。
- [ ] `project-company`。

### 业务板块 `business_sectors`

- [ ] 录入 3-6 条 enabled 示例业务板块。
- [ ] 每条至少包含 `name`、`slug`、`summary`、`sort`。

### 单页 `pages`

至少录入：

- [ ] `about`：集团概况示例内容。
- [ ] `contact`：联系我们示例内容。
- [ ] `responsibility`：社会责任示例内容。

### 站点配置 `site_settings`

- [ ] 录入 1 条示例站点配置。
- [ ] `enabled=true`。
- [ ] 不使用真实生产电话、地址、备案号或隐私数据。

## 6. 验收检查

- [ ] 首页轮播只返回 `banners.position=home` 且 `status=published` 的数据。
- [ ] 首页集团新闻只返回 `articles.main_channel.slug=group-news` 且 `status=published` 的数据。
- [ ] 首页业务动态只返回 `articles.main_channel.slug=business-news` 且 `status=published` 的数据。
- [ ] 首页党建群团只返回 `articles.main_channel.slug=party-mass` 且 `status=published` 的数据。
- [ ] 首页公示公告只返回 `articles.main_channel.slug=announcements` 且 `status=published` 的数据。
- [ ] Public 角色不能读取任何 `draft` 或 `archived` 内容。
- [ ] Public 角色不能读取 `directus_users`、`directus_roles`、`directus_permissions`。
