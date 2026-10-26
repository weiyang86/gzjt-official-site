# 资料下载中心实施说明

## 1. 任务对应关系

对应 Excel 原始条目 `33 资料下载`、实际任务顺序 `21`。

已交付：

- 独立前台页面 `/downloads`，支持按资料分类筛选；
- 独立后台菜单“资料下载”，支持分类和资料的新增、编辑、排序、启用、停用；
- 资料支持名称、说明、附件、分类、排序和启停；
- 复用现有后台附件上传能力（PDF、Word、Excel，单文件不超过 50MB）；
- 前台只读取启用分类下的启用资料；
- 未新增数据库表或字段。

## 2. 数据模型

不新增表。复用现有 `page_content_items`，以 `module_code = download-center` 区分资料下载数据。

| 业务对象 | `item_type` | 字段映射 |
| --- | --- | --- |
| 资料分类 | `download_category` | `title` 分类名称，`subtitle` 分类标识，`content` 分类说明，`sort` 排序，`status` 启停 |
| 资料 | `download` | `title` 资料名称，`content` 说明，`subtitle` 分类标识，`link_url` 附件文件 ID，`sort` 排序，`status` 启停，`extra_json` 保存文件名、大小、类型 |

约束：

- 分类标识只允许小写字母、数字和连字符，且必须唯一；
- 资料必须选择已存在分类并上传附件；
- 分类标识修改时，会同步更新其下资料的分类引用；
- 后台只做停用，不做物理删除；
- 停用分类后，该分类及其下资料不在前台显示；
- 附件信息以服务端读取到的 `directus_files` 元数据为准，不信任客户端传入的文件名和大小。

## 3. 前台实现

新增文件：

- `web/app/downloads/page.tsx`
- `web/app/downloads/downloads.module.css`
- `web/app/api/public/cms/downloads/route.ts`

读取封装：

- `web/lib/cms/site-content.ts` 新增 `getPublicDownloadCenter()`；
- `web/types/cms.ts` 新增 `DownloadCategory`、`DownloadResource`、`DownloadCenterData`。

页面行为：

- `/downloads` 展示全部启用资料；
- `/downloads?category=<slug>` 展示指定启用分类下的资料；
- 无效分类参数回退到全部资料；
- 空数据显示“暂无已发布的资料，敬请关注。”；
- 分类为空时显示“该分类下暂无已发布的资料，敬请关注。”；
- 附件缺失时显示“附件暂不可用”；
- 接口异常时显示“资料下载暂时无法加载，请稍后再试。”。

公开接口：

```text
GET /api/public/cms/downloads
=> { categories: [], resources: [] }
```

## 4. 后台实现

新增文件：

- `web/app/admin/downloads/page.tsx`
- `web/app/admin/components/downloads/DownloadManager.tsx`

导航与权限：

- 后台菜单新增 `downloads`，路径 `/admin/downloads`；
- 权限管理页面会自动出现“资料下载”菜单项；
- 没有 `downloads` 菜单权限的普通账号访问后台资料接口会返回 403；
- 超级管理员不受菜单权限限制。

后台接口：

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| GET | `/admin-api/download-categories` | 分类列表，支持 `keyword`、`status` |
| POST | `/admin-api/download-categories` | 新增分类 |
| GET | `/admin-api/download-categories/:id` | 分类详情 |
| PATCH | `/admin-api/download-categories/:id` | 修改分类；修改标识时同步资料引用 |
| PATCH | `/admin-api/download-categories/:id/enable` | 启用分类 |
| PATCH | `/admin-api/download-categories/:id/disable` | 停用分类 |
| GET | `/admin-api/downloads` | 资料列表，支持 `keyword`、`status`、`category_slug` |
| POST | `/admin-api/downloads` | 新增资料 |
| GET | `/admin-api/downloads/:id` | 资料详情 |
| PATCH | `/admin-api/downloads/:id` | 修改资料 |
| PATCH | `/admin-api/downloads/:id/enable` | 启用资料 |
| PATCH | `/admin-api/downloads/:id/disable` | 停用资料 |

接口均要求现有后台登录会话；文件上传继续使用现有 `POST /admin-api/files`。

## 5. 导航同步

新增脚本 `scripts/portal/sync-download-center.mjs`，默认只预览：

```powershell
$env:CMS_DATA_API_URL='https://portal.gzjtjt.cn/_plugins/gw/curd'
node scripts/portal/sync-download-center.mjs
```

确认后写入：

```powershell
node scripts/portal/sync-download-center.mjs --apply
```

脚本会优先把“资料下载”挂到“信息公开”下；如果找不到“信息公开”，则创建顶级“资料下载”栏目。已存在 `slug=downloads` 或 `path=/downloads` 时复用，不重复创建。

本次开发仅执行了 dry-run，未向共享数据源写入导航记录。正式启用前需确认目标数据源并执行上述 `--apply` 命令，或在现有“导航树管理”中手工新增“资料下载”菜单，路径填写 `/downloads`。

## 6. 验证结果

已执行：

```powershell
cd web
npx tsc --noEmit --pretty false
# 退出码 0

cd ..
node --check scripts/portal/sync-download-center.mjs
# 退出码 0
```

本地 Next 服务实测：

```text
GET /downloads                    => 200，包含“资料下载中心”和空数据提示
GET /api/public/cms/downloads     => 200，返回 {"categories":[],"resources":[]}
GET /admin/downloads              => 307，未登录时跳转登录页
GET /admin-api/downloads          => 401，未登录时拒绝访问
```

导航同步脚本 dry-run 结果：

```text
新建栏目：资料下载（downloads，/downloads）
父级：信息公开（information-disclosure）
排序：8，状态：enabled，前台可见：true
```

未验证项：

- 未使用真实后台账号执行分类/资料新增、编辑、排序、启停和附件上传的端到端写入验证；
- 未验证部署环境中的附件下载响应头、移动端视觉和真实网络下的文件下载；
- 未执行生产数据同步，导航入口需按第 5 节确认后启用。

## 7. 数据库与部署影响

- 数据库结构：无变更，未新增表、字段或迁移脚本。
- 数据：在 `page_content_items` 中新增 `module_code=download-center` 的分类和资料记录；导航同步会新增或复用一条 `channels` 记录。
- 部署配置：无变更，不新增环境变量。
- 回滚：回退本任务代码即可；如已执行导航同步，可在“导航树管理”中停用“资料下载”菜单，或保留数据不影响其他模块。后台资料记录可停用，不建议直接删除。

## 8. 安全性

- 前台接口只返回 `status=enabled` 的分类和资料，且隐藏停用分类下的资料；
- 后台接口要求登录会话和菜单权限；
- 上传文件类型与大小由现有上传接口校验；
- 附件元数据由服务端读取，不信任客户端输入；
- 未提交 `.env`、密码、密钥或真实隐私数据。
