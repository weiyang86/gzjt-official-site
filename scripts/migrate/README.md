# 旧官网内容迁移脚本

本目录用于从旧官网 `https://www.gzzjct.cn/` 抓取新闻/公告预览 JSON，并在人工确认后导入 Directus `articles`。脚本只处理迁移数据，不修改官网前台页面、前台 CSS 或后台新闻管理功能。

## 1. 默认栏目映射

| 旧站栏目 | 旧站地址 | Directus channel slug |
| --- | --- | --- |
| 集团要闻 | `https://www.gzzjct.cn/category/22.html` | `group-news` |
| 通知公告 | `https://www.gzzjct.cn/category/7.html` | `announcements` |
| 招投标公示 | `https://www.gzzjct.cn/category/62.html` | `bid-announcement` |

详情页 URL 形如 `/view/949.html`，脚本会提取其中的数字作为 `legacy_id`。

## 2. 只抓取 2026 年 6 月份数据

MIGRATE-FIX-01 默认只抓取 `2026-06-01 00:00:00` 至 `2026-06-30 23:59:59` 之间的数据。日期优先级：详情页日期优先；如果详情页无法识别，则使用列表页日期；仍无法识别则写入 `skipped`，不会进入 `items`。

### 2.1 抓取预览命令

```bash
node scripts/migrate/legacy-site-crawler.mjs \
  --date-from=2026-06-01 \
  --date-to=2026-06-30 \
  --channels=group-news,announcements,bid-announcement \
  --max-pages=5 \
  --stop-when-before-date \
  --output=scripts/migrate/output/legacy-articles-2026-06-preview.json
```

输出：`scripts/migrate/output/legacy-articles-2026-06-preview.json`。

输出 JSON 包含：

- `meta`：来源、日期范围、栏目、最大页数等；
- `items`：日期在 2026 年 6 月范围内、可导入的文章；
- `skipped`：日期超出范围、无法识别日期或详情解析失败的文章；
- `errors`：列表页或详情页抓取异常。

每条记录保留 `legacy_id`、`channel_slug`、`title`、`summary`、`content_html`、`content_text`、`author`、`publish_at`、`external_source_url`、`cover_image_url`、`images`、`status`、`skipped_reason`、`uncertain`。

### 2.2 查看 JSON

```bash
node -e "const f=require('./scripts/migrate/output/legacy-articles-2026-06-preview.json'); console.log({items:f.items.length, skipped:f.skipped.length, errors:f.errors.length});"
```

也可以手动打开 JSON，重点确认：

1. `publish_at` 是否都在 2026 年 6 月；
2. `channel_slug` 是否为 `group-news`、`announcements`、`bid-announcement`；
3. `uncertain=true` 的正文是否需要人工复核；
4. `skipped` 中是否存在应导入但日期识别失败的内容。

### 2.3 dry-run

默认不加 `--commit` 时只生成导入报告，不写入 Directus。

```bash
node scripts/migrate/import-legacy-articles.mjs \
  --input=scripts/migrate/output/legacy-articles-2026-06-preview.json \
  --status=draft \
  --skip-images \
  --force-update=false
```

报告输出：`scripts/migrate/output/legacy-import-2026-06-report.json`。

### 2.4 commit 导入

确认 preview JSON 后，再加载 Directus 管理账号环境变量并执行 commit 导入。

```bash
export DIRECTUS_URL=http://localhost:8055
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD='your-password'
node scripts/migrate/import-legacy-articles.mjs \
  --input=scripts/migrate/output/legacy-articles-2026-06-preview.json \
  --status=draft \
  --commit \
  --skip-images \
  --force-update=false
```

默认导入为 `draft`，不会删除 Directus 既有文章。脚本根据 `source_file = external_source_url` 查重；如已存在且 `--force-update=false`，会跳过该文章。

如需尝试下载封面图，去掉 `--skip-images`。图片下载或上传失败时，文章仍会导入，失败信息写入报告 `warnings`。

### 2.5 验证后台

1. 启动 Directus 与 `web/server.js`；
2. 登录 `/admin/login.html`；
3. 进入 `/admin/articles.html`；
4. 按栏目 `group-news`、`announcements`、`bid-announcement` 和状态 `draft` 筛选；
5. 抽查标题、发布时间、正文、来源链接和封面图。

