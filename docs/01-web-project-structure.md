# web/ 工程结构说明

## 当前项目结构判断

本仓库当前采用“根目录 + `web/` 子工程”结构：

- 根目录负责保存仓库级说明、项目规则、`.gitignore` 与 `docs/` 文档。
- `web/` 是现有官网前端工程，不是临时目录，也不能用新的 `site/` 目录替代。
- 后续官网页面、样式、脚本与 CMS 接入改造均应在 `web/` 目录内演进。

## web/ 主要目录与文件

```text
web/
├── package.json                 # web 子工程脚本入口
├── package-lock.json             # web 子工程依赖锁定文件
├── server.js                     # 本地静态页面开发服务器
├── README-CMS.md                 # CMS API / 后台相关说明
├── pages/                        # 官网静态页面与页面资源
│   ├── about/index.html          # 集团概况入口
│   ├── business/index.html       # 业务板块入口
│   ├── contact/index.html        # 联系我们入口
│   ├── news/index.html           # 新闻中心入口
│   ├── party/index.html          # 党群工作入口
│   ├── projects/index.html       # 项目相关入口
│   ├── responsibility/index.html # 社会责任入口
│   ├── org/*/index.html          # 下属公司页面入口
│   ├── detail/*.html             # 详情页模板
│   └── assets/                   # 页面 CSS / JS / 静态数据
├── packages/shared/              # 共享包预留
└── services/cms-api/             # CMS API 服务子工程
```

## 页面入口说明

当前官网前端为静态 HTML / CSS / JavaScript 页面，入口主要分布在 `web/pages/`：

- 首页：`web/A版官网首页.html`（由 `server.js` 在访问 `/` 时映射；如果文件暂未纳入仓库，需保持服务器映射逻辑并在补齐页面时复用该入口）。
- 栏目页：`web/pages/about/`、`web/pages/news/`、`web/pages/business/`、`web/pages/party/`、`web/pages/responsibility/`、`web/pages/contact/`。
- 下属公司页：`web/pages/org/` 下各公司目录。
- 详情页：`web/pages/detail/` 下的文章、新闻、项目详情模板。
- 通用列表 / 占位页面：`web/pages/_list/`、`web/pages/_hero-list/`、`web/pages/_placeholder/`。

后续调整页面时，应优先复用这些入口和现有资源，不得删除现有页面或重做 UI。

## server.js 作用

`web/server.js` 是本地静态页面开发服务器，使用 Node.js 原生 `http`、`fs`、`path` 模块实现，不引入前端框架或构建工具。它主要负责：

1. 将 `/` 映射到 `A版官网首页.html`。
2. 为 `/group`、`/news-center`、`/business-dev`、`/party-masses`、`/social-responsibility`、`/contact-us` 等历史或语义化路径提供 302 跳转。
3. 为部分旧路径提供兼容跳转，例如 `/subsidiaries/:id/news` 到 `/subsidiaries/:id/dynamics`。
4. 按静态资源扩展名返回正确的 `Content-Type`。
5. 对未知栏目路径按顺序尝试 `web/pages/<path>/index.html`、通用列表页和占位页。

## services/cms-api 作用

`web/services/cms-api/` 是 CMS API 服务子工程，当前包含 NestJS / Prisma 相关代码、认证模块、后台管理模块、公开内容读取模块、存储模块以及数据库 schema / seed 脚本。它的定位是：

- 为官网前台提供已发布内容读取接口。
- 为 CMS 后台或后续 Directus 接入保留服务封装基础。
- 统一处理与 PostgreSQL、文件存储、认证鉴权、内容状态相关的服务端逻辑。

后续接入 Directus 时，应保持“前台只读取已发布内容”的边界，并避免在静态页面中分散书写 CMS 直连逻辑。
