# 极简后台使用说明

## 1. 访问后台

本项目后台为现有 `web/` 服务内的静态 HTML/CSS/JS 页面，不使用 React、Vue、Next，也不替代 Directus Studio。

- 登录页：`/admin/login.html`
- 工作台：`/admin/dashboard.html`
- 新闻管理：`/admin/articles.html`
- 页面内容管理：`/admin/content.html`

请使用 Directus 内容账号登录。浏览器只访问 `/admin-api/*`，Directus Token 保存在 `server.js` 的后台会话中，不会写入前端代码。

## 2. 页面内容管理入口

进入“页面内容管理”后，后台左侧会按官网一级目录展示菜单，例如“集团概况、新闻中心、业务板块、下属公司、党建群团、项目建设、社会责任、信息公开、联系我们”。点击一级目录后可看到二级页面。

当前 ADMIN-10R 已落地“集团概况”下三个核心表单：

1. 企业简介 `group-intro`
2. 发展历程时间轴 `group-history`
3. 组织架构图 `org-chart`

未开放编辑的模块仍显示“正在开发中”。

## 3. 企业简介表单

路径：页面内容管理 → 集团概况 → 企业简介。

可维护字段：

- 页面标题
- 副标题
- 企业简介封面图
- 摘要
- 企业简介正文
- 发布状态

保存后写入：

- `page_contents.module_code = group-intro`
- 封面图文件 ID 写入 `page_contents.cover`
- 正文写入 `page_contents.content`

## 4. 发展历程时间轴表单

路径：页面内容管理 → 集团概况 → 发展历程时间轴。

页面基础信息写入 `page_contents.module_code = group-history`，包括：

- 页面标题
- 页面说明
- 补充说明
- 发布状态

时间轴条目写入 `page_content_items`，固定：

- `module_code = group-history`
- `item_type = timeline`

条目字段包括：

- 年份或时间 `date_label`
- 标题 `title`
- 内容 `content`
- 排序 `sort`
- 状态 `enabled / disabled`

后台支持新增条目、编辑条目、停用条目；不做物理删除。

## 5. 组织架构图表单

路径：页面内容管理 → 集团概况 → 组织架构图。

可维护字段：

- 页面标题
- 组织架构图图片上传
- 组织架构说明文字
- 发布状态

保存后写入：

- `page_contents.module_code = org-chart`
- 图片文件 ID 写入 `page_contents.cover`
- 说明文字写入 `page_contents.content`

## 6. 图片上传说明

页面内容管理中的企业简介封面图和组织架构图图片复用已有 `/admin-api/files` 上传接口。

- 浏览器上传到 `/admin-api/files`；
- `server.js` 使用当前登录用户的 Directus access token 转发到 Directus Files；
- 浏览器不会拿到 Directus Token；
- 支持 JPG、PNG、WEBP；
- 前端提示单文件不超过 10MB；
- 上传成功后通过 `/admin-api/assets/<file-id>` 预览。

## 7. 常见问题

- 未登录或登录过期：自动跳转 `/admin/login.html`。
- Directus 不可用：页面会显示后台接口返回的错误提示，请先确认 Directus 服务和 `DIRECTUS_URL`。
- 保存失败：请确认当前 Directus 用户具备 `page_contents` 和 `page_content_items` 的读写权限，以及 Directus Files 上传权限。
- 前台没有变化：本阶段只改后台表单和 Directus 数据，不替换官网前台静态页面。
