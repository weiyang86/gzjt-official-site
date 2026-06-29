# ADMIN-01 极简新闻后台架构与路由设计

## 1. 任务边界与结论

本阶段只做架构设计、目录规划和接口方案，不实现完整后台功能，不改造官网前台页面，不修改前台 CSS、布局、动画或视觉效果。

结论：在现有 `web/` 静态官网工程内新增一个极简后台目录 `web/admin/`，使用原生 HTML/CSS/JS 编写后台页面；在现有 `web/server.js` 的 Node 静态服务方案上规划 `/admin-api/*` 后台接口；Directus 继续作为内容库、文件库和最终数据 API，不重做完整 CMS。

## 2. 为什么不让客户直接使用 Directus Studio

Directus Studio 功能完整，但对客户的“新闻上传和新闻管理”这个首期需求来说过重，直接暴露给普通内容人员会带来以下问题：

1. **界面复杂度高**：Directus Studio 包含 Data Model、Access Policies、Users、Files、Settings 等管理入口，普通新闻编辑人员只需要“登录、查看新闻、编辑新闻、上传图片、保存草稿、发布/归档”。
2. **误操作风险高**：客户如果误改集合字段、关系、权限或系统配置，可能影响官网前台读取数据。
3. **培训成本高**：Directus Studio 面向 Headless CMS 管理员和实施人员，而不是极简新闻录入场景。
4. **权限边界不直观**：虽然 Directus 可配置角色权限，但 Studio 中仍会出现较多与新闻管理无关的后台概念，容易造成理解成本。
5. **客户品牌体验不统一**：极简后台可以只保留项目需要的菜单、文案和操作路径，减少交付解释成本。

因此，首期面向客户提供极简新闻后台；Directus Studio 仍保留给技术管理员、实施人员和高级内容管理员使用。

## 3. 为什么仍然保留 Directus 作为内容库

极简后台不是替代 Directus，而是在 Directus 之上增加一层更简单的业务操作入口。保留 Directus 的原因：

1. **内容模型已围绕 Directus 设计**：当前内容模型优先支撑 `channels`、`articles`、`companies`、`pages`、`banners`、`business_sectors`、`site_settings`。
2. **文件库能力成熟**：新闻封面、正文图片和附件仍应进入 Directus Files，避免在官网工程中混放上传文件。
3. **权限和审计能力可复用**：Directus 的角色、权限、用户、文件、API、审计等能力可作为后台数据安全基础。
4. **前台公开读取规则清晰**：官网前台只读取 `published` / `enabled` 内容，Directus Public 权限和 BFF 过滤可双重保障。
5. **后续扩展成本低**：后续如果扩展栏目、轮播、单页、业务板块、下属公司等管理功能，可以继续复用同一 Directus 内容模型。

## 4. 后台目录规划

首期建议只新增 `web/admin/`，不新增 `site/`，不引入 React、Vue、Next 或前端构建工具。

```text
web/admin/
  ├── login.html              # 后台登录页
  ├── dashboard.html          # 后台首页/工作台
  ├── articles.html           # 新闻列表与筛选页
  ├── article-edit.html       # 新闻新增/编辑页
  ├── css/
  │   └── admin.css           # 后台独立样式，不影响官网前台
  └── js/
      ├── admin-api.js        # /admin-api/* 请求封装与登录态处理
      ├── login.js            # 登录页逻辑
      ├── articles.js         # 新闻列表页逻辑
      └── article-edit.js     # 新闻编辑页逻辑
```

约束：

- `web/admin/css/admin.css` 只服务后台页面，不引用或覆盖 `web/pages/assets/` 中的官网前台样式。
- 后台页面不复用前台页面 DOM 结构，不修改 `web/pages/` 现有页面。
- 后台 JS 统一通过 `web/admin/js/admin-api.js` 请求 `/admin-api/*`，不在页面脚本中分散直连 Directus。

## 5. 后台页面清单

| 页面 | 路径 | 首期用途 | 备注 |
| --- | --- | --- | --- |
| 登录页 | `/admin/login.html` | 输入账号密码，建立后台登录态 | 登录成功后跳转工作台或新闻列表 |
| 工作台 | `/admin/dashboard.html` | 显示当前用户、快捷入口、待办概览 | 首期可极简，只保留新闻管理入口 |
| 新闻列表 | `/admin/articles.html` | 按栏目、状态、关键词筛选新闻；进入新增/编辑 | 支持 draft、published、archived |
| 新闻编辑 | `/admin/article-edit.html` | 新增或编辑新闻标题、栏目、摘要、封面、正文、状态 | 支持保存草稿、发布、归档 |

## 6. 后台接口清单

