# 官网全站 UI 优化交付记录

> 后续首页增量见 [左侧交互栏与工程背景优化](HOMEPAGE-ATMOSPHERE-20261114.md)。本文保留 `408bb7c` 的全站验收检查点；新首页截图与实际限制以增量记录为准。

日期：2026-11-14。分支：`codex/feature-ui-optimization-20261113`。源码最终检查点：`408bb7ceae641326d8219127e434054c4d0642e4`。本记录同批提交只更新文档，官网源码与全部最终浏览器证据保持一致。

全站前台共享 UI、响应式适配及本轮验收修复已完成整合和协调者自验；**附有构建、独立复核及内容资源限制，不是生产发布或全站无条件通过结论**。范围覆盖全部现有前台路由类型和发现的已发布 URL；后台管理、鉴权、CMS 模型与数据库保持原边界。

## 预览与提交

入口：<http://localhost:3000/>；首页：<http://localhost:3000/home>。可从首页导航继续进入全部栏目；内页示例：<http://localhost:3000/about>、<http://localhost:3000/news>、<http://localhost:3000/projects>、<http://localhost:3000/contact-us>。

3000 仍由当前工作区 `web/` 的 Next 开发服务提供，Orca 终端 `term_26b69314-33ba-47f8-ba9c-30bafad3d667`，监听 PID 64577。没有切换工作区、抢占端口或修改其他项目。

| 本地提交 | 内容 |
| --- | --- |
| `ca4c9cf` | 入口和首页的桌面/手机响应式优化。 |
| `b7e777e` | 将统一 UI 基线应用到全部前台模板。 |
| `a71aeee` | 全站一级导航间距、角标留白、两行布局和下拉边界。 |
| `408bb7c` | 详情封面、下拉键盘状态、浮动控件、表单反馈、锚点及相关推荐错误隔离。 |

原交接检查点 `9761fde` 保留；没有 push、部署或生产发布。

## 修改文件与行为

以下是相对交接检查点的全部 19 个官网源码文件。没有新增业务模块；新增的是响应式样式、键盘/无障碍反馈、兼容锚点和装饰封面失败展示。

| 文件 | 作用 |
| --- | --- |
| `web/app/page.tsx`、`web/public/legacy-static/entrance-ui.css` | 保留入口文案与进入首页功能，改善桌面/手机排版与短横屏。 |
| `web/app/home/page.tsx`、`web/app/homepage/HomepageExperience.tsx`、`web/public/legacy-static/home-ui.css` | 首页五个已启用分屏、轮播、内容滚动、手机/平板/横屏与减少动效。 |
| `web/public/legacy-static/ui-foundation.css`、`web/public/legacy-static/site-ui.css`、`web/public/legacy-static/navigation-ui.css` | 统一尺寸变量、内页阅读/卡片/表单/页脚、栅格与导航间距。一级链接左右 padding 8px、标题至角标 gap 10px；≥1680px 单行，1321–1679px 两行，≤1320px 抽屉。 |
| `web/public/legacy-static/pages/assets/global-ui.css`、同目录 `global-ui.js`、`app.js` | 共享样式加载、真实页头/面包屑高度、装饰封面回退、抽屉焦点与浮动工具键盘操作。 |
| `web/app/components/MobileNavToggle.tsx`、`web/app/news/NavigationActiveState.tsx`、`web/app/news/components.tsx` | 共享导航/抽屉和样式入口、aria-expanded/inert 同步、Escape 关闭与焦点返回。 |
| `web/app/site-pages.tsx`、`web/app/contact/message-section.tsx`、`web/lib/messages/shared.ts` | 原链接的 #content/#form 兼容目标，表单错误关联及焦点；原字符串校验接口、提示、规则和请求行为保留。 |
| `web/app/news/[id]/page.tsx`、`web/app/party/training/[id]/page.tsx` | 显式标记正文外封面；新闻相关推荐失败时保留已取得的已发布正文。 |

