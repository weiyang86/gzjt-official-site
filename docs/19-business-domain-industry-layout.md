# 产业布局功能修改说明

- 文档日期：2026-10-25
- 对应任务：任务 11「产业布局」
- 开发分支：`feature/website-task-11-business-layout`
- 代码基线：`bd34739`
- 变更内容：将“产业布局”从“集团概况”中迁出，新增一级栏目“业务领域”，其下设置二级栏目“产业布局”，后台对应模块名称为“产业布局栏目”

## 0. 修改说明摘要

### 0.1 修改了哪些文件

本次共修改 17 个文件，其中新增 4 个、修改 13 个。

新增：

- `web/app/admin/components/content/BusinessSectorManager.tsx`
- `scripts/portal/sync-business-domain.mjs`
- `docs/18-development-data-source-portal-plugin.md`
- `docs/19-business-domain-industry-layout.md`

修改：

- `web/app/site-pages.tsx`
- `web/app/business/page.tsx`
- `web/app/business-dev/page.tsx`
- `web/app/news/components.tsx`
- `web/app/admin/components/content/ContentManagerPage.tsx`
- `web/app/admin/components/content/types.ts`
- `web/lib/admin/admin-api.ts`
- `web/app/admin-api/[...path]/route.ts`
- `web/lib/cms/api-store.js`
- `scripts/directus/bootstrap-directus.mjs`
- `docs/14-page-modules-placeholder-plan.md`
- `docs/16-page-content-admin-model.md`
- `docs/api-datastore-runbook.md`

### 0.2 新增了哪些功能

- 前台新增“业务领域 → 产业布局”导航层级，页面地址保持 `/business`；`/business-dev` 保留兼容。
- 产业布局页面读取 `business_sectors` 中启用的产业数据，按 `sort` 升序展示产业卡片；通过 `?sector=<slug>` 打开产业详情，无效标识不影响列表展示；空数据显示“暂无已发布的产业内容，敬请关注。”，接口异常时使用现有静态产业数据兜底。
- 后台新增“业务领域 → 产业布局栏目”管理入口，复用 `sector_list` 模块，支持产业名称、标识、简介、图片、排序和启停状态维护；仅停用，不做物理删除。
- 新增后台产业数据接口 `/admin-api/business-sectors`，提供列表、详情、新增、修改、启用和停用能力，并接入现有登录会话和内容管理权限。
- 新增门户数据同步脚本 `scripts/portal/sync-business-domain.mjs`，默认预览，追加 `--apply` 才写入；重复执行不会重复创建一级栏目或模块。
- 原 4 个历史产业模块保留记录但停用，避免丢失审计和回滚依据。

### 0.3 如何本地验证

```powershell
cd web
npx tsc --noEmit
```

```powershell
cd ..
node --check scripts/portal/sync-business-domain.mjs
node --check scripts/directus/bootstrap-directus.mjs
```

启动本地服务后检查：

```text
GET /api/public/cms/navigation                 => 200，业务领域为一级栏目，产业布局为其子栏目
GET /api/public/cms/business-sectors           => 200，返回 3 条启用产业数据
GET /business                                  => 200
GET /business?sector=project-construction      => 200
GET /business-dev                              => 200
```

数据侧确认：`business-domain` 下只有 `business-layout` 为启用模块，4 个历史模块均为停用。后台登录后的新增、编辑、启停、图片上传，以及移动端视觉和真实部署环境尚未实测。

### 0.4 是否涉及数据库结构变化

不涉及表或字段变更。复用现有 `channels`、`page_modules`、`business_sectors`，未新增表、字段、枚举值或迁移脚本。本次只更新了共享数据源中的栏目、页面模块记录；`business_sectors` 表结构和公共接口 `/api/public/cms/business-sectors` 均未改变。

### 0.5 是否涉及部署配置变化

