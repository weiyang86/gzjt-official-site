# 官网入口页与首页 UI 优化记录

日期：2026-11-13。分支：`codex/feature-ui-optimization-20261113`。

本轮已形成可运行的本地 UI 预览并完成浏览器验收。**完整类型检查和生产构建未通过，仍有本地依赖读取停滞的阻塞，不能视为可部署版本。** 未 push、未部署，也没有推广到内页。

## 接续与实际编排

- 沿用交接检查点 `9761fde97a589461fba04406cb6b954d177da53d` 和原工作区，不切换分支。
- 沿用 Orca Run `run_df9467d252c7`。接续前后查询均无本项目 Worker、Task 记录；没有复用其他项目的 Run，也没有新建任务或 Worker。本轮由当前会话串行完成，公共基线由同一负责人修改。
- 3000 是原工作区 `web/` 的开发服务，PID 18713，Next.js 16.2.9；保留并复用，未抢占或重启它。
- 唯一接续前未提交项 `web/next-env.d.ts` 原样保留，未纳入本轮提交。SHA-256：`7ad303e40d4fddf44f156129e397511953a71481c5cfd86b1862649aaaf240cc`。接续前补丁保存在 `/tmp/gzjt-ui-next-env-before.patch`。
- 无运行中的开发 Worker。剩余工作是构建环境诊断与真实设备补充验收；首页确认后才进入内页阶段。

## 修改文件与结果

| 文件 | 修改 |
| --- | --- |
| `web/app/page.tsx` | 给原入口内容增加作用域容器，加载独立优化样式；继续读取原静态 HTML。 |
| `web/public/legacy-static/entrance-ui.css` | 完整 Logo、手机两行标题、横屏与小屏间距、背景遮罩、消除背景缩放溢出。 |
| `web/app/home/page.tsx` | 在既有样式之后加载公共基线及首页优化层。数据获取逻辑不变。 |
| `web/public/legacy-static/ui-foundation.css` | 两页公共尺寸变量、首页 Logo 与导航独立分区、1320px 以下完整抽屉菜单、焦点样式与菜单滚动。作用域限于两页。 |
| `web/app/components/MobileNavToggle.tsx` | 抽屉焦点循环、Escape 关闭、焦点返回、关闭后 inert、aria-controls 与点击链接关闭。该组件只用于 `/home`。 |
| `web/app/homepage/HomepageExperience.tsx` | 展示既有 CMS 主副标题；首条新闻使用已有封面（失败时保留底色）；二维码加载失败时显示占位；抽屉打开时阻止页面快捷键切屏。 |
| `web/public/legacy-static/home-ui.css` | 减轻首屏遮罩、新闻主次、按钮点击区域、屏内滚动、指标按实际数量均分、手机业务卡片与横屏布局、长文本换行。 |
| 本文 | 记录范围、验收证据、阻塞和回滚。 |

未删除或改写归档静态 HTML；入口页原有 template 内容仍在。所有原有栏目、顺序、路由、CMS API、发布筛选、权限及后台代码保持不变，没有新增业务功能。

## 本地预览与验证

- 入口：<http://localhost:3000/>
- 首页：<http://localhost:3000/home>
- 原有服务命令：在 `web/` 运行 `npm run dev:site -- --hostname 127.0.0.1 --port 3000`。当前服务已存在，无须重复启动。

最终源码通过 Next 开发编译；`git diff --check` 通过。所有截图和矩阵结果均来自最终同一组源码，`browser-audit.json` 保存了源码 SHA-256，验收结束后复核一致。

| 尺寸 | 模式 | 范围 |
| --- | --- | --- |
| 1440 × 1000 | 桌面 | 两页、首页全部五屏 |
| 1100 × 800 | 桌面临界宽度 | 两页、抽屉替代完整顶栏 |
| 768 × 1024 | 触屏平板模拟 | 两页、全部板块 |
| 1024 × 768 | 触屏平板横向模拟 | 两页、全部板块 |
| 390 × 844 | 手机竖屏模拟 | 两页、全部板块及抽屉 |
| 844 × 390 | 手机横屏模拟 | 两页、全部板块与滚动底部 |
| 320 × 568 | 小屏手机模拟 | 两页、全部板块与滚动底部 |

共 42 个页面/尺寸组合；62 张截图含屏内滚动底部、下拉菜单及抽屉。最终矩阵未发现横向溢出、标题/卡片横向越界或可见破图。需要纵向滚动的板块均检查了底部内容可达。

交互实际结果：