文档同步包括原交接、入口/首页结果、全站接续、导航记录、修复记录和本文。23 份受跟踪旧静态 HTML（含参考归档）均与 `ca4c9cf` 字节一致，没有改写或删除。全部正文图片、编辑器内联尺寸/对齐、栏目顺序、链接、URL、接口、CMS 数据及发布/权限边界保留。

## 同一源码的实际验收

最终证据目录：`outputs/site-ui-optimization-20261114/final-coordinator/`，汇总 `summary.json`、文件保护 `integrity-after.json`。本轮该目录共 481 张 PNG；每个页面/尺寸均有首屏截图，并滚过主要 section 触发懒加载和 reveal，代表页另存中部/底部；不能将所有页面都描述为逐页人工目视验收。人工打开查看的 12 张代表截图记录在 `manual-visual-review.json`。

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| 全部 66 URL × PC/手机 | 132/132 组；无采集失败或浏览器 404。 | `pc-phone.json` |
| 31 类模板 × 平板/横屏 | 62/62 组，768×1024、844×390。 | `tablet-landscape.json` |
| 3 个旧 URL 带参数 × PC/手机 | 6/6 组；保留列表查询、文章重定向及项目兼容页。 | `legacy-query.json` |
| 补充查询/兼容/320px 小屏 | 39/39 组，补齐原清单中其余所有已知组合，包括七类 catch-all 与旧模板。 | `supplemental-final.json` |
| 上述 239 组页面几何 | 页面级溢出 0、Logo/导航二维重叠 0。 | 对应逐页 metrics、`geometry-summary.json` |
| 4 页面 × 11 导航宽度 | 44/44 组；无溢出或 Logo/导航/操作重叠。1920px 菜单 gap 13.44px，角标 gap 10px。 | `navigation-recheck.json` |
| 桌面/手机菜单 | 原生悬停与键盘进入子项；Escape 隐藏、expanded=false、焦点返回一级链接。抽屉焦点循环及关闭返回通过。 | `interactions.json`、`navigation-recheck.json` |
| 首页/入口 | 五个启用分屏在四尺寸逐屏及底部检查；轮播第 1→2 张手动切换，等待后到第 3 张；入口等待过渡后实际到 /home；PageDown→news、End→contact、Home→hero。 | `home-interactions.json`、`repaired-controls.json` |
| 触控和减少动效 | coarse pointer 与减少动效检查通过；合成 TouchEvent 从 hero→news，明确 isTrusted=false。 | `home-interactions.json`、`interactions.json` |
| 新闻/搜索/项目 | 下一页实际到 page=2、首条改变；栏目筛选；“建设”搜索显示 49 条；项目类型 5 条、再选康定市 2 条；地图点实际进入详情。 | `interactions.json` |
| 浮动工具 | 电话/二维码焦点可见、Escape 关闭；返回顶部用键盘 Enter 后 scrollY=0。 | `repaired-controls.json` |
| 表单 | PC/390/320 空值与空查询仅本地校验；1440/390 最终字段 invalid、describedby、role=alert 和焦点正确，业务请求为 0。 | `interactions.json`、`repaired-controls.json` |
| 锚点 | 4 个真实 CTA × PC/横屏 8 组，标题避开固定区域；#form 别名补验通过。 | 上层目录 `native-anchor-check.json`、`shared-regression.json` |
| 原详情封面缺陷 | 22 个 URL（含旧文章链接）× PC/手机 44/44 恢复，正文替换 0。 | `cover-closure.json` |
| 内容完整性 | 66/66 主体文字、链接与顺序和原基线一致。整页初次 64/66 一致；有界复查后 65/66，一份原基线本身为降级导航。 | `content-compare.json`、`content-recheck.json` |
| 校验与文章错误路径 | 29 组校验差分一致；4 个文章错误隔离检查通过，正常行为不变，无真实业务请求。 | 上层目录 `validation-contract.json`、`article-error-isolation.json` |
| 源码/语法 | `git diff --check`、两份 JS 的 `node --check` 通过，Next 开发页面实际编译并可浏览；修复源码哈希全程一致。 | `integrity-after.json` |

