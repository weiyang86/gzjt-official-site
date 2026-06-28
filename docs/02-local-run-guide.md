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