不涉及。未修改 `next.config`、`package.json`、环境变量、容器或 Nginx 配置。门户数据同步脚本属于一次性数据整理工具，不是运行时依赖；其他环境如需同步，应先预览，确认后再执行 `--apply`。`CMS_DATA_API_URL` 支持传入 `_plugins` 根地址并自动补全 `/gw/curd`，属于兼容处理，未新增配置项。

### 0.6 回滚方式

代码回退到基线 `bd34739`，或提交后执行 `git revert` 本次提交并重新构建；新增文件随提交回退。数据回滚按本文第 7 节恢复栏目和页面模块字段。门户数据 API 没有事务回滚接口，其他环境执行同步前应先导出相关 `channels`、`page_modules` 记录；已经执行同步的环境需要手工恢复，不以删除业务数据作为回滚手段。

## 1. 最终栏目结构

```text
业务领域（一级栏目，/business）
└── 产业布局（二级栏目，/business）
    └── 产业布局栏目（后台内容管理模块）
```

- 前台导航不再在“集团概况”下显示“业务板块”。
- “集团概况”仅保留集团简介、集团历程、集团主要领导、组织架构。
- 原有“业务动态”一级栏目保持不变，它属于新闻动态，不属于本次的产业布局。
- 产业布局页面地址仍为 `/business`，首页产业卡片和历史链接不需要改地址。
- 产业布局页面标题、面包屑、详情区域和空状态文案统一使用“产业布局 / 产业板块”表述。
- 后台内容管理目录显示为“业务领域 → 产业布局栏目”，进入后使用现有的业务板块管理表单。

## 2. 数据源调整

本地开发通过 `CMS_DATA_API_URL` 读取门户数据 API，因此栏目和页面模块调整直接写入门户共享数据源。

### 2.1 `channels`

| 项目 | 调整前 | 调整后 |
| --- | --- | --- |
| 一级栏目 | 无 | `业务领域` / `business-domain` / `/business` / `sort=2` |
| 二级栏目 | `业务板块` / `group-business-sectors`，父级为集团概况 | `产业布局` / `business-layout`，父级为业务领域 |
| 原栏目挂载点 | `/about#sectors` | `/business` |

本次写入后的记录 ID：

```text
业务领域  38259839-92fb-4352-927d-ce5c4f12741f
产业布局  2488c815-3850-40cd-a3e6-b52279151bc8
```

说明：

- 复用原“业务板块”栏目记录，避免丢失其下已有的产业子栏目关联。
- 原“业务板块”栏目下的产业子项仍保留在 `channels` 中，作为产业布局内容数据，不再显示为集团概况的二级导航。
- `channels` 负责前台导航与新闻栏目；前台导航接口 `/api/public/cms/navigation` 已按新父级关系返回“业务领域 → 产业布局”。

### 2.2 `page_modules`

| 项目 | 调整前 | 调整后 |
| --- | --- | --- |
| 一级目录 | `业务板块` / `business` | `业务领域` / `business-domain` |
| 二级模块 | 项目建设、经营管理、交旅融合、特许服务、新兴产业（5 项） | 产业布局栏目（1 项） |
| 模块编码 | 多个产业板块编码 | `business-layout` |
| 内容类型 | `sector_list` | `sector_list` |
| 前台路径 | `/pages/business/index.html` | `/business` |
| 后台开放 | 部分开放 | 已开放 |

本次升级的模块记录 ID：

```text
产业布局栏目  e63507db-fde6-483e-bf82-793b47157825
```

原“经营管理、交旅融合、特许服务、新兴产业”四个历史模块已改为：

```text
status = disabled
dev_status = disabled
admin_enabled = false
remark = 已合并至“产业布局栏目”。
```

这样处理的原因：

- 保留历史记录，便于审计和回滚，不直接删除共享数据。
- 后台“页面内容管理”只读取 `status=enabled` 的页面模块，因此目录中只显示“业务领域 → 产业布局栏目”。
- 页面模块管理页仍可看到历史停用项，便于确认迁移结果。

