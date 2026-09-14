# 生产环境代码更新脚本

本项目生产环境已经通过 Docker Compose 部署后，推荐使用仓库内脚本完成服务器端更新：

```bash
scripts/deploy/production-update.sh
```

脚本覆盖：

- 服务器端 Git 分支拉取
- PostgreSQL 数据库备份
- Directus uploads / extensions 备份
- Docker 镜像重构与服务重启
- 本机 HTTP 健康检查，默认检查本次更新的 web 服务
- 显式数据恢复

## 1. 本地发布前

先在本地确认代码已经提交并推送到服务器可拉取的远端分支，例如：

```bash
git status --short --branch
git push origin dev
```

脚本只负责服务器从远端拉取代码；如果本地代码没有 push，服务器不会拿到这些更新。

## 2. 服务器执行更新

进入服务器项目目录：

```bash
cd /www/wwwroot/gzjt-official-site
```

执行默认更新：

```bash
BRANCH=dev \
COMPOSE_FILE=docker-compose.prod.yml \
ENV_FILE=.env.directus \
REBUILD_SERVICES="web" \
./scripts/deploy/production-update.sh deploy
```

脚本默认使用：

- `BRANCH=dev`
- `REMOTE=origin`
- `COMPOSE_FILE=docker-compose.prod.yml`
- `ENV_FILE=.env.directus`
- `DB_SERVICE=directus-db`
- `DIRECTUS_SERVICE=directus`
- `REBUILD_SERVICES=web`
- `HEALTH_URLS="http://127.0.0.1:3000/ http://127.0.0.1:3000/img/index_bg.png"`
- `FORCE_RECREATE=1`
- `CLEAN_WEB_BUILD=1`

如果生产 Compose 中服务名不同，可以通过环境变量覆盖：

```bash
DB_SERVICE=postgres \
DIRECTUS_SERVICE=directus \
REBUILD_SERVICES="web cms-api" \
HEALTH_URLS="http://127.0.0.1:3000/ http://127.0.0.1:4000/health" \
./scripts/deploy/production-update.sh deploy
```

Directus 服务状态会在 `docker compose ps` 中展示。部分 Directus 生产配置下，匿名访问 `http://127.0.0.1:8055/server/health` 会返回 403；这种情况说明接口受权限策略限制，不适合作为默认发布健康检查。

脚本默认会强制重建/重启 `web` 容器，并在拉取代码后清理 `web/.next` 与 `web/tsconfig.tsbuildinfo`，确保容器启动命令重新执行，避免继续使用旧的 Next.js 构建产物或旧 public 资源。默认健康检查也会检查首页背景图 `/img/index_bg.png`，避免静态资源缺失时误判发布成功。如果确认不需要重建容器，可以显式关闭：

```bash
FORCE_RECREATE=0 ./scripts/deploy/production-update.sh deploy
```

如果确认不需要清理前端构建产物，可以显式关闭：

```bash
CLEAN_WEB_BUILD=0 ./scripts/deploy/production-update.sh deploy
```

## 2.1 宝塔反代监听 3000 时的端口调整

如果宝塔 Nginx 需要继续对外提供 `http://36.133.201.194:3000/`，不要让 Nginx 的 `listen 3000` 再反代到 `127.0.0.1:3000`，否则会形成代理循环：

```text
Nginx listen 3000 -> proxy_pass 127.0.0.1:3000 -> Nginx listen 3000
```

正确结构：

```text
公网 3000 -> 宝塔 Nginx listen 3000 -> 127.0.0.1:3001 -> web 容器内 3000
```

服务器首次调整时执行：

```bash
cd /www/wwwroot/gzjt-official-site

git switch dev
git pull --ff-only origin dev

./scripts/deploy/patch-prod-web-port-3001.sh docker-compose.prod.yml

docker compose --env-file .env.directus -f docker-compose.prod.yml up -d --force-recreate web
docker compose --env-file .env.directus -f docker-compose.prod.yml ps

curl -I http://127.0.0.1:3001/
curl -I http://127.0.0.1:3001/img/index_bg.png
```

然后在宝塔反向代理项目 `192.168.0.184_3001` 的配置文件里，把：

```nginx
proxy_pass http://127.0.0.1:3000;
```

改成：

```nginx
proxy_pass http://127.0.0.1:3001;
```

保存后重启宝塔 Nginx：

```bash
/www/server/nginx/sbin/nginx -t
/etc/init.d/nginx restart
```

最终验证：

