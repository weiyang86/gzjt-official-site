# 官网 UI 优化 · Orca 交接

> 2026-11-14 全站动效增量：已在原首页意象基线上统一入口、首页和内页进入动效，新增左栏滑入、分屏重播与减少动效处理。最新修改、86 组最终布局检查、截图和构建限制见 [全站动效记录](SITE-MOTION-20261114.md)。沿用原分支、Run 和 3000 服务，勿重复开发；原生成文件差异继续保留。

> 2026-11-14 首页增量：已按用户新参考完成左侧交互栏、各板块工程照片/线稿及手机适配，继续使用原分支和 Run。最新变更、最终 70 组布局与交互边界见 [首页意象优化记录](HOMEPAGE-ATMOSPHERE-20261114.md)，不重复开发该增量。

交接日期：2026-11-13（Asia/Shanghai）。本文件记录本次聊天的真实完成范围，不代表 UI 优化已实施。

> 2026-11-14 接续状态：本文以下为最初交接快照，后续已完成 `ca4c9cf` 入口/首页、`b7e777e` 全站共享 UI、`a71aeee` 导航间距，并持续处理全站独立验收修复。最新范围与实际结果见 [全站接续](UI-OPTIMIZATION-SITEWIDE-20261113.md)、[验收修复](UI-OPTIMIZATION-20261114-REPAIRS.md)。继续使用原 Run `run_df9467d252c7` 和本整合分支，不按本文历史待办重复开发；旧生成文件差异仍保留。

> 本阶段源码最终为 `408bb7c`，协调者已完成全站回归和本地提交；当前没有运行中的 Worker。下一次接续以 [最终交付记录](UI-OPTIMIZATION-20261114-DELIVERY.md) 的实际结果与剩余阻塞为准，不重复开发。3000 预览继续保留，不 push、不部署。

## 1. 项目、工作区与 Git 检查点

| 项目 | 核对结果 |
| --- | --- |
| 项目绝对路径 / Git 顶层目录 | `/Users/lei/Documents/甘孜项目/二期项目/官网项目/code/gzjt-official-site` |
| 当前工作区路径 | `/Users/lei/Documents/甘孜项目/二期项目/官网项目/code/gzjt-official-site` |
| 前端子工程 / 服务工作目录 | `/Users/lei/Documents/甘孜项目/二期项目/官网项目/code/gzjt-official-site/web` |
| 当前分支 | `codex/feature-ui-optimization-20261113` |
| 写入交接文档前的 HEAD | `65a0741e57db4f623fc15d2e946445402d2228a5` |
| 原 HEAD 提交说明 | 修复根布局 data-viewport 触发的水合不一致警告 |
| Git worktree 情况 | 一个主 worktree；本次不创建或切换 worktree |
| Orca 工作区 ID | `6f421c8f-6efb-474a-92a7-197ef7d642b2::/Users/lei/Documents/甘孜项目/二期项目/官网项目/code/gzjt-official-site` |
| Orca 精确工作区地址 | `--environment local --worktree identity:wt2:local:c84e9fd9-b3aa-49e7-af26-b92d323282df` |

本次检查点仅包含本交接文档：本次聊天没有实施可归入 UI 优化的业务源码修改。检查点为本文件创建后的本地提交，不 push、不部署。提交完成后可在项目根目录运行下列命令查出检查点完整提交号：

```bash
git log -1 --format='%H %s' -- docs/UI-OPTIMIZATION-ORCA-HANDOFF.md
git status --short --branch
```

检查点不包括 `web/next-env.d.ts`、本地依赖、缓存和环境配置。**新 worktree 只继承已提交的内容，不会自动继承上述未提交或忽略文件，也不会接管正在运行的服务。**

## 2. 任务目标与全部改动边界

用户希望优化甘孜建设投资集团官网前端；领导认可的视觉参考为 <https://www.shudaojt.com/>。当前实际开发预览为 <http://localhost:3000/home>。

### 允许推进的方向