- 入口按钮点击后等待导航完成，确实到达 `/home`。
- 桌面一级菜单悬停显示下拉菜单，Tab 可进入“专题专栏”；顶栏与 Logo 不再重叠。
- 六张 Banner 的圆点点击与定时自动切换有效，原链接热区保留；检查时索引由 2 变为 3。
- 桌面滚轮从首屏进入新闻屏，End 到联系屏、Home 返回首屏。
- 手机抽屉打开后焦点在关闭按钮，Shift+Tab 循环到最后一个链接，Tab 返回关闭按钮；Escape 关闭并返回菜单按钮。
- 抽屉打开时 End 不切换背景分屏。
- 在触屏模拟环境发送合成 TouchEvent：竖向手势切屏；新闻尚有滚动空间时保持当前屏；到底后进入文化屏；横向文化手势不切屏。此项验证事件处理逻辑，不等同于物理手机实测。
- 减少动效模式通过 Orca 媒体模拟检查：匹配 reduce，页头动画 none，分屏及背景 transition-duration 均为 0s；检查后恢复 no-preference。
- 本轮交互检查控制台 error 列表为空；资源不可用情况另列下文。
- `/`、`/home`、`/index.html` 返回 200；旧 `/pages/news/index.html` 返回既有 307，跟随重定向验证新闻页。

内容完整性：优化前后 SSR HTML 的 **161 个链接地址、文本及顺序完全一致**；分屏顺序均为 hero → news → culture-topics → business → contact。当前内容数量：新闻 5、文化 5、专题 4、业务 6、指标 2、二维码配置 1、友链 5。没有修改数据来实现视觉效果。

证据保存在本地被 Git 忽略的 `outputs/ui-optimization-20261113/`，未把运行产物或截图混入源码提交：

- [首页桌面](../outputs/ui-optimization-20261113/home-desktop-0-hero.png) · [首页手机](../outputs/ui-optimization-20261113/home-phone-0-hero.png)
- [入口桌面](../outputs/ui-optimization-20261113/entrance-desktop.png) · [入口手机](../outputs/ui-optimization-20261113/entrance-phone.png)
- [矩阵结果](../outputs/ui-optimization-20261113/browser-audit.json) · [交互结果](../outputs/ui-optimization-20261113/interaction-audit.json) · [内容对比](../outputs/ui-optimization-20261113/content-integrity.json)

## 构建阻塞与剩余问题

1. 完整 `tsc` 两次均在依赖声明文件读取时长时间停滞，无通过结果；没有执行会删除运行中开发类型目录的 `npm run typecheck`。
2. 隔离副本中用 Node 24.21.0 和当前预览所用 Node 26.7.0 分别尝试 `next build --webpack`，均停在 “Creating an optimized production build”。受控终止本轮创建的进程，保留 3000 服务。采样显示其中一个构建子进程停在 `caniuse-lite/data/features/css-letter-spacing.js` 的 read 调用；根因未证实，不能归因于 UI，也不能宣称 UI 完整构建已通过。遵守两轮后停止重复修复的边界，未继续升级依赖或修改配置。
3. 构建目录位于 `/tmp/gzjt-ui-validation-20261113/web`、`/tmp/gzjt-ui-final-20261113/web`；没有复制 `.env`、数据目录或密钥，依赖复用本地软链接。构建副本早于最后的二维码占位和指标栅格修正，进一步说明它们不能作为最终版本构建通过的证据。日志和采样在上述 outputs 目录。
4. 当前 CMS 的新闻封面与公众平台二维码资源不可用；前台已提供不破坏内容的底色/文字占位，未改 CMS 数据、uploads 或接口。部分业务板块目前没有可用图片；按既有底色显示，没有杜撰素材。资源恢复后自动使用原配置。
5. 尚未完成物理 iPhone/Android、Safari 的实机检查；此次为 Orca Chromium 桌面和触屏模拟。没有进行后台写入、认证或数据库回归，本轮未修改这些边界。

下一步先诊断本地依赖读取停滞并完成最终版本完整类型检查/生产构建，再补充真实手机验收；保留“首页确认后再推广内页”的阶段边界。

## 数据库、部署与回滚

- 无数据库结构变化，无 CMS 数据写入。
- 无部署配置变化：`.env`、锁文件、Next 配置、Nginx 配置均未修改；`allowedDevOrigins: ['gwdev.gzjtjt.cn']` 保留。未接触 gwdev 服务器。
- 本地提交仅包含上述七个 UI 文件及本记录；既有 `web/next-env.d.ts` 不提交。
- 如需撤回，针对本记录同批的 UI 提交执行 `git revert <该提交号>`，然后刷新本地预览。无需回滚数据库或服务器配置。既有未提交生成文件继续保留，不执行 reset/clean。
