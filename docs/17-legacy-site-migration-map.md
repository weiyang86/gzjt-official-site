# 旧官网内容迁移映射

## 1. MIGRATE-FIX-01 范围

本轮只迁移旧官网 `https://www.gzzjct.cn/` 在 2026 年 6 月份以内的新闻和公告预览数据，默认只生成 preview JSON，不直接写入 Directus。

时间范围：

- `--date-from=2026-06-01`
- `--date-to=2026-06-30`

详情页日期优先于列表页日期。日期无法识别、早于 `date-from` 或晚于 `date-to` 的内容不会进入 `items`，而是写入 `skipped` 或 `errors`。

## 2. 栏目映射

| 旧站栏目 | 旧站 URL | Directus channel slug | 备注 |
| --- | --- | --- | --- |
| 集团要闻 | `https://www.gzzjct.cn/category/22.html` | `group-news` | 集团新闻类文章。 |
| 通知公告 | `https://www.gzzjct.cn/category/7.html` | `announcements` | 通知、公示、公告类。 |
| 招投标公示 | `https://www.gzzjct.cn/category/62.html` | `bid-announcement` | 招投标类公告，需确认 Directus 中已存在该栏目。 |

## 3. 输出字段映射

| Preview 字段 | Directus 文章字段 / 用途 |
| --- | --- |
| `legacy_id` | 旧站 `/view/<id>.html` 中的 id，用于人工追踪。 |
| `channel_slug` | 查询 Directus `channels.slug` 后写入 `articles.main_channel`。 |
| `title` | `articles.title`。 |
| `summary` | `articles.summary`。 |
| `content_html` | `articles.content`。 |
| `content_text` | 人工复核和摘要兜底。 |
| `author` | `articles.author`。 |
| `publish_at` | `articles.publish_at`。 |
| `external_source_url` | `articles.source_file`，用于去重。 |
| `cover_image_url` | `articles.cover_url`；如不使用 `--skip-images`，尝试上传后写入 `articles.cover`。 |
| `images` | 正文图片清单，第一阶段仅做记录。 |
| `status` | 导入时由 `--status` 控制，默认 `draft`。 |
| `skipped_reason` | 有值时不导入。 |
| `uncertain` | 正文提取可能不稳定，需要人工复核。 |

## 4. 不影响范围

- 不修改 `web/pages/` 官网前台页面。
- 不修改前台 CSS、布局或动画。
- 不影响后台新闻管理功能。
- 不删除 Directus 既有文章。