```bash
ss -lntp | grep -E ':3000|:3001'
curl -I http://127.0.0.1:3001/
curl -I http://127.0.0.1:3000/
curl -I http://36.133.201.194:3000/
curl -I https://gzjtjt.cn/pages/about/index.html
```

预期结果：

- `3000` 由宝塔 Nginx 监听。
- `3001` 由 Docker / web 服务监听。
- `127.0.0.1:3001` 返回 web 服务。
- `127.0.0.1:3000` 和 `36.133.201.194:3000` 通过宝塔 Nginx 返回 web 服务。

端口调整完成后，后续部署可以用 3001 先检查真实 web 后端：

```bash
HEALTH_URLS="http://127.0.0.1:3001/ http://127.0.0.1:3001/img/index_bg.png" \
BRANCH=dev \
COMPOSE_FILE=docker-compose.prod.yml \
ENV_FILE=.env.directus \
REBUILD_SERVICES="web" \
./scripts/deploy/production-update.sh deploy
```

如果首页背景图已经替换但浏览器仍显示旧图，先用服务器验证真实文件是否已更新：

```bash
sha256sum web/public/img/index_bg.png
curl -I "http://127.0.0.1:3001/img/index_bg.png?v=$(date +%s)"
curl -I "http://36.133.201.194:3000/img/index_bg.png?v=$(date +%s)"
```

首页代码会在构建时给 `/img/index_bg.png` 自动追加内容哈希版本号；只要脚本完成 `git pull`、清理 `.next`、重建/重启 `web`，浏览器就会请求新的图片地址。

## 3. 脚本执行顺序

1. 检查 `git`、`docker`、`curl`、`tar` 是否可用。
2. 检查服务器工作区是否存在已跟踪文件的本地改动。
3. 检查 Compose 文件和服务名是否存在。
4. 拉取远端分支信息。
5. 备份 PostgreSQL、uploads、extensions。
6. 使用 `git pull --ff-only` 更新代码。
7. 打印关键静态资源 sha256，默认包含 `web/public/img/index_bg.png`。
8. 默认清理 `web/.next` 与 `web/tsconfig.tsbuildinfo`。
9. 使用 `docker compose up -d --build --no-deps --force-recreate` 重构并重启配置的服务。
10. 执行本机健康检查。

备份目录默认生成在：

```bash
backups/YYYYMMDD_HHMMSS/
```

目录内包含：

- `directus.dump`
- `directus-uploads.tar.gz`
- `directus-extensions.tar.gz`
- `manifest.txt`

## 4. 数据恢复

数据恢复会替换生产数据库和 uploads，必须显式确认：

```bash
CONFIRM_RESTORE=YES \
BRANCH=dev \
COMPOSE_FILE=docker-compose.prod.yml \
ENV_FILE=.env.directus \
REBUILD_SERVICES="web" \
./scripts/deploy/production-update.sh restore backups/YYYYMMDD_HHMMSS
```

恢复流程会：

1. 停止 Directus 和配置的前端服务。
2. 重建 PostgreSQL 数据库。
3. 从 `directus.dump` 恢复数据库。
4. 恢复 uploads 和 extensions。
5. 重启服务并执行健康检查。

日常代码发布通常不需要执行恢复。只有在误操作、数据库异常或上传文件损坏时才执行 `restore`。

## 5. 更新失败处理

如果脚本在 `git pull` 前失败，代码不会被更新；根据错误提示修复后重跑即可。

如果脚本在服务重建或健康检查阶段失败，先保留终端输出和本次备份目录。推荐处理顺序：

```bash
docker compose --env-file .env.directus -f docker-compose.prod.yml ps
docker compose --env-file .env.directus -f docker-compose.prod.yml logs -f --tail=200 web
```

如果确认是本次代码问题，优先在仓库中 revert 问题提交、推送到 `dev`，然后重新执行部署脚本。这样服务器仍保持 `git pull --ff-only` 的稳定更新方式。

## 6. 不要执行

生产环境不要执行以下操作：

```bash
docker compose down -v
docker volume rm ...
rm -rf .data/directus
```

除非已经确认要完整恢复数据，也不要手动删除 PostgreSQL 数据目录、uploads 或 Directus extensions。

## 7. 是否涉及数据库或部署结构

本脚本本身不修改数据库结构，不执行 Directus 初始化、seed 或 migration。

本脚本不要求修改 Nginx / 宝塔反代配置；默认仍按现有生产结构：

- 官网域名反代到 `http://127.0.0.1:3000`
- Directus 域名或路径反代到 `http://127.0.0.1:8055`
