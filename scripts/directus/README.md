# Directus 自动初始化脚本

本目录用于本地 Directus 12.x 自动初始化。脚本通过 Directus REST API 登录并创建 Collections、Fields、Relations 和测试数据，不直接写 SQL，不修改 `web/` 前端页面。

## 1. 启动 Directus

在仓库根目录执行：

```bash
cp .env.directus.example .env.directus
```

编辑 `.env.directus`，至少修改：

- `POSTGRES_PASSWORD`
- `DIRECTUS_KEY`
- `DIRECTUS_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

启动本地 Directus：

```bash
docker compose --env-file .env.directus -f docker-compose.directus.yml up -d
```

Directus 地址：<http://localhost:8055>。

## 2. 运行自动初始化

脚本读取：

- `DIRECTUS_URL`，默认 `http://localhost:8055`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

推荐命令：

```bash
set -a
source .env.directus
set +a
DIRECTUS_URL=http://localhost:8055 node scripts/directus/bootstrap-directus.mjs
```

如果提示缺少 `ADMIN_EMAIL` 或 `ADMIN_PASSWORD`，请检查 `.env.directus` 是否存在、是否已填写，并确认当前 shell 已执行 `source .env.directus`。

## 3. 脚本会自动完成什么

脚本会幂等创建或补齐以下集合：

- `channels`
- `companies`
- `business_sectors`
- `pages`
- `banners`
- `articles`
- `site_settings`

脚本会创建字段、尝试创建文件和多对一关系，并插入测试数据：

- 栏目：集团新闻、业务动态、党建群团、公示公告、行业要闻、媒体聚焦。
- 首页轮播：3 条 `position=home`、`status=published`。
- 公司：至少 2 家 `status=enabled` 示例公司。
- 业务板块：项目建设、经营管理、交旅融合。
- 单页：集团简介、联系我们。
- 文章：`group-news`、`business-news`、`party-mass`、`announcements` 每个栏目至少 2 条 `published` 文章。

脚本具有幂等性：集合、字段、关系或测试数据已存在时，会跳过或更新，不应因重复运行直接失败。

## 4. 验证初始化结果

以下命令默认在已配置 Public 读取权限后可匿名访问；如果返回 403，请看下一节检查 Public 权限。

### 验证 channels

```bash
curl 'http://localhost:8055/items/channels?filter[status][_eq]=enabled&fields=id,name,slug,status,visible'
```

### 验证 banners

```bash
curl 'http://localhost:8055/items/banners?filter[position][_eq]=home&filter[status][_eq]=published&fields=id,title,position,status,sort'
```

### 验证 articles

```bash
curl 'http://localhost:8055/items/articles?filter[status][_eq]=published&fields=id,title,status,main_channel.slug&deep[main_channel][_filter][slug][_eq]=group-news'
```

或登录后台后在 Content 模块查看 `articles` 集合。

### 验证 companies

```bash
curl 'http://localhost:8055/items/companies?filter[status][_eq]=enabled&fields=id,name,slug,status'
```

## 5. 如果接口返回 403，如何检查 Public 权限

Directus 12.x 界面左侧包含 Data Model、User Roles、Access Policies。由于不同 Directus 12 小版本的 Access Policies API 可能变化，脚本会尝试自动配置 Public 只读权限；如果自动配置失败，集合、字段和测试数据仍会保留，请手工确认：

1. 打开 <http://localhost:8055/admin>。
2. 使用 `.env.directus` 中的管理员账号登录。
3. 进入 **User Roles** 或 **Access Policies**。
4. 找到 Public / Anonymous 相关策略。
5. 只开启以下集合的 read 权限，不开启 create、update、delete：
   - `channels`：过滤 `visible=true`、`status=enabled`
   - `articles`：过滤 `status=published`
   - `companies`：过滤 `status=enabled`
   - `business_sectors`：过滤 `status=enabled`
   - `pages`：过滤 `status=published`
   - `banners`：过滤 `status=published`
   - `site_settings`：read
6. 不要开放以下系统集合：
   - `directus_users`
   - `directus_roles`
   - `directus_permissions`
   - `directus_activity`
7. 保存后重新执行上面的 `curl` 验证命令。

## 6. 回滚本地初始化数据

本地开发环境可直接清理 Directus 数据目录后重启：