后台接口由 `web/server.js` 规划承载，路径统一为 `/admin-api/*`。`server.js` 作为 BFF 层调用 Directus，不把 Directus 管理员 Token 暴露给浏览器。

| 方法 | 路径 | 用途 | Directus 对应能力 |
| --- | --- | --- | --- |
| `POST` | `/admin-api/login` | 后台登录，校验账号密码并写入 HttpOnly Cookie | Directus 登录或服务端自管会话 |
| `POST` | `/admin-api/logout` | 清除登录 Cookie / 服务端会话 | 服务端会话失效 |
| `GET` | `/admin-api/me` | 获取当前登录用户、角色和权限 | Directus 当前用户或会话信息 |
| `GET` | `/admin-api/channels` | 获取可选新闻栏目 | `channels`，过滤 `status=enabled` |
| `GET` | `/admin-api/articles` | 新闻列表查询 | `articles`，支持状态、栏目、关键词、分页 |
| `GET` | `/admin-api/articles/:id` | 获取单篇新闻详情 | `articles` 详情 |
| `POST` | `/admin-api/articles` | 创建新闻 | `articles` create |
| `PATCH` | `/admin-api/articles/:id` | 更新新闻、发布、归档 | `articles` update |
| `POST` | `/admin-api/files` | 上传封面图、正文图片或附件 | Directus Files upload |
| `GET` | `/admin-api/assets/:id` | 可选：代理读取文件资源 | Directus assets |

### 6.1 列表接口建议参数

`GET /admin-api/articles` 建议支持：

| 参数 | 说明 |
| --- | --- |
| `page` | 页码，默认 1 |
| `limit` | 每页条数，默认 10 或 20 |
| `status` | `draft` / `published` / `archived` / 空值全部 |
| `channel` | 栏目 ID 或 slug |
| `keyword` | 标题、摘要模糊搜索 |
| `date_from` / `date_to` | 发布时间范围 |

### 6.2 文章保存字段建议

首期新闻编辑只覆盖 `articles` 的核心字段：

- `title`
- `summary`
- `content`
- `cover`
- `main_channel`
- `source`
- `author`
- `publish_at`
- `status`
- `is_top`
- `is_home_recommend`
- `attachments`（可后置）

## 7. 登录态设计

### 7.1 推荐方案

推荐使用 `web/server.js` 作为后台 BFF：

1. 浏览器提交账号密码到 `POST /admin-api/login`。
2. `server.js` 使用该客户自己的 Directus 用户账号调用 Directus `/auth/login`，不使用固定 Super Admin Token 代替客户操作。
3. 登录成功后，`server.js` 将 Directus `access_token` 保存在服务端内存会话中，并向浏览器写入已签名的 `HttpOnly`、`SameSite=Lax`、生产环境 `Secure` 会话 Cookie。
4. 浏览器后续只携带 Cookie 请求 `/admin-api/*`，前端 JS 不能读取 Directus Token。
5. `server.js` 校验会话后再带当前用户 Token 调用 Directus，Directus 继续按该用户角色权限控制可操作集合和字段。
6. `POST /admin-api/logout` 清除 Cookie，并使服务端会话失效。

### 7.2 会话保存方式

第一阶段可选两种实现：

| 方案 | 说明 | 适用阶段 |
| --- | --- | --- |
| 内存会话 | ADMIN-02 采用的最小依赖方案：`server.js` 内存 Map 保存 session id 与 Directus token/用户信息，浏览器仅持有签名后的 `HttpOnly` Cookie | 本地开发和单实例演示 |
| 持久会话 | Redis、数据库或 Directus 用户 Token 机制 | 生产部署、多实例或更高安全要求 |

生产环境建议至少具备会话过期时间、登出失效、密码错误限频、HTTPS 和 Nginx 反向代理安全头配置。

### 7.3 ADMIN-02 已实现的环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DIRECTUS_URL` | `http://localhost:8055` | `server.js` 服务端访问 Directus 的地址。 |
| `ADMIN_SESSION_SECRET` | 本地开发默认值 | 用于签名后台会话 Cookie；生产环境必须设置强随机值，不能使用默认值。 |

ADMIN-02 不新增 cookie/session npm 依赖，采用 Node.js 内置 `crypto`、`http` 和服务端内存 `Map` 实现最小会话能力。该方案适合本地开发和单实例演示；生产环境如需多实例、重启后保持登录、集中注销和更强审计，应升级为 Redis 或数据库持久化会话。

## 8. 文件上传设计

文件上传不落到官网静态目录，不提交到 Git。

推荐流程：

