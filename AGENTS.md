# AGENTS.md

## 项目背景

本项目为甘孜建设投资集团官方网站 CMS 支撑系统。

## 技术边界

- 前端为静态 HTML/CSS/JS，不使用 React、Vue、Next.js。
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
- 不允许引入前端构建工具，除非明确批准。
- 不允许破坏现有 HTML 页面结构和视觉设计。
- 当前项目为根目录 + `web/` 子工程结构；后续所有前端改造必须基于 `web/`，不得新建 `site/` 目录替代 `web/`。
- 官网前端现有页面位于 `web/pages/`，不得删除现有页面、不得重做 UI 或破坏既有 HTML 页面结构与视觉设计。
- CMS API 请求必须在 `web/` 内统一封装；优先基于 `web/services/cms-api/` 或后续约定的 `web/` 内前端 API 封装文件，不得继续使用历史 `site/` 路径。
- 前台只能读取已发布内容。
- 生产部署前必须备份数据库和 uploads。

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