代表截图：[首页桌面](../outputs/site-ui-optimization-20261114/final-coordinator/final-home-1440.png)、[首页手机](../outputs/site-ui-optimization-20261114/final-coordinator/final-home-390.png)、[新闻手机](../outputs/site-ui-optimization-20261114/final-coordinator/screenshots/f46b16ed5a4e-408bb7c-390x844-top.png)、[项目桌面](../outputs/site-ui-optimization-20261114/final-coordinator/screenshots/902ceeb21a5f-408bb7c-1440x1000-top.png)。

证据边界：旧脚本中入口点击后立即取样仍看到 `/`，最终按真实过渡完成条件等待后才确认到 `/home`；两条整页差异复查复用了原输出 HTML 文件名，原始比较结果保留，但初次原始 HTML 未保留，已在 JSON 记录，不拿复查 HTML 充作初次失败响应。早期 hash 导航后才改视口的锚点观测也不充作最终点击证据。

## Orca 实际状态和剩余问题

原 Run `run_df9467d252c7` 保留，没有新 Run。原 Worker C 的 Task `task_692040555863` 成功交付审查，指出问题，产品不是当时通过。通过原 Dispatch 续接时，Orca 自动建立 follow-up Task `task_8740a683364c` / Dispatch `ctx_e960e855ece1`，启动前因 `agent-update-prompt` 失败；没有进入工作或继承权限的成功证据。已按准确回执释放其专属终端，任务保留 failed，不伪造 worker_done 或独立验收成功。当前无活跃 Worker，最终复验由协调者完成。

- **完整生产构建和全量类型检查仍阻塞**：此前两轮卡在依赖声明/数据文件读取；按用户上限不做第三轮、不升级依赖。开发预览通过不能替代生产构建通过。
- **DATA-01 尚未全面关闭**：已隔离相关推荐失败路径；本轮 4 个原异常地址 × 3 次 GET 均 200，但另一次整页比对观察到备案链接降级、一次复查恢复。主数据/导航/页脚读取的间歇问题仍存在风险，未改数据源、接口或权限。
- **内容资源限制**：部分原 CMS 正文图片、二维码返回 404；组织架构原图未发布，下载记录缺可用文件。没有伪造媒体、下载成功或把正文换成工程图。固定宽编辑器图片在正文内横向滚动并保留原尺寸，页面本身不溢出。
- **独立复核未完成**：最终结果是协调者自验；新 Worker 启动被 CLI 更新提示阻塞，没有自动更新 CLI 或绕过权限。
- 未执行物理触屏、VoiceOver 实际听读或真实业务写入；旧脚本原有 localhost:7777 调试 POST 不能误称留言提交。

后续只需处理上述构建/读取稳定性和已发布资源条件，独立审查恢复后针对现有提交复核；不重复开发入口、首页或整套导航。

## 配置、保护和回滚

无数据库结构、CMS 数据写入、认证权限或部署配置变化；未修改 `.env`、依赖/锁文件、Next/Nginx 配置、`allowedDevOrigins`，没有推送、部署或发布生产。

唯一原有未提交文件 `web/next-env.d.ts` 原样保留，SHA-256 为 `7ad303e40d4fddf44f156129e397511953a71481c5cfd86b1862649aaaf240cc`，没有纳入任何本轮提交。输出证据被 Git 忽略，需在本机保留。

回滚时先 `git revert <本文同批文档提交号>`（可用 `git log -1 --oneline -- docs/UI-OPTIMIZATION-20261114-DELIVERY.md` 查询），再 `git revert 408bb7c` 回到导航优化检查点；若回退整阶段，再依次 revert `a71aeee`、`b7e777e`、`ca4c9cf`。按逆序处理文档可避免修改后删除的冲突；不 reset/clean，不触碰原生成文件差异，无数据库或服务器回滚步骤。