## 3. 核心代码调整

以下为本次改造的核心链路，完整文件清单见 0.1。

| 文件 | 说明 |
| --- | --- |
| `web/app/site-pages.tsx` | 产业布局页面标题、面包屑、主视觉、产业体系和详情文案统一为“产业布局”；列表仍读取 `business_sectors` |
| `web/app/news/components.tsx` | 增加“业务领域 / 产业布局”导航高亮映射，保留“业务发展”兼容旧名称 |
| `web/app/admin/components/content/BusinessSectorManager.tsx` | 后台表单和列表文案调整为产业布局语境，功能仍维护 `business_sectors` |
| `scripts/directus/bootstrap-directus.mjs` | 页面模块种子改为“业务领域 / 产业布局栏目” |
| `scripts/portal/sync-business-domain.mjs` | 门户数据源的幂等同步脚本，默认只预览，追加 `--apply` 才写入 |

`business_sectors` 表结构、字段和前台接口 `/api/public/cms/business-sectors` 均未改变。

## 4. 门户数据同步脚本

脚本默认连接 `CMS_DATA_API_URL`，支持传入 `_plugins` 根地址或完整 `/gw/curd` 地址。

仅预览：

```powershell
cd gzjt-official-site
$env:CMS_DATA_API_URL='https://portal.gzjtjt.cn/_plugins'
node scripts/portal/sync-business-domain.mjs
```

确认后写入：

```powershell
node scripts/portal/sync-business-domain.mjs --apply
```

脚本行为：

1. 查找或新建一级栏目“业务领域”。
2. 将原“业务板块”栏目迁移为“产业布局”，并挂到“业务领域”下。
3. 将“产业布局栏目”模块升级为可编辑的 `sector_list` 模块。
4. 停用其余历史产业页面模块。
5. 重复执行不会重复创建一级栏目或模块。

## 5. 验证结果

```text
GET /api/public/cms/navigation
=> 顶级栏目包含“业务领域”，其直接子栏目为“产业布局”

GET /api/public/cms/business-sectors
=> 200，返回 3 条启用产业数据

GET /business
=> 200

后台“页面内容管理”
=> 业务领域 → 产业布局栏目（admin_enabled=true，可直接维护产业板块）

后台“页面模块”
=> 业务领域下 产业布局栏目为已启用；4 个历史模块为已停用
```

## 6. 数据库与部署影响

- 不涉及数据库表结构变更。
- 本次 `channels`、`page_modules` 数据更新写入门户共享数据源，会同时影响使用该数据源的环境。
- 不涉及生产部署配置变更。
- `.env.local` 不提交 Git，不记录任何密钥。

## 7. 回滚方式

1. 恢复原栏目数据：

```text
产业布局（2488c815-3850-40cd-a3e6-b52279151bc8）
name = 业务板块
slug = group-business-sectors
parent = 564a0a2b-21d4-45bb-ae9c-c6900933bbbb（集团概况）
path = /about#sectors
sort = 4
```

2. 停用新建的“业务领域”栏目 `38259839-92fb-4352-927d-ce5c4f12741f`，并将其从导航中解除挂载；仅在确认不存在关联数据和审计要求后，才考虑删除该记录。
3. 将模块 `e63507db-fde6-483e-bf82-793b47157825` 恢复为：

```text
parent_title = 业务板块
parent_code = business
module_title = 项目建设
module_code = project-construction
route_path = /pages/business/index.html
admin_enabled = true
dev_status = enabled
status = enabled
sort = 301
```

4. 将 `operation-management`、`transport-tourism`、`franchise-service`、`emerging-industry` 四个模块恢复为 `enabled`。
5. 同步回滚代码改动后重新构建前端。

门户数据 API 没有事务回滚接口，建议在执行 `--apply` 前先通过 `read` 接口导出相关 `channels`、`page_modules` 记录。
