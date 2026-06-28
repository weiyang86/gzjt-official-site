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
