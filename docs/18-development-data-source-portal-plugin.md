# 开发数据源切换说明（门户插件数据 API）

- 文档日期：2026-10-25
- 适用环境：本地开发环境（`web/.env.local`）
- 变更内容：将本地开发的数据 API 地址切换为 `https://portal.gzjtjt.cn/_plugins`

## 1. 变更目的

本地开发不再使用本地模拟数据服务，统一读取门户插件数据 API，便于直接联调门户中的真实表结构和数据。

本项目没有独立的本地业务数据库连接配置，前台和后台的数据访问统一通过 `CMS_DATA_API_URL` 指向的数据 API 完成。因此本次修改的是数据 API 环境变量及其地址适配逻辑，不涉及数据库结构迁移。

## 2. 最终配置

`web/.env.local` 中配置：

```env
CMS_DATA_API_URL=https://portal.gzjtjt.cn/_plugins
```

应用实际发起请求的地址为：

```text
https://portal.gzjtjt.cn/_plugins/gw/curd
```

说明：

- `_plugins` 是门户插件网关根地址。
- 数据 CRUD 请求仍需发送到网关下的 `/gw/curd` 路径。
- 单独访问 `https://portal.gzjtjt.cn/_plugins` 会返回 302 跳转，不能直接作为 CRUD 请求地址。

## 3. 实现方式

在 `web/lib/cms/api-store.js` 中增加数据 API 地址归一化处理：

- 去除配置值末尾多余的 `/`。
- 当配置值以 `/_plugins` 结尾时，自动追加 `/gw/curd`。
- 已经配置完整 `/gw/curd` 地址时保持原值，兼容旧配置。
- 请求体、鉴权方式及数据表结构均未改变。

因此下面两种写法均可正常工作：

```env
CMS_DATA_API_URL=https://portal.gzjtjt.cn/_plugins
CMS_DATA_API_URL=https://portal.gzjtjt.cn/_plugins/gw/curd
```

最终都会请求 `https://portal.gzjtjt.cn/_plugins/gw/curd`。

## 4. 修改文件

| 文件 | 说明 |
| --- | --- |
| `web/.env.local` | 本地开发数据 API 地址改为门户 `_plugins` 根地址 |
| `web/lib/cms/api-store.js` | 增加地址归一化，自动补全 `/gw/curd` |

`web/.env.local` 已被 `.gitignore` 忽略，不应提交到 Git，也不应复制到测试或生产环境。

## 5. 验证结果

已完成以下验证：

1. 地址归一化验证：

```text
输入：https://portal.gzjtjt.cn/_plugins
输出：https://portal.gzjtjt.cn/_plugins/gw/curd

输入：https://portal.gzjtjt.cn/_plugins/gw/curd
输出：https://portal.gzjtjt.cn/_plugins/gw/curd
```

2. 门户数据 API 读取验证：成功读取 `business_sectors` 表，当前返回 3 条启用数据：

```text
project-construction  项目建设
operation-management  经营管理
transport-tourism     交旅融合
```

3. 本地官网接口验证：

```text
GET /api/public/cms/business-sectors  => 200，返回 3 条业务板块
GET /business                         => 200
GET /business?sector=project-construction => 200
POST /admin-api/login（错误账号）      => 401，接口已正常访问门户用户数据
```

4. 本地开发服务已使用新配置重新启动。

## 6. 本地启动方式

修改 `.env.local` 后必须重启 Next.js 开发服务，环境变量不会在已运行的进程中自动刷新：

```powershell
cd web
npm run dev:site
```

访问：

```text
前台：http://localhost:3000
后台：http://localhost:3000/admin/login
```

## 7. 注意事项

1. 当前开发环境连接的是门户共享数据源，后台的新增、修改、启停操作会直接影响门户中的数据，不再局限于本机模拟数据。
2. 本机原有测试数据不会自动迁移到门户，门户中已有的表结构和字段需与官网适配层保持一致。
3. 本次没有数据库表结构变更，也没有生产环境配置变更。
4. 生产部署仍由部署环境单独设置 `CMS_DATA_API_URL`，不要使用本地 `.env.local` 覆盖生产配置。
5. 文档不记录 `ADMIN_SESSION_SECRET` 等密钥值。

## 8. 回滚方式

如需恢复原来的完整 API 地址，将 `web/.env.local` 改为：

```env
CMS_DATA_API_URL=https://portal.gzjtjt.cn/_plugins/gw/curd
```

然后重启开发服务。地址归一化逻辑保持兼容，不需要回滚该代码；如需完全恢复，也可一并撤销 `web/lib/cms/api-store.js` 中的 `resolveDataApiUrl` 改动。