- 围绕现有官网优化导航、首屏、新闻、业务、文化专题及手机体验，借鉴参考站的工程大图、标题层级、分屏和图文关系。
- 优先修复 Logo / 导航空间挤压，再处理首屏图像明暗与主体文案、新闻内容主次；之后处理业务图片、数据展示、专题和整体视觉一致性。
- 保留甘孜建投品牌与真实业务内容；图片、宣传语和经营数据应使用获确认且可公开的素材。
- 上述优先级是本次提出的建议；用户尚未逐项确认设计稿、尺寸、配色或导航位置，不能当作已经批准的完整改版规格。

### 必须遵守的项目边界

1. 接续前先阅读根目录 `AGENTS.md` 与 `web/AGENTS.md`。本次按用户指令保持指定分支，不切换、不拉取、不合并其他分支，不直接修改 main。
2. 所有前端工作位于 `web/`，使用现有 Next.js + TypeScript 工程；不得新建 `site/` 替代。
3. 保持现有信息架构、栏目、URL、重定向、HTML 兼容及既有视觉连续性；保留旧静态页面作为参考与回滚来源，不删除、覆盖成另一套官网或开展无关 UI 重设计。
4. UI 参考不等于替换 Logo、照用对方工程素材、业务名称或经营数据；首屏导航是否采用参考站的底置方式仍待确定。
5. CMS 技术边界为 Directus Headless CMS，数据库为 PostgreSQL，预留明道云单点登录；本轮 UI 工作不擅自变更后台、认证、数据源或数据库结构。
6. 当前前端 CMS 请求集中于 `web/lib/cms/`，其中 `client.ts` 引用 `api-store.js`；现有代码包含数据 API 适配。不要因技术规划文字而在 UI 任务中重写该适配，也不要绕过统一封装直接在页面散落请求。
7. 前台只能读取已发布内容；排序、栏目映射、跳转和后台可配置能力应保持有效。
8. 不提交 `.env`、密码、密钥、凭据、真实客户隐私数据，不提交 `node_modules` 或 `.next` 缓存。
9. 本地环境为 Mac；生产部署边界为 Linux + 宝塔 + Docker Compose + Nginx。生产部署前必须备份数据库和 uploads。本次无部署授权，不 push、不部署。

### gwdev 测试环境专属限制

- 测试目录 `/www/wwwroot/gwdev`，域名 `gwdev.gzjtjt.cn`。将来同步前须先比较本地和服务器配置，只同步本次审核过的源码，不用整目录覆盖。
- `web/.env.local` 与服务器 `/www/wwwroot/gwdev/.env.local` 是不同环境配置，不能互相覆盖、提交或传输秘密值。本文只记录变量名称，不记录环境变量值。
- 默认不覆盖服务器 `/www/wwwroot/gwdev/package-lock.json`；依赖确有变更时先审查差异，并按项目规则取得确认。
- 不覆盖、删除或重写 `/www/server/panel/vhost/nginx/gwdev.gzjtjt.cn.conf`；代理配置变更要单独检查、确认、验证。
- 保留服务器 `/www/wwwroot/gwdev/.env.local.backup-before-localhost-8000` 和 `/www/wwwroot/gwdev/next.config.ts.bak-codex-20261023` 回滚备份。
- 保留 `web/next.config.ts` 的 `allowedDevOrigins: ['gwdev.gzjtjt.cn']`；不要同步本地 `node_modules`。本地与服务器 Next.js / React 版本差异未经本次核对，不能假定一致。
- 将来涉及环境文件、锁文件、Next 配置或 Nginx 配置的同步，先展示差异并按规则确认；完成后复核上述配置与客户端交互，不把服务器配置复制回仓库。

## 3. 完成状态

### 已完成