1. `article-edit.html` 选择封面图、正文图片或附件。
2. `web/admin/js/admin-api.js` 使用 `FormData` 调用 `POST /admin-api/files`。
3. `server.js` 校验登录态、文件大小、MIME 类型和扩展名。
4. `server.js` 将文件转发到 Directus Files。
5. Directus 返回文件 ID。
6. 编辑器把文件 ID 写入 `articles.cover`、正文内容或 `attachments`。
7. 前台读取已发布文章时，通过公开资产 URL 或 BFF 资产接口渲染图片。

首期建议限制：

- ADMIN-05 已开放封面图上传：仅支持 `image/jpeg`、`image/png`、`image/webp`。
- 封面图单文件大小限制为 10MB；浏览器端和 `server.js` 都会校验。
- 上传成功后 `/admin-api/files` 返回 Directus file id，文章保存时写入 `articles.cover`。
- 预览图使用同源代理 `/admin-api/assets/<file-id>`，仍通过当前后台登录态访问 Directus Assets，不暴露 Directus Token。
- 附件类型：按客户确认后后续开放 PDF、Word、Excel 等。
- 不允许上传脚本、HTML、可执行文件或包含敏感信息的文件。

## 9. 权限边界

### 9.1 前台匿名权限

官网前台仍只读取公开内容：

- `articles.status = published`
- `channels.status = enabled`
- `companies.status = enabled`
- `business_sectors.status = enabled`
- `pages.status = published`
- `banners.status = published`
- `site_settings.enabled = true`

匿名用户不得创建、更新、删除任何内容，不得读取 Directus 系统集合。

### 9.2 后台登录用户权限

第一阶段建议后台只开放“新闻编辑员”能力：

| 能力 | 是否开放 | 说明 |
| --- | --- | --- |
| 登录后台 | 是 | 仅分配给客户新闻维护人员 |
| 查看新闻列表 | 是 | 可查看 draft、published、archived |
| 新增新闻 | 是 | 默认保存为 draft |
| 编辑新闻 | 是 | 可编辑自己或授权范围内新闻 |
| 发布新闻 | 可配置 | 如需审核，可只给审核发布员 |
| 归档新闻 | 可配置 | 防止误删除，首期不做物理删除 |
| 删除新闻 | 否 | 首期不开放；用 archived 替代 |
| 管理栏目 | 否 | 栏目由技术管理员或后续功能维护 |
| 管理用户权限 | 否 | 仍在 Directus Studio 或实施侧管理 |
| 修改数据模型 | 否 | 禁止普通客户账号进入 Data Model |

### 9.3 服务端权限原则

- 浏览器只访问 `/admin-api/*`，不持有 Directus 管理 Token。
- `/admin-api/*` 必须校验登录态和权限；后续 `/admin-api/articles`、`/admin-api/files` 必须复用 `requireAdminAuth`。
- 后台写接口只允许操作规划范围内集合和字段。
- 发布动作必须显式校验 `articles.status`，不得绕过权限直接写任意字段。
- 不在代码库提交 `.env`、账号密码、Token、客户隐私数据。

## 10. 第一阶段功能范围

ADMIN-01 后续实现阶段建议只做最小可用新闻后台：

1. 后台登录和退出。
2. 当前用户信息展示。
3. 新闻列表：分页、关键词、栏目、状态筛选。
4. 新闻新增和编辑。
5. 新闻状态：草稿、已发布、归档。
6. 新闻封面上传到 Directus Files。
7. 富文本正文先采用简单 `textarea` 或轻量原生方案，避免引入复杂构建链。
8. 所有后台接口经 `server.js` BFF 转发到 Directus。
9. 不修改官网前台页面样式、布局、CSS、动画。

不在第一阶段实现：

- 完整用户、角色、权限管理界面。
- Directus 数据模型管理。
- 多级审核流。
- 复杂富文本编辑器深度定制。
- 栏目、轮播、单页、业务板块、下属公司完整管理。
- 站内消息、操作审计可视化、统计报表。

## 11. 后续可扩展功能

后续可在不改变前台视觉的前提下逐步扩展：

1. 栏目管理：维护 `channels` 的名称、slug、排序和启停。
2. 轮播管理：维护首页 `banners`。
3. 单页管理：维护 `pages`，例如集团概况、联系我们。
4. 业务板块管理：维护 `business_sectors`。
5. 下属公司管理：维护 `companies`。
6. 审核流：编辑员提交、审核员发布。
7. 操作日志：记录文章创建、编辑、发布、归档。
8. 明道云单点登录：预留登录页和 `/admin-api/login` 的认证适配层。
9. 附件管理：文章附件上传、排序、删除。
10. 图片裁剪与压缩：上传前或服务端处理图片尺寸。

## 12. 与现有工程的关系

