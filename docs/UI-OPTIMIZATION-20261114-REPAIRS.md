# 全站 UI 验收修复记录

日期：2026-11-14。整合分支 `codex/feature-ui-optimization-20261113`；基线 `a71aeee`。沿用 Run `run_df9467d252c7` 及原只读 Worker C，不新建 Run、不重复开发既有页面。

## 接续验收与本轮范围

原 Worker C 已完成基线的全站验收，发现 2 项 P1、5 项 P2；其任务成功指交付审查报告，产品结论为 **需修复**。报告：`outputs/site-ui-optimization-20261113/worker-c/report.md`、`issues.json`、`summary.json`。覆盖 66 个 URL 的 PC/手机 132 组；31 类模板的平板/横屏 62 组；44 组导航；共保存 1259 张截图。没有观察到页面级横向溢出或页头二维重叠。上述数量属于 a71aeee，不代表本轮修复后的复验数量。

本轮公共文件高度耦合，由协调者单一写入。保留原栏目、文字、顺序、路由、链接、接口、校验规则和 CMS 发布权限。只读 Worker 后续只写报告与截图，不写源码或 Git 索引。

## 修复与文件

| 问题 | 修改文件 | 结果 |
| --- | --- | --- |
| UI-01 详情装饰封面破图 | `web/app/news/[id]/page.tsx`、`web/app/party/training/[id]/page.tsx`、`web/public/legacy-static/pages/assets/app.js` | 显式标记正文外封面，复用已有本站工程图回退；额外禁止处理 `.body` 内图片，不改正文媒体或 CMS 原始 URL。 |
| A11Y-01 下拉状态及 Escape | `web/app/news/NavigationActiveState.tsx`、`web/public/legacy-static/pages/assets/app.js`、`web/public/legacy-static/navigation-ui.css` | 鼠标/焦点与 aria-expanded 同步；关闭面板 inert；Escape 收起、返回一级链接，方向键重新展开并进入首个子项。覆盖服务器导航与旧模板动态导航。 |
| A11Y-02 浮动工具键盘访问 | `web/public/legacy-static/pages/assets/global-ui.js`、同目录 `global-ui.css` | 返回顶部使用 button，电话/二维码有独立按钮、控制关联及展开状态；焦点可查看信息，Escape 关闭。未添加原先没有的首页工具条。 |
| A11Y-03 表单错误反馈 | `web/app/contact/message-section.tsx`、`web/lib/messages/shared.ts` | 错误 role=alert、字段 aria-invalid/aria-describedby、定位首个错误字段；原字符串校验接口保留，全部规则与提示不变，不改提交或查询请求。 |
| UI-02 联系锚点缺失 | `web/app/site-pages.tsx`、`web/app/contact/message-section.tsx` | 为原有 #content、旧浮动留言链接 #form 增加零高兼容目标；保留原链接。 |
| UI-03 锚点标题遮挡 | `web/public/legacy-static/site-ui.css`、`web/public/legacy-static/pages/assets/global-ui.js` | 根据实际页头和面包屑高度设 scroll-margin；ResizeObserver 在尺寸改变后更新。 |
| DATA-01 部分缓解 | `web/app/news/[id]/page.tsx` | 已读取到已发布文章后，相关推荐请求失败不再丢弃正文。主读取链路偶发失败的根因仍未确认，不以此宣称所有数据异常已修复。 |

本记录及两份既有说明文档同步更新；未修改旧静态 HTML、依赖、锁文件、Next 配置或环境文件。

## 协调者实际检查

预览继续使用当前工作区 `web/` 的 3000 服务：<http://localhost:3000/home>，入口 <http://localhost:3000/>。未抢占其他端口、未停止其他项目服务。

- `git diff --check`、两份修改脚本的 `node --check` 通过；Next 开发服务已实际编译并打开新闻、培训、联系等受影响页面。
- 29 组新旧校验差分：规则、顺序、提示完全一致，5 个字段的错误映射正确。证据 `outputs/site-ui-optimization-20261114/validation-contract.json`。
- 桌面原生 focus/ArrowDown/Escape/hover：展开状态、inert、焦点返回与重新展开均符合预期；电话/二维码焦点展开、Escape 关闭。证据 `coordinator-recheck.json`。其中早期“直接带 hash 导航后才改视口”的锚点观测受随后 resize 影响，明确标注为非最终证据；最终使用下项实际点击检查。
- “联系信息、了解集团、浏览资讯、查看项目地图”各在 1440×1000、844×390 实际点击，共 8 组：锚点存在，标题不被固定区遮挡。目标 top 约 191/155px，正文标题 top 更低。证据 `native-anchor-check.json` 及对应截图。
- 联系页桌面/390px 空留言与空查询：焦点返回错误字段，role/关联/invalid 正确；资源记录无 `/api/public/cms/messages` 请求。没有实际提交留言或客户信息。
- 代表新闻的装饰封面已成功回退，正文内回退数为 0；培训、入口、首页及兼容模板另做共享回归，结果见 `shared-regression.json`。
- 原异常 4 个地址分别只读 GET 3 次，共 12 次均为 200，导航各 60 个链接、正文非 404。证据 `public-read-check.json`。这只是有界观测，不证明间歇故障永久消除。

本轮独立复核尚待原 Worker 回报，不能据协调者自测宣布全站无条件验收完成。

## 保留问题与限制

- 完整生产构建和全量类型检查此前已连续两轮卡在依赖声明/数据文件读取；按用户的两轮上限不无限重试、不升级依赖。它们仍为阻塞，不能报告通过。开发预览可运行不等于生产构建已通过。
- DATA-01 的主读取/导航降级间歇故障未确认根因。此次仅隔离可明确定位的相关推荐失败路径，未改数据源或权限。
- 既有 CMS 正文图片和二维码资源存在 404，未伪造内容或替换正文图片；组织图原图未发布，现有下载缺可用文件，不具备真实下载成功验收条件。
- 为保留编辑器原排版，部分固定宽正文图片仍在正文容器内横向滚动，未撑破页面。
- 浏览器移动仿真与原生键盘/AX 检查不替代物理触屏或 VoiceOver 实际听读。

## 数据、配置、保护与回滚

无数据库结构、CMS 写入、后台权限或部署配置变化。不 push、不部署、不发布生产。没有修改 `.env`、锁文件、`allowedDevOrigins` 或 Nginx。

既有 `web/next-env.d.ts` 未提交差异原样保留，不纳入本轮提交；SHA-256 仍为 `7ad303e40d4fddf44f156129e397511953a71481c5cfd86b1862649aaaf240cc`。

本批次回滚使用 `git revert <本记录同批提交号>`，保留此前 ca4c9cf/b7e777e/a71aeee。不执行 reset/clean；无数据库或服务器回滚步骤。截图和机器证据位于 Git 忽略的 `outputs/site-ui-optimization-20261114/`，交付时需与报告一同保留。