- 核对项目位置和已有前端进程；在此前阶段建立了当前 `codex/feature-ui-optimization-20261113` 分支。
- 定位 `/home` 的 `Module not found: Can't resolve '@node-rs/argon2'`：清单和锁文件已有依赖，但本地安装目录缺少模块。
- 通过临时目录准备指定的 `@node-rs/argon2` 2.2.1 及 Mac ARM 原生包，再仅补齐缺失的本地依赖；没有修改依赖清单、锁文件或升级 Next.js / React。
- 使用临时随机字符串验证 Argon2 hash / verify：正确值可验证，错误值不能验证；CMS 模块可直接加载。
- 在此前修复阶段重启过本项目开发服务以清除编译错误缓存，`/home` 返回 HTTP 200。本次交接阶段没有重启或停止服务。
- 只读检查蜀道集团公开页面与样式；使用独立无头浏览器分别查看参考站和当前 `/home` 的 1440 × 1000 桌面首屏截图。
- 提出了 UI 优化建议，观察到当前桌面首屏 Logo 与左侧导航挤压、背景偏暗、主体文案未形成视觉中心。
- 本次交接重新核对 Git、Orca 工作区、依赖、服务归属和 `/home` 响应，整理本交接文档。

### 进行中 / 停止位置

- 交接准备停在文档审查、创建单个本地检查点及最终核对；检查点完成后本聊天停止修改代码，等待 Orca 接续。
- 没有进行中的业务 UI 实现，没有启动接收代理、创建新 worktree 或发送后续开发任务。

### 尚未开始

- 导航、首屏、新闻屏及其他页面的 UI 源码修改。
- 确认最终视觉规格、导航位置、素材、文案、数据口径及手机交互方案。
- 全页面与全断点视觉 / 功能回归、实际手机测试、构建和完整类型检查。
- 数据库迁移、后台改造、远端配置比较、测试或生产部署。

## 4. 文件与本地成果归属

| 路径 | 原因与处理 |
| --- | --- |
| `docs/UI-OPTIMIZATION-ORCA-HANDOFF.md` | 本次新建交接文档；唯一计划纳入本次检查点的文件。 |
| `web/next-env.d.ts` | 本聊天第一次检查时就已修改，属于 Next 生成文件，无法把原改动安全归为本次 UI 成果；原样保留，不暂存、不提交、不手工修复。 |
| `web/node_modules/@node-rs/argon2/` | 此前补齐缺失的已声明依赖；本地安装产物，被忽略，不进入提交。 |
| `web/node_modules/@node-rs/argon2-darwin-arm64/` | 同上，供当前 Mac ARM 环境加载的原生包；不进入提交，Linux 环境应自行安装对应平台依赖。 |
| `web/.next/` | 开发服务生成的缓存和类型；不进入提交，不在交接时清理。 |
| `/tmp/shudao-ui-audit.png`、`/tmp/gzjt-ui-audit.png` | 前述桌面首屏观察的截图，交接时仍存在；不是新设计稿，不纳入提交，临时目录可能被系统清理。 |
| `/tmp/gzjt-argon2-repair-20261113/` | 此前依赖修复的临时下载目录，仍保留；新工作区不能依赖它长期存在。 |

`web/next-env.d.ts` 的既有差异如下，仅为交接记录，不纳入本次提交：

```diff
-import "./.next/types/routes.d.ts";
-import "./.next/types/root-params.d.ts";
+import "./.next/dev/types/routes.d.ts";
```

没有由本次聊天修改的业务源码。下面第 5 节列出的文件是接续定位入口，不是已修改文件清单。

## 5. 设计变量、断点与手机适配

### 决策状态

已确定的用户意向是参考蜀道集团官网继续优化当前 UI。**尚未形成经用户确认的新设计 token、统一断点表或手机端改版规格。** 下列数值来自现有代码，作为排查基线；不要把既有配置或本次建议写成已经完成的设计实施。

### 现有实现入口

