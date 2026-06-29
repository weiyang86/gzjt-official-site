# ADMIN-08R 页面内容管理模型重构

## 1. 目标和边界

ADMIN-08R 将“页面内容管理”从单纯占位清单升级为可逐步落地的后台菜单和内容模型：

- `page_modules` 是后台菜单和模块定义表，定义后台一级目录、二级页面、内容表单类型和是否开放编辑。
- `page_contents` 保存单页类、图文类、联系方式类页面主体内容。
- `page_content_items` 保存时间轴、领导列表、组织节点、图片链接等重复项。
- 当前不替换官网前台页面，不修改 `web/pages/`，不修改前台 CSS、布局、动画或现有路由。
- 后续按模块逐个把前台页面接入 Directus 动态读取，接入前仍使用现有静态页面。

## 2. 集合职责

### `page_modules`

`page_modules` 是后台菜单和模块定义表，不直接保存大段正文。它决定后台左侧/顶部如何展示一级目录和二级页面，以及点击二级页面后应该展示哪类维护表单。

| 字段 | 说明 |
| --- | --- |
| `parent_title` / `parent_code` | 一级目录名称和编码，例如“集团概况” / `group-overview`。 |
| `module_title` / `module_code` | 二级页面名称和编码，例如“企业简介” / `group-intro`。 |
| `route_path` | 对应现有前端路径。 |
| `content_type` | 表单类型：`single_page`、`timeline`、`image_text`、`org_chart`、`leader_list`、`article_list`、`company_list`、`sector_list`、`contact_info`、`static_placeholder`。 |
| `admin_enabled` | 是否第一阶段开放后台编辑。 |
| `placeholder_text` | 未开放时展示给客户的提示，默认“正在开发中”。 |
| `sort` | 排序。 |
| `status` | `enabled` / `disabled`。 |
| `remark` | 内部备注。 |

### `page_contents`

`page_contents` 保存每个二级页面的主体内容，适合企业简介、组织架构说明、社会责任、联系方式等单条内容。

| 字段 | 说明 |
| --- | --- |
| `module_code` | 对应 `page_modules.module_code`。 |
| `title` / `subtitle` | 页面标题和副标题。 |
| `cover` | 关联 Directus Files，可用于组织架构图、头图等。 |
| `summary` | 摘要。 |
| `content` | 富文本正文。 |
| `extra_json` | 扩展配置，例如联系方式来源、图片配置、前端接入参数。 |
| `status` | `draft` / `published` / `archived`。 |

### `page_content_items`

`page_content_items` 保存一个页面模块下的重复项，适合发展历程时间轴、领导列表、组织节点、图片链接、荣誉等。

| 字段 | 说明 |
| --- | --- |
| `module_code` | 所属模块编码。 |
| `item_type` | `timeline` / `leader` / `org_node` / `link` / `image`。 |
| `title` / `subtitle` | 条目标题和副标题。 |
| `date_label` | 时间轴年份、日期或阶段文案。 |
| `image` | 关联 Directus Files。 |
| `content` | 富文本说明。 |
| `link_url` | 可选跳转链接。 |
| `sort` | 排序。 |
| `status` | `enabled` / `disabled`。 |
| `extra_json` | 扩展字段。 |

## 3. 第一阶段开放编辑的模块

| 一级目录 | 二级页面 | content_type |
| --- | --- | --- |
| 集团概况 | 企业简介 | `single_page` |
| 集团概况 | 发展历程时间轴 | `timeline` |
| 集团概况 | 组织架构图 | `org_chart` |
| 新闻中心 | 集团新闻、行业要闻、媒体聚焦 | `article_list` |
| 业务板块 | 项目建设、经营管理 | `sector_list` |
| 下属公司 | 公司列表、公司简介、公司动态 | `company_list` / `article_list` |
| 党建群团 | 党建动态 | `article_list` |
| 项目建设 | 项目动态、安全环保、科技创新 | `article_list` |
| 社会责任 | 社会责任 | `single_page` |
| 信息公开 | 人才招聘、公示公告 | `article_list` |
| 联系我们 | 电话、邮箱、地址 | `contact_info` |

这些模块在 `page_modules.admin_enabled=true`，后续后台可根据 `content_type` 打开相应维护表单。

## 4. 仍显示“正在开发中”的模块

| 一级目录 | 二级页面 | 原因 |
| --- | --- | --- |
| 集团概况 | 集团主要领导 | 领导列表表单后续开发。 |
| 业务板块 | 交旅融合、特许服务、新兴产业 | 板块详情表单后续分批接入。 |
| 党建群团 | 群团工作、工会工作、青年工作 | 暂使用占位，后续接入文章列表或专用表单。 |
| 社会责任 | 乡村振兴、志愿服务 | 暂使用占位，后续接入文章列表。 |
| 信息公开 | 集中招采采购平台 | 可能对接外部系统或静态链接，暂为 `static_placeholder`。 |

这些模块在 `page_modules.admin_enabled=false`，`placeholder_text=正在开发中`。

## 5. 初始化内容

bootstrap 会初始化：

- `group-intro`：企业简介主体内容。
- `org-chart`：组织架构图主体内容，`cover` 关联 Directus Files，允许后续上传图片。
- `social-responsibility`：社会责任主体内容。
- `phone`、`email`、`address`：联系方式主体内容，同时在 `extra_json` 中说明优先与 `site_settings.phone/email/address` 保持一致。
- `group-history`：初始化一条时间轴重复项示例，便于验证 `page_content_items`。

## 6. 与新闻管理的关系

- 新闻新增、编辑、发布、封面上传继续使用 `articles`、`channels` 和 Directus Files。
- `content_type=article_list` 的页面模块只定义后台入口和栏目归属，不替代现有新闻管理接口。
- 本次模型是增量扩展，不修改 `articles.cover`、`articles.status` 或新闻发布流程。

## 7. 前台接入计划

当前不影响前台。后续可按模块逐步接入：

1. 后台先根据 `page_modules.content_type` 实现表单。
2. 前台页面仍保持现有 HTML/CSS 结构，只把内容区域的数据来源替换为 Directus API。
3. 每次只接入一个模块，并保持前台只读取 `published` 或 `enabled` 内容。
4. 上线前备份数据库和 uploads，验证静态兜底内容仍可回退。

## 8. 验证命令

```bash
curl 'http://localhost:8055/items/page_modules?fields=id,parent_title,module_title,module_code,content_type,admin_enabled,placeholder_text,status,sort&sort=parent_code,sort&limit=50'
curl 'http://localhost:8055/items/page_contents?fields=id,module_code,title,status&limit=20'
curl 'http://localhost:8055/items/page_content_items?fields=id,module_code,item_type,title,status,sort&limit=20'
```
