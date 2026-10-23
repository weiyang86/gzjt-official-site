# AGENTS.md

## 项目背景

本项目为甘孜建设投资集团官方网站 CMS 支撑系统。

## 技术边界

- 前端允许使用 Next.js + TypeScript 重构。
- Next.js 项目必须仍然位于 `web/` 内，不得新建 `site/` 替代。
- 迁移期间必须保留旧静态页面作为参考和回滚来源。
- 迁移目标是保持现有官网视觉、结构、URL 兼容，不做 UI 重设计。
- CMS 后台采用 Directus Headless CMS。
- 数据库使用 PostgreSQL。
- 本地开发使用 Mac + Docker + Trae。
- 生产部署使用 Linux + 宝塔 + Docker Compose + Nginx。
- GitHub 为 Codex Web 主开发仓库。
- Codeup 为交付镜像仓库或服务器部署仓库。
- 后续需要预留明道云单点登录。

## 开发规则

- 不允许直接修改 main 分支。
- 每个任务必须新建 feature 或 fix 分支。
- 不允许提交 .env、密码、密钥、真实客户隐私数据。
- 允许为 Next.js + TypeScript 迁移引入必要的前端构建工具和类型检查工具。
- Next.js 迁移必须保持现有官网视觉、信息架构和 URL 兼容；迁移期间不得重做 UI。
- 当前项目为根目录 + `web/` 子工程结构；后续所有前端改造必须基于 `web/`，不得新建 `site/` 目录替代 `web/`。
- 官网前端旧静态页面需归档保留作为迁移参考和回滚来源；不得删除现有页面、不得重做 UI 或破坏既有 HTML 页面结构与视觉设计。
- CMS API 请求必须在 `web/` 内统一封装；优先基于 `web/services/cms-api/` 或后续约定的 `web/` 内前端 API 封装文件，不得继续使用历史 `site/` 路径。
- 前台只能读取已发布内容。
- 生产部署前必须备份数据库和 uploads。

## 测试环境推送限制（gwdev）

测试环境目录为服务器 `/www/wwwroot/gwdev`，通过 `gwdev.gzjtjt.cn` 访问。向测试环境同步代码时，必须先比较本地与服务器配置；不得用整目录覆盖方式覆盖下列测试环境专属配置：

- `web/.env.local` ↔ 服务器 `/www/wwwroot/gwdev/.env.local`：两端内容不同。服务器配置用于测试环境，API 地址按服务器现有值（当前约定为 `localhost:8000`）保留；禁止用本地 `.env.local`（本地开发 API 使用 `8008`）覆盖，也禁止提交或传输其中的密钥、密码等值。
- `web/package-lock.json` ↔ 服务器 `/www/wwwroot/gwdev/package-lock.json`：两端内容不同。默认不覆盖服务器锁文件；只有依赖确有变更并完成差异审查后，才可同步更新。
- 服务器 `/www/server/panel/vhost/nginx/gwdev.gzjtjt.cn.conf`：测试域名专属 Nginx 配置，仓库中没有对应文件。代码推送不得覆盖、删除或重写该文件；需要变更代理配置时单独检查并验证。
- 服务器备份文件 `/www/wwwroot/gwdev/.env.local.backup-before-localhost-8000` 与 `/www/wwwroot/gwdev/next.config.ts.bak-codex-20261023`：仅作回滚备份，不得在同步中覆盖或删除。

同步时还必须遵守：

1. 保留 `web/next.config.ts` 中的 `allowedDevOrigins: ['gwdev.gzjtjt.cn']`。该设置已用于允许测试域名加载 Next.js 开发资源，删除后会导致测试页客户端交互失效。
2. 不同步 `node_modules`。当前本地和测试环境已安装的 Next.js/React 版本不同；如需升级测试环境依赖，先列明版本差异、影响和回滚方式，再单独处理。
3. 默认只同步本次修改且经过审核的源码文件。涉及 `.env.local`、`package-lock.json`、Next 配置或服务器 Nginx 配置时，先展示差异并取得用户确认，不得静默覆盖。
4. 推送后检查测试环境 `.env.local`、`package-lock.json`、`next.config.ts` 和 Nginx 配置仍符合上述要求，并验证客户端交互；不得把测试环境配置复制回本地或提交到 Git。

## 内容模型要求

必须优先支撑：

- 栏目 channels
- 文章 articles
- 下属公司 companies
- 单页 pages
- 首页轮播 banners
- 业务板块 business_sectors
- 站点配置 site_settings

文章 articles 必须支持：

- draft 草稿
- published 已发布
- archived 归档

## 每次任务完成后必须说明

- 修改了哪些文件
- 新增了哪些功能
- 如何本地验证
- 是否涉及数据库结构变化
- 是否涉及部署配置变化
- 回滚方式