- `/home`：`web/app/home/page.tsx`，动态获取首页内容；引用共享 `Header`、`Drawer`、`MobileNavToggle` 与 `HomepageExperience`。
- `/`：`web/app/page.tsx`，读取 `web/public/legacy-static/index.html` 的旧首页；与 `/home` 不是同一个页面实现，验证 `/` 不能替代验证 `/home`。
- 导航：`web/app/news/components.tsx`；Logo 位于 header 下，导航主体位于 container 中，排查布局时关注二者的定位和空间分配。
- 分屏、轮播与手势：`web/app/homepage/HomepageExperience.tsx`。
- 首页配置及默认值：`web/lib/cms/homepage-layout.ts`；支持图片 / 视频 Banner、轮播间隔、分屏顺序 / 显隐、每屏背景、栏目标题、显示数量及联系信息等。
- 首页样式按页面中引用顺序加载：`theme.css` → `pages.css` → `global-ui.css` → `homepage-experience.css` → `mobile.css`。前三个及最后一个在 `web/public/legacy-static/pages/assets/` 下，首页专用 CSS 在 `web/public/legacy-static/` 下。存在共享规则和后置覆盖，不能只看某一处声明。
- 默认首页顺序为 hero → news → culture → business → contact；实际顺序和显示内容可受 CMS 配置影响。
- 默认轮播间隔 6000 ms，配置归一化范围 2000–20000 ms；新闻默认 5 条、文化 6 条、业务 6 条。
- `HomepageExperience.tsx` 当前 hero JSX 渲染背景 / 视频、链接热区、轮播点和下滑入口，**没有实际输出 hero 主副标题节点**，虽然配置和 CSS 已存在标题字段 / 样式；首屏文案问题应从渲染逻辑与配置共同排查，不能仅改字号。

### 现有变量 / 尺寸基线

| 来源 | 当前声明 |
| --- | --- |
| `theme.css` 颜色 | `--brand: #C62828`、`--brand2: #E94B5A`、`--tech: #2D5BFF`、`--navy: #0D2F5A`、`--ink: #0B1220`、`--muted: #5E6573`、`--bg: #F8F9FB` |
| 共享颜色后置覆盖 | `global-ui.css` 包含 `--brand: #B11F24 !important`、`--brand2: #D73A31 !important`；最终外观须看实际层叠与 computed style。 |
| `theme.css` 间距 | `--container: 1440px`、`--content: 1280px`、`--pad: 80px`、`--gap: 24px`、`--section-gap: 100px` |
| `theme.css` 圆角 / 动效 | `--radius: 24px`、`--radius2: 32px`、`--ease: cubic-bezier(.2,.8,.2,1)` |
| 首页局部值 | 深色基底 `#071b32`，强调色多处使用 `#e9c46a` / 相近金色；尚未统一成新 token。 |
| 首页版心 / 屏幕 | `.home-screen-inner` 为 `min(1320px,100%)`；分屏使用 `100svh`、固定外层和绝对定位屏幕。 |
| 现有标题 CSS | hero 为 `clamp(42px,7vw,96px)`；屏幕标题为 `clamp(30px,4vw,52px)`；它们是已有样式，不表示当前 hero 已渲染文字。 |
| 首页导航 | 后置规则固定于顶部；`.header-inner` 默认最小高 74px，≤900px 的规则最小高 62px。CSS 前部残留底置导航规则，被后部覆盖，修改时注意来源。 |

此前提出“以 Logo 蓝为品牌主色、金色少量强调”的方向，仍属于待确认建议；没有改写现有红色共享变量。

### 现有断点与手机适配

| 条件 | 已有行为 / 注意事项 |
| --- | --- |
| `max-width: 1100px` | 首页桌面导航隐藏，显示菜单按钮与 actions。 |
| `max-width: 900px` | 首页布局收紧；首页专用 CSS 原有新闻两列、业务两列等规则，但手机层还会继续覆盖。 |
| `max-width: 540px` | 更紧凑的字号、卡片和二维码等；标题 CSS 包含 `clamp(38px,11vw,58px)` 等值。 |
| `max-width: 1050px / 760px` | 首页专用 CSS 中主要用于后台首页配置编辑器，不能误当作前台统一断点。 |
| 共享 CSS 其他断点 | theme 含 992 / 980 / 768 / 576px；global-ui 含 1200 / 1024 / 768px，后续需检查作用域与层叠，尚未统一。 |
| `html[data-viewport="mobile"]` | `web/app/layout.tsx` 使用粗指针或视口宽度 ≤900px 判为 mobile，并在 resize / orientationchange 更新；因此宽屏触摸设备也可能启用手机层。 |