```bash
docker compose --env-file .env.directus -f docker-compose.directus.yml down
rm -rf .data/directus
docker compose --env-file .env.directus -f docker-compose.directus.yml up -d
```

请勿在生产环境使用上述清理方式。

## 7. 初始化后如何创建客户账号

本阶段建议交付 Directus Studio 作为客户 CMS 后台，不重新开发独立后台。运行初始化脚本后，脚本会尽量创建以下客户角色：

- 系统管理员
- 集团内容管理员
- 审核发布员
- 下属公司通讯员
- 只读查看员

由于 Directus 12.x 的 **User Roles / Access Policies** API 可能因小版本差异而变化，脚本创建角色或权限失败时不会中断内容模型和测试数据初始化。交付前请按 `docs/06-directus-customer-roles.md` 手工确认角色和权限。

### 创建客户账号建议

1. 使用技术管理员账号登录 <http://localhost:8055/admin>。
2. 进入 **User Directory / Users**（或当前版本对应的用户管理入口）。
3. 点击创建用户。
4. 填写客户真实邮箱、姓名和临时密码。
5. 为用户绑定合适角色：
   - 日常内容维护：集团内容管理员。
   - 审核发布：审核发布员。
   - 下属公司供稿：下属公司通讯员。
   - 领导或审阅人员：只读查看员。
6. 不要把普通客户账号加入系统管理员角色。
7. 通过线下安全渠道交付初始密码，并要求客户首次登录后修改。
8. 不要把客户账号、密码、邮箱清单提交到 Git。

### 交付前权限复核

- 普通客户账号不应管理 Data Model。
- 普通客户账号不应管理 User Roles / Access Policies。
- 普通客户账号不应访问 `directus_users`、`directus_roles`、`directus_permissions`、`directus_activity` 等系统集合。
- 下属公司通讯员不应直接发布内容。
- 只读查看员不应创建、更新、删除任何内容。

详细角色矩阵见 `docs/06-directus-customer-roles.md`。

## 8. 从现有前端静态内容生成并导入 Directus seed

CMS-05A 增加了“先提取、再复核、最后导入”的流程，避免脚本直接猜测复杂页面结构并写入 Directus。

### 1) 重新执行基础模型初始化

新增的 `home_sections`、`quick_links`、`friend_links` 以及 `source_file` 字段由 bootstrap 脚本幂等创建：

```bash
set -a
source .env.directus
set +a
DIRECTUS_URL=http://localhost:8055 node scripts/directus/bootstrap-directus.mjs
```

### 2) 执行静态内容提取

```bash
node scripts/directus/extract-static-content.mjs
```

脚本会扫描 `web/` 现有 HTML 页面并生成：

```text
scripts/directus/seed-from-web.generated.json
```

如果文件已存在，脚本默认不会覆盖。需要重新生成时执行：

```bash
node scripts/directus/extract-static-content.mjs --force
```

### 3) 复核 seed-from-web.generated.json

导入前必须人工复核：

- `source_file` 是否正确记录来源页面；
- `uncertain=true` 的内容是否需要删除、改标题或改栏目；
- 图片路径是否仍是静态路径，是否需要后续手工上传到 Directus Files；
- 文章是否应归入正确 `channel_slug`；
- `quick_links` / `friend_links` 是否存在无效链接。

如果自动提取不准确，请直接手工修改 `seed-from-web.generated.json`，再执行导入。

### 4) 执行静态内容导入

```bash
set -a
source .env.directus
set +a
DIRECTUS_URL=http://localhost:8055 node scripts/directus/import-static-content.mjs
```

导入脚本会按 `slug`、`title`、`source_file` 查重，默认跳过已存在内容，不删除客户已维护数据，也不覆盖客户已编辑内容。

如确需用 JSON 覆盖已存在数据，可显式设置：

```bash
FORCE_UPDATE=true DIRECTUS_URL=http://localhost:8055 node scripts/directus/import-static-content.mjs
```

### 5) 验证 Directus 数据

```bash
curl 'http://localhost:8055/items/pages?fields=id,title,slug,source_file&limit=5'
curl 'http://localhost:8055/items/articles?fields=id,title,status,source_file&limit=5'
curl 'http://localhost:8055/items/quick_links?fields=id,title,url,source_file&limit=5'
curl 'http://localhost:8055/items/home_sections?fields=id,title,slug,channel_slug,status&limit=10'
```
