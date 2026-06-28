# 本地运行指南

## 环境要求

- Node.js：建议使用当前 LTS 版本。
- npm：随 Node.js 安装。
- Docker / Docker Compose：仅在启动 CMS API 依赖的数据库、对象存储或 Directus 相关服务时需要。

## 安装依赖

在仓库根目录进入 `web/` 子工程后安装依赖：

```bash
cd web
npm install
```

> 注意：当前有效的 `package.json` 位于 `web/package.json`，不要在根目录新建前端工程，也不要新增 `site/` 目录替代 `web/`。

## 启动官网前端

```bash
cd web
npm run dev:site
```

该命令会执行 `node server.js`，默认监听端口 `3010`。

访问地址：

- 首页：<http://localhost:3010/>
- 集团概况：<http://localhost:3010/pages/about/index.html>
- 新闻中心：<http://localhost:3010/pages/news/index.html>
- 业务板块：<http://localhost:3010/pages/business/index.html>
- 党群工作：<http://localhost:3010/pages/party/index.html>
- 社会责任：<http://localhost:3010/pages/responsibility/index.html>
- 联系我们：<http://localhost:3010/pages/contact/index.html>

也可以访问兼容路径，例如：

- <http://localhost:3010/group>
- <http://localhost:3010/news-center>
- <http://localhost:3010/business-dev>

## 自定义端口

```bash
cd web
PORT=3020 npm run dev:site
```

访问地址会变为 <http://localhost:3020/>。

## 启动 CMS API（后续接入时使用）

CMS API 位于 `web/services/cms-api/`。如需本地调试 API：

```bash
cd web
npm run dev:api
```

如需执行 API 子工程自己的脚本，可使用：

```bash
cd web
npm --prefix services/cms-api run <script-name>
```

具体数据库、迁移、种子数据和 CMS 后台说明以 `web/README-CMS.md` 及后续 Directus 接入文档为准。

## 本地验证建议

1. 执行 `cd web && npm install` 确认依赖可安装。
2. 执行 `cd web && npm run dev:site` 启动静态页面服务。
3. 浏览器访问 `http://localhost:3010/` 与主要栏目页。
4. 访问 `/group`、`/news-center` 等兼容路径，确认能跳转到 `web/pages/` 下对应页面。

## 启动 Directus 本地 Docker 环境

Directus 本地开发环境位于仓库根目录，不放入 `web/` 内部，避免破坏现有官网前端工程。根目录的 `docker-compose.directus.yml` 会启动：

- `directus-db`：PostgreSQL，仅供 Docker 内部网络访问，不向宿主机暴露数据库端口。
- `directus`：Directus，本地端口固定为 `8055`。
- 持久化目录：`.data/directus/database/`、`.data/directus/uploads/`、`.data/directus/extensions/`。

### 1) 复制本地环境变量

```bash
cp .env.directus.example .env.directus
```

`.env.directus` 只保存在本地，不要提交到 Git。首次启动前请至少修改：

- `POSTGRES_PASSWORD`
- `DIRECTUS_KEY`
- `DIRECTUS_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

### 2) 生成 DIRECTUS_KEY 和 DIRECTUS_SECRET

可用 OpenSSL 生成随机值：

```bash
openssl rand -hex 32
openssl rand -base64 48
```

将生成结果分别写入 `.env.directus` 的 `DIRECTUS_KEY` 和 `DIRECTUS_SECRET`。两者必须是稳定值；同一套本地数据目录反复启动时不要频繁更换。

### 3) 启动 Directus

```bash
docker compose --env-file .env.directus -f docker-compose.directus.yml up -d
```

启动后 Directus 后台地址：

- <http://localhost:8055/admin>

登录账号使用 `.env.directus` 中的 `ADMIN_EMAIL` 与 `ADMIN_PASSWORD`。

### 4) 查看日志

查看全部服务日志：

```bash
docker compose --env-file .env.directus -f docker-compose.directus.yml logs -f
```

只查看 Directus 日志：

```bash
docker compose --env-file .env.directus -f docker-compose.directus.yml logs -f directus
```

只查看 PostgreSQL 日志：

```bash
docker compose --env-file .env.directus -f docker-compose.directus.yml logs -f directus-db
```

### 5) 健康检查与后台验证

容器状态检查：

```bash
docker compose --env-file .env.directus -f docker-compose.directus.yml ps
```

Directus 健康检查：

```bash
curl http://localhost:8055/server/health
```

浏览器验证：

1. 打开 <http://localhost:8055/admin>。
2. 使用 `.env.directus` 中的管理员账号登录。
3. 确认可以进入 Directus 管理后台。

### 6) 停止服务

```bash
docker compose --env-file .env.directus -f docker-compose.directus.yml down
```

该命令会停止并移除容器与网络，但保留 `.data/directus/` 下的数据。

### 7) 清理本地数据

如需彻底重置本地 Directus 与 PostgreSQL 数据：

```bash
docker compose --env-file .env.directus -f docker-compose.directus.yml down
rm -rf .data/directus
```

执行清理前请确认没有需要保留的本地数据；`.data/` 已被 `.gitignore` 排除，不会提交到仓库。
