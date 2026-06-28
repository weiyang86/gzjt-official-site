# gzjt-official-site

甘孜建设投资集团有限公司官网项目。当前仓库已调整为“根目录 + `web/` 子工程”结构：根目录保存项目规则、文档与仓库级配置，现有官网前端与 CMS API 相关工程均位于 `web/` 下。

## 技术边界

- 前端：基于 `web/` 的静态 HTML / CSS / JavaScript，不使用 React、Vue、Next.js，不引入前端构建工具，除非明确批准。
- CMS：Directus Headless CMS（后续接入时应通过统一服务或 API 封装，不在页面中分散直连）。
- 数据库：PostgreSQL。
- 部署：Linux + Docker Compose + 宝塔 + Nginx。
- 代码协作：GitHub + Codex Web。
- 交付镜像：Codeup。

## 当前目录结构

- `web/`：现有官网前端子工程，包含静态页面、前端本地开发服务器、CMS API 服务与共享包；后续所有前端改造必须基于该目录进行。
- `web/pages/`：官网页面入口与页面资源，现有页面不得删除或重做 UI。
- `web/server.js`：本地静态页面开发服务器，负责首页、栏目别名与通用列表/占位页面路由映射。
- `web/services/cms-api/`：CMS API 服务子工程，作为后续 Directus / PostgreSQL / 前台读取已发布内容的服务封装基础。
- `docs/`：项目文档，包括工程结构说明与本地运行指南。

> 历史文档中如出现 `site/` 目录规划，应以当前 `web/` 子工程为准；不要新建 `site/` 替代 `web/`。

## 快速开始

```bash
cd web
npm install
npm run dev:site
```

默认访问地址：<http://localhost:3010>。

更多说明见：

- [web 工程结构说明](docs/01-web-project-structure.md)
- [本地运行指南](docs/02-local-run-guide.md)
- [CMS 说明](web/README-CMS.md)