- `web/server.js`：继续作为本地静态服务入口，后续可增加 `/admin-api/*` BFF 路由。
- `web/package.json`：不新增前端构建工具；继续使用 `node server.js` 启动站点。
- `web/pages/`：官网前台页面目录，ADMIN-01 不修改其样式、布局和动画。
- `web/services/cms-api/`：已有 CMS API 子工程，可作为后续服务端能力参考；本极简后台优先保持在 `web/` 内统一封装后台请求。
- Directus：继续承载内容库、文件库和权限基础。

## 13. 明确不修改官网前台样式

本方案明确禁止以下行为：

- 不修改 `web/pages/` 现有 HTML 结构以适配后台。
- 不修改官网前台 CSS、动画、布局和视觉设计。
- 不删除现有官网页面。
- 不新建 `site/` 替代 `web/`。
- 不引入 React、Vue、Next 或其他前端构建工具。

后台样式必须限定在 `web/admin/css/admin.css`，后台脚本必须限定在 `web/admin/js/`，确保与官网前台资源隔离。

## 14. 后续开发顺序建议

1. 已在 ADMIN-03 创建 `web/admin/` 登录页、工作台页面、后台独立样式和基础 JS。
2. 已在 ADMIN-02 于 `web/server.js` 增加 `/admin-api/login`、`/admin-api/logout`、`/admin-api/me` 和 `requireAdminAuth`。
3. 已在 ADMIN-02 接入 Directus `/auth/login` 与服务端内存会话，并完成 `HttpOnly` Cookie 基础配置。
4. 已在 ADMIN-04 增加 `/admin-api/channels`、`/admin-api/articles` 列表/详情/新增/编辑接口，并把工作台中的新闻管理/新增新闻入口接到真实页面。
5. 已在 ADMIN-04 增加文章保存草稿、发布、转草稿和归档接口；不做物理删除。
6. 已在 ADMIN-05 增加 `/admin-api/files` 上传代理到 Directus Files，并在文章编辑页写入 `articles.cover`。
7. 已在 ADMIN-06 复用 `channels` 增加新闻分类管理页面和 `/admin-api/categories*` 接口；停用分类只设置 `status=disabled`、`visible=false`，不删除数据。
8. 做本地联调和权限验收：匿名前台只能读 published，后台登录后才能写。
9. 部署前备份数据库和 uploads，并确认 Nginx HTTPS、Cookie、上传大小限制。

## 15. 风险点与控制措施

| 风险 | 影响 | 控制措施 |
| --- | --- | --- |
| Directus 管理 Token 暴露到浏览器 | 可被越权写入内容 | Token 仅保存在 `server.js` 服务端会话或环境变量中 |
| 普通客户误改 Directus 数据模型 | 影响前台读取 | 客户日常只使用极简后台；Studio 仅给技术管理员 |
| 前台读取到草稿 | 未发布内容泄露 | 前台接口和 Directus Public 权限双重过滤 `published` |
| 上传恶意文件 | 安全风险 | 服务端校验 MIME、扩展名、大小，不允许脚本文件 |
| 单实例内存会话重启失效 | 用户需重新登录 | 首期可接受；生产后续接持久会话 |
| 富文本内容破坏页面样式 | 前台展示异常 | 正文渲染区域做样式隔离和内容清洗，首期谨慎开放 HTML |

## 16. 回滚方式

ADMIN-06 新增新闻分类管理页面、`/admin-api/categories*` 接口，并在 Directus bootstrap 中幂等补齐 `channels` 分类字段；无前台样式变化。回滚方式：

```bash
git revert <ADMIN-01文档提交>
```

如果后续实现阶段继续扩展 `web/admin/` 或 `/admin-api/*`，可按提交粒度回滚对应文件；生产环境回滚前仍需先备份数据库和 uploads。

## 17. ADMIN-06 新闻分类管理

ADMIN-06 不新建独立 `news_categories` 表，继续复用 Directus `channels` 集合，并通过 `is_news_category=true` 区分新闻分类。

后台新增：

- `/admin/categories.html`：新闻分类列表、新增、编辑、启用、停用。
- `/admin-api/categories`：分类列表与新增。
- `/admin-api/categories/:id`：分类详情与编辑。
- `/admin-api/categories/:id/enable` / `/disable`：启用或停用分类。
- `/admin-api/categories/:id/usage`：统计该分类下关联文章数量，用于停用前提示。

停用逻辑：

- 不做物理删除。
- 停用时写入 `status=disabled`、`visible=false`。
- 新增/编辑新闻的栏目下拉只读取启用且 `is_news_category=true` 的 `channels`。
- 已有关联新闻不改 `main_channel`，已发布新闻仍保留原分类关系。

当前简单后台暂不开放父级分类编辑；`channels.parent` 由 Directus 模型预留，后续如需多级分类再开放。