## 3. 常见问题

- **没有 items**：检查旧站列表页是否需要更换分页参数，或确认 2026 年 6 月是否有数据。
- **skipped 很多**：查看 `skipped_reason`，常见原因是 `publish_at_unrecognized`、`publish_at_before_range`、`publish_at_after_range`。
- **errors 不为空**：一般是网络、旧站响应异常或详情页结构变化；脚本会继续处理后续文章。
- **导入时报 channel_not_found**：先在 Directus `channels` 中创建对应 slug，尤其是 `bid-announcement`。
- **重复文章被跳过**：默认通过 `source_file = external_source_url` 去重；如确需覆盖，设置 `--force-update=true`。

## 4. 扩大日期范围

例如导入 2026 年全年：

```bash
node scripts/migrate/legacy-site-crawler.mjs \
  --date-from=2026-01-01 \
  --date-to=2026-12-31 \
  --channels=group-news,announcements,bid-announcement \
  --max-pages=20 \
  --stop-when-before-date \
  --output=scripts/migrate/output/legacy-articles-2026-preview.json
```

扩大范围前建议先只生成 preview JSON，经人工确认后再执行导入。

## 5. MIGRATE-FIX-02：排查 items=0

### 5.1 抓取 2026 年 6 月份数据

建议先开启 `--debug` 观察每个栏目、列表页、列表项、详情页日期和过滤结果：

```bash
node scripts/migrate/legacy-site-crawler.mjs \
  --channels=group-news,announcements,bid-announcement \
  --date-from=2026-06-01 \
  --date-to=2026-06-30 \
  --max-pages=5 \
  --stop-when-before-date \
  --debug \
  --output=scripts/migrate/output/legacy-articles-2026-06-preview.json
```

### 5.2 如果 items=0 如何排查

```bash
node - <<'NODE'
const f = require('./scripts/migrate/output/legacy-articles-2026-06-preview.json');

console.log('items:', f.items?.length || 0);
console.log('skipped:', f.skipped?.length || 0);
console.log('errors:', f.errors?.length || 0);

const reasons = {};
for (const x of f.skipped || []) {
  const r = x.skipped_reason || x.reason || 'unknown';
  reasons[r] = (reasons[r] || 0) + 1;
}
console.log(reasons);

console.log((f.skipped || []).slice(0, 10));
NODE
```

重点查看：

- `skipped_reason=invalid-date`：说明列表页和详情页都没有解析到有效日期；
- `skipped_reason=before-range` / `after-range`：说明解析到了日期，但不在本次范围内；
- `warnings` 包含 `date-mismatch`：说明列表页日期和详情页日期不一致，脚本以详情页日期为准；
- `errors` 不为空：一般是网络、旧站响应异常或页面结构变化，单条失败不会中断整体流程。

### 5.3 如何使用 debug

`--debug` 会输出以下关键信息，不输出正文 HTML：

1. 当前栏目名称、channel slug 和 category URL；
2. 当前抓取页 URL；
3. 每页解析出的列表项数量；
4. 每条列表项的标题、详情 URL、legacy_id 和列表日期；
5. 详情页解析出的详情日期、最终 `publish_at` 和过滤状态；
6. `stop-when-before-date` 是否触发以及触发原因。

### 5.4 日期过滤说明

`--date-from=2026-06-01` 和 `--date-to=2026-06-30` 都包含边界日期：

- 起始边界为 `2026-06-01 00:00:00`；
- 结束边界为 `2026-06-30 23:59:59`；
- 因此 2026-06-01 和 2026-06-30 当天内容都应进入 `items`；
- 日期解析优先使用详情页标题下方发布时间区域，详情页解析不到时再使用列表页日期，避免被页脚、推荐列表、上一篇/下一篇日期误覆盖。

### 5.5 日期解析自检

```bash
node scripts/migrate/debug-legacy-date-parser.mjs
node scripts/migrate/debug-legacy-date-parser.mjs "甘孜建设投资集团召开会议 2026-06-09"
```
