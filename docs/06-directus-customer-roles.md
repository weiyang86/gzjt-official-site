# Directus 客户角色、权限与后台交付建议

## 1. 结论

本阶段建议直接交付 Directus Studio 作为客户 CMS 后台，不建议现在重新开发独立后台。原因：

- 当前内容模型已围绕官网栏目、文章、公司、业务板块、单页、轮播和站点配置设计完成。
- Directus Studio 已提供内容录入、文件上传、角色权限、发布状态管理等后台能力。
- 独立后台会增加前后端开发、权限、审计、维护和培训成本，不符合本阶段快速交付目标。

后续只有在客户明确提出高度定制流程、复杂审批、国产化 UI 或统一门户深度集成时，才评估独立后台或二次开发。

## 2. 客户可用角色设计

| 角色 | 定位 | 是否给客户使用 | 说明 |
| --- | --- | --- | --- |
| 系统管理员 | 技术管理员 / 交付方管理员 | 谨慎给少数技术负责人 | 管理模型、角色、权限、备份、系统设置 |
| 集团内容管理员 | 集团日常内容运营 | 是 | 维护大部分业务内容，但不管理系统集合和权限 |
| 审核发布员 | 内容审核与发布 | 是 | 审核草稿、发布/归档内容、管理首页推荐 |
| 下属公司通讯员 | 下属公司供稿 | 是 | 创建和维护本公司相关草稿，不直接发布 |
| 只读查看员 | 审阅和检查 | 是 | 只能查看内容，不能修改 |
| Public | 官网匿名访问 | 系统匿名角色 | 前台只读 published/enabled 内容 |

## 3. 集合权限矩阵

### 3.1 业务集合

| 集合 | 系统管理员 | 集团内容管理员 | 审核发布员 | 下属公司通讯员 | 只读查看员 | Public |
| --- | --- | --- | --- | --- | --- | --- |
| `channels` | 全部 | 读 | 读 | 读 | 读 | 读 enabled |
| `articles` | 全部 | 创建/编辑/读，建议默认草稿 | 读/编辑/发布/归档 | 创建/编辑本人或本公司草稿 | 读 | 读 published |
| `companies` | 全部 | 创建/编辑/读 | 读 | 读本公司 | 读 | 读 enabled |
| `business_sectors` | 全部 | 创建/编辑/读 | 读 | 读 | 读 | 读 enabled |
| `pages` | 全部 | 创建/编辑/读，建议发布需审核 | 读/编辑/发布/归档 | 无或只读 | 读 | 读 published |
| `banners` | 全部 | 创建/编辑/读，建议发布需审核 | 读/编辑/发布/归档 | 无 | 读 | 读 published |
| `site_settings` | 全部 | 读，必要时编辑非敏感展示字段 | 读 | 无 | 读 | 读公开展示字段 |
| `directus_files` | 全部 | 上传/读公开业务附件 | 上传/读公开业务附件 | 上传/读本人或本公司附件 | 读 | 读公开资产 |

### 3.2 普通客户账号禁止开放的集合

以下集合不能给客户普通账号开放管理权限：

- `directus_users`
- `directus_roles`
- `directus_policies`
- `directus_permissions`
- `directus_access`
- `directus_sessions`
- `directus_activity`
- `directus_revisions`
- `directus_webhooks`
- `directus_flows`
- `directus_operations`
- `directus_settings`
- `directus_collections`
- `directus_fields`
- `directus_relations`

如客户需要新增用户、重置密码、调整角色，应由系统管理员或技术管理员操作。

## 4. 角色详细权限边界

### 4.1 系统管理员

- 仅限交付方技术管理员或客户指定的少数技术负责人。
- 可管理 Data Model、User Roles、Access Policies、系统配置、备份恢复和用户账号。
- 负责生产部署前数据库和 uploads 备份。
- 不建议用于日常内容录入，避免误改模型或权限。

### 4.2 集团内容管理员

- 可维护集团级内容：`articles`、`companies`、`business_sectors`、`pages`、`banners`、`directus_files`。
- 可创建和编辑文章，但建议默认保存为 `draft`，由审核发布员发布。
- 可维护公司和业务板块基础信息。
- 不可管理 Directus 系统集合、角色、权限、模型结构和系统设置。

### 4.3 审核发布员

- 重点负责内容发布质量控制。
- 可读取和编辑 `articles`、`pages`、`banners`。
- 可将内容状态改为 `published` 或 `archived`。
- 可设置 `is_top`、`is_home_recommend`、首页轮播状态和排序。
- 不可管理系统集合、角色、权限、模型结构。

### 4.4 下属公司通讯员

- 用于下属公司供稿人员。
- 可创建文章草稿，建议限制 `status=draft`。
- 可读取 `channels`、本公司 `companies` 信息、`business_sectors`、本人或本公司相关文章。
- 不可发布内容，不可管理首页轮播，不可修改站点配置。
- 如 Directus 权限无法精确限制“本公司”，交付时应以人工流程约束并由审核发布员最终发布。

### 4.5 只读查看员

- 可登录后台查看内容，适合领导审阅、内部检查。
- 只读 `channels`、`articles`、`companies`、`business_sectors`、`pages`、`banners`、`site_settings`。
- 不可创建、修改、删除或发布。

### 4.6 Public

- 官网匿名访问角色。
- 只能读取 `published` / `enabled` 内容。
- 不能读取草稿、归档、用户、角色、权限、操作日志和系统配置。
- 不能创建、更新、删除任何集合数据。

## 5. 客户后台交付建议

1. 交付 Directus Studio 地址、管理员使用说明和内容维护说明。
2. 首批只创建必要客户账号，不批量创建无负责人账号。
3. 客户账号必须使用客户真实邮箱创建，但不要在代码仓库提交账号、密码或截图中的敏感信息。
4. 初始密码应通过线下安全渠道交付，并要求首次登录后修改。
5. 为客户提供角色说明：谁能编辑、谁能发布、谁只能查看。
6. 内容发布流程建议为“通讯员/内容管理员提交草稿 → 审核发布员审核 → 发布”。
7. 生产部署前必须备份数据库和 uploads。

## 6. 技术管理员保留操作

以下操作建议保留给技术管理员，不交给普通客户账号：

- 修改 Data Model、字段、关系、集合名称。
- 修改 User Roles、Access Policies、Public 权限。
- 新增或删除系统管理员账号。
- 启用 Webhooks、Flows、Operations。
- 修改 `directus_settings`、文件存储、CORS、环境变量。
- 数据库备份、恢复和 uploads 迁移。
- 生产部署、Docker Compose、Nginx、服务器安全配置。

## 7. 脚本自动化与人工确认

`bootstrap-directus.mjs` 会尽量通过 Directus REST API 创建客户角色，并尝试写入角色权限。由于 Directus 12 的 Access Policies / User Roles API 可能随小版本变化：

- 角色创建失败不会影响内容模型和测试数据初始化。
- 权限写入失败时，应进入 Directus Studio 手工确认。
- 手工确认位置通常为 **User Roles** 或 **Access Policies**。
- 手工确认时必须坚持最小权限，不要给普通角色开放系统集合。

## 8. 本地验证建议

1. 运行 `scripts/directus/bootstrap-directus.mjs`。
2. 登录 Directus Studio。
3. 打开 **User Roles** 或 **Access Policies**。
4. 确认角色已存在或按本文档手工创建。
5. 新建测试用户并绑定对应角色。
6. 用测试用户登录，检查是否只能看到被授权集合。
7. 尝试发布、编辑、删除等动作，确认权限边界符合预期。