手机层 `mobile.css` 在首页样式之后加载，当前方案包括：

- 分屏内容区允许纵向内部滚动，左右溢出隐藏；hero 居中，背景继续 cover，实际裁切需要实机验证。
- 新闻为单列列表，标题限制两行；业务为两列，隐藏简介；企业文化横向卡片可滑动。
- 抽屉面板有高度上限并允许内部滚动；`MobileNavToggle.tsx` 绑定打开、关闭及 Escape，设置相关 ARIA 状态。
- 分屏触摸逻辑区分横向 / 纵向；纵向位移超过 40px 才考虑切屏，内容未滚到边界先保留内部滚动，抽屉打开时不抢滚轮。
- 未显示屏幕使用 `aria-hidden` / `inert`；已包含减少动效偏好的处理，但未完成全面可访问性验证。

“手机端是否继续整屏切换、是否部分改成自然连续滚动”还没有做新设计决定。后续可先用 390px 手机、768 / 900px 平板、1100px 临界宽度和 1440px 桌面作为验证矩阵；这只是建议的验证尺寸，不是已验收断点。

## 6. 已执行检查、结果与未验证内容

| 检查 | 结果与范围 |
| --- | --- |
| Git 顶层、分支、HEAD、worktree 和暂存区 | 路径与指定分支一致，只有一个主 worktree；交接前暂存区为空，只有既有 `web/next-env.d.ts` 未提交差异。 |
| Orca 工作区识别 | `orca worktree current --json` 已确认当前路径和相同分支 / HEAD；仅只读查询，没有启动代理。 |
| 本地依赖版本 | Next.js 16.2.9，React / React DOM 19.2.7，Argon2 2.2.1；交接时 CMS 模块可加载。 |
| Argon2 原生功能 | 此前随机字符串 hash / verify 通过，错误字符串被拒绝；没有使用或改写真实用户密码。 |
| 原报错页面 | 此前修复后 `/home` 返回 200；交接时再次 GET `/home` 返回 200，HTML 标题正确，未含原 Argon2 缺失错误。只表示页面响应，不等于所有数据和交互都正常。 |
| 开发服务归属 | Orca 全局端口列表确认 `127.0.0.1:3000` 为 node PID 18713，类型 external；`lsof` 确认其 cwd 为本项目 `web/`。当前工作区的 Orca 默认端口列表为空，不应由此判断服务未启动。 |
| 桌面视觉 | 此前观察过参考站和本地首页的 1440 × 1000 首屏截图；本地存在导航挤压和首屏信息层级问题。 |
| 凭据和配置 | 未写入环境变量值；本次不编辑环境文件、依赖清单、锁文件、Next 配置或服务器配置。 |

尚未验证：

- 全量 typecheck / production build，没有执行；本次只做文档交接，不为此清理或覆盖运行中的 `.next` 类型缓存。
- 所有栏目页、旧 URL、搜索、分页、抽屉、菜单键盘操作、轮播点击、分屏滚轮 / 触屏、表单的完整回归。
- 手机实机、横屏、小高度、触摸平板、字体加载、图片裁切和多断点截图。
- 参考站的全部分屏和移动端交互；此前浏览器连接工具连续超时，最终使用独立无头浏览器验证的仅是桌面首屏。
- CMS 已发布筛选、数据完整性、鉴权、内容管理和上传的端到端测试；页面 200 不能替代这些检查。
- 测试环境与本地依赖 / 配置差异、生产部署及数据库 / uploads 备份情况。

## 7. 开发服务与环境

### 当前保留的服务

- 预览：<http://localhost:3000/home>；监听地址为 `127.0.0.1:3000`。
- 交接时 PID：`18713`；进程运行目录为本项目的 `web/`，不是新的 worktree。
- Orca 将它列为 external 服务，接续时应保留；不要因工作区专属端口列表为空而重复启动、抢占 3000 或关闭其他进程。
- 前述启动命令为下列命令；本次交接未再次执行启动 / 重启。

```bash
cd '/Users/lei/Documents/甘孜项目/二期项目/官网项目/code/gzjt-official-site/web'
npm run dev:site -- --hostname 127.0.0.1 --port 3000
```

