# 全站导航间距优化

接续分支 `codex/feature-ui-optimization-20261113`，基于 `b7e777e`。用户指出一级菜单间距太小、下拉角标太靠近文字。本次只调整共享导航 UI，不改栏目、顺序、文字、链接、API、CMS 数据或权限。

## 修改与原因

- 新增 `web/public/legacy-static/navigation-ui.css`：一级菜单间隔统一为 `clamp(10px, .7vw, 18px)`，链接左右各留 8px，标题与角标间隔 10px。角标改为正常 flex 布局，避免后置 padding 覆盖原来的绝对定位预留空间。
- 同文件统一角标展开方向、活动下划线和下拉框位置；靠右的下拉框向左展开，避免越过视口。键盘 focus-within 立即展开，连续按 Tab 可以进入二级链接。
- ≥1680px 保持单行导航；1321–1679px 将 Logo/操作与完整导航分成两行，页头高度约 116px；≤1320px 延续已有抽屉方案。首页、内页、旧静态兼容页使用同一规则。
- `web/public/legacy-static/pages/assets/global-ui.css` 增加上述样式的统一引入。原静态 HTML 和共享主题文件未改写。

## 验证

预览：<http://localhost:3000/about>、<http://localhost:3000/home>。

在 `/about`、`/home`、`/news`、旧 `/pages/_list/index.html` 上分别检查 1920、1680、1679、1440、1366、1321、1320、1100、768、390、844px，共 44 组，未发现页面/菜单横向溢出，也没有与 Logo、右侧按钮重叠。实际 computed style 在 1920px 为菜单间隔 13.44px、左右 padding 8px、角标 gap 10px；1440px 菜单间隔 10.08px。

手机抽屉打开焦点在关闭按钮；Shift+Tab 到最后的“联系我们”，Tab 返回关闭按钮；Escape 关闭并返回菜单按钮，关闭状态 inert=true。最终键盘补验中“集团概况/业务领域/党建群团”均立即展开，Tab 分别进入“集团简介/产业布局/聚焦党代会”。

悬停批次共 32 项，其中 30 项捕获到展开状态且面板在视口内；`/about` 1440px 的“业务领域/党建群团”两项未稳定捕获鼠标展开，追加自动化复核未解决，已记录并交现有只读 Worker C 独立复核，不能记为全部悬停通过。其键盘展开与面板边界补验通过。未为消除测试异常隐藏菜单或改变链接。

2026-11-14 独立复核结果：原 Worker C 在 `a71aeee` 对上述两项使用 Orca 原生 hover，均得到 `:hover=true`、`opacity=1`、`visibility=visible`，移动进入二级面板后仍保持展开，关闭此前的悬停不确定项。证据为 `outputs/site-ui-optimization-20261113/worker-c/hover-anchor-probes.json`，原失败观测保留。该验收另发现 aria-expanded 与可见状态不一致、Escape 不关闭的问题，后续修复见 [全站验收修复记录](UI-OPTIMIZATION-20261114-REPAIRS.md)。

`git diff --check` 通过，`/home`、`/about` 均返回 200。此轮没有重试此前已记录为阻塞的完整类型检查/生产构建，也不将其报告为通过。

本地证据（Git 忽略的输出目录）：

- [1920px 导航](../outputs/navigation-ui-20261113/about-1920.png)
- [1440px 首页导航](../outputs/navigation-ui-20261113/home-1440.png)
- [手机菜单](../outputs/navigation-ui-20261113/phone-drawer.png)
- [机器可读检查结果](../outputs/navigation-ui-20261113/audit.json)，保留原批次结果及最终键盘补验、源码哈希，不覆盖失败记录。

## 影响与回滚

无新增业务功能、数据库结构或部署配置变化；不改 `.env`、依赖、锁文件、Next/Nginx 配置。既有 `web/next-env.d.ts` 的未提交生成差异原样保留，不提交。不 push、不部署。

回滚本批次提交：`git revert <本记录同批提交号>`，刷新 3000 页面即可，无需数据库或服务器回滚。全站验收继续由原 Run `run_df9467d252c7` 的 Worker C（Dispatch `ctx_03642b5fae3b`）负责；这份记录只代表此次导航优化范围。