`dev:site` 实际执行 `next dev --webpack`。部分 README 仍描述旧 `server.js` 和其他端口，接续时以当前 `web/package.json`、监听状态及页面响应为准。

交接时当前 shell 为 Node.js v26.7.0 / npm 11.19.0；此前最初启动环境检查曾为 Node.js v24.21.0。未据此升级依赖，也未核验运行中服务解释器的确切版本；不要把当前 shell 版本当作已固定的项目运行时规范。

### 环境配置只列变量名称

本次检查未发现 `web/.env.local`，发现根目录 `.env.directus`；不创建、不复制这些文件，也不记录其中的值。

- 当前 CMS 数据和资源封装可能使用：`CMS_DATA_API_URL`、`CMS_UPLOAD_DIR`、`DIRECTUS_URL`、`PUBLIC_URL`、`NODE_ENV`。
- 本地已有 Directus 环境文件的变量名称：`DIRECTUS_IMAGE`、`POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`DIRECTUS_KEY`、`DIRECTUS_SECRET`、`ADMIN_EMAIL`、`ADMIN_PASSWORD`、`PUBLIC_URL`、`FRONTEND_URL`。
- 这是涉及的配置名称清单，并非要求启动 UI 就补齐所有值。需要配置时由本地安全渠道提供，不从聊天、服务器或临时文件抄入 Git。
- 新工作区不会自动拥有环境文件、上传目录和本地依赖；先确认安全配置来源。新建 Linux / 其他架构环境不能复制本机原生包，应按项目锁文件安装其平台依赖。

## 8. Orca 可以直接执行的下一步

1. 在 Orca 复用当前已识别工作区，阅读本文、两份 AGENTS 规则，并运行 `git status --short --branch`、`git log -1`。识别未提交的 `web/next-env.d.ts`，保留它，不把它当成本次检查点遗漏的 UI 源码。
2. 确认当前 3000 服务仍对应本项目 `web/`，打开 `/home`。如果将来确需另一 worktree，应从明确的本地检查点承接，单独准备依赖 / 配置并使用另一个空闲端口；不要把当前 3000 页面误认为新目录的预览。本次没有创建该 worktree，也没有改变 Git 基线。
3. 先检查 `Header` / `.header-logo` / `.header-inner` / `.nav` 的空间分配与层叠，在 1440px 和 1100px 临界宽度复现导航挤压。保持既有栏目及 URL，先完成布局修正。
4. 核对 hero 文案是否应展示，并结合现有配置确认文案和素材。检查未输出标题 JSX、背景多层遮罩及图像裁切，提出保留当前结构的首屏调整；导航底置方案仍需单独明确。
5. 为新闻屏建立一条图片重点新闻与其他新闻的主次关系，复用 CMS 已发布文章、现有排序和详情链接，不在前台杜撰内容。
6. 在 390 / 768 / 900 / 1100 / 1440px 验证导航、图片、长标题和屏内滚动；触摸设备还需检查 `data-viewport` 与宽度断点组合。验证轮播、抽屉、滚轮 / 手势、减少动效偏好及旧路径。
7. 实现发生后再做适当的类型检查 / 构建与视觉回归，并按根 AGENTS 要求报告文件、功能、验证、数据库 / 部署影响及回滚方式。当前开发服务运行时，应避免无计划删除其类型 / 缓存目录。

## 9. 检查点范围与回滚

- 检查点只保存本交接文档，没有新增业务功能、数据库结构变化或部署配置变化。
- 回滚本次检查点不需要数据库或部署操作；如将来确需撤回，可针对本交接文档的提交执行一次 `git revert <检查点提交号>`。本次不执行回滚，不 reset / clean / stash 工作区。
- 不把 `web/next-env.d.ts` 纳入本次检查点；其既有差异仍留在当前工作区。需要它的精确副本时必须单独审查，不能假定新 worktree 已包含它。
- 保留开发服务及上述本地成果，不关闭无关进程。交接完成后原聊天停止写代码，等待 Orca 接续。
