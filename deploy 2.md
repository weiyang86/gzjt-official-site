这次修复 不涉及数据库结构、不涉及 Directus 权限初始化脚本、不需要跑 seed/migration，所以服务器只需要：备份、拉 dev、重建/重启 web 服务、验证。
1. 进入服务器项目目录
cd /www/wwwroot/gzjt-official-site

git branch --show-current
git status
git log --oneline -5
docker compose --env-file .env.directus -f docker-compose.prod.yml ps
如果 git status 里有服务器本地未提交改动，先不要继续，避免覆盖服务器本地文件。
2. 部署前备份数据库和 uploads
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

set -a
source .env.directus
set +a

docker exec gzjt-directus-db pg_dump -U "${POSTGRES_USER:-gzjt_cms}" "${POSTGRES_DB:-gzjt_cms}" > "$BACKUP_DIR/directus.sql"
tar -czf "$BACKUP_DIR/uploads.tar.gz" .data/directus/uploads

ls -lh "$BACKUP_DIR"
确认看到 directus.sql 和 uploads.tar.gz。这一步只读备份，不会改数据库和上传文件。
3. 拉取最新 dev
git switch dev
git fetch origin dev
git pull --ff-only origin dev

git log --oneline -5
如果 git pull --ff-only 失败，说明服务器本地 dev 和远端有分叉，不要强推/不要 reset，先停下来处理。
4. 只更新 web 容器
优先使用这个，只重建并重启 web，不重启数据库，不重建 Directus：
docker compose --env-file .env.directus -f docker-compose.prod.yml up -d --build --no-deps web
如果你的 docker-compose.prod.yml 不是 build: 方式，而是容器启动时自己 npm ci && npm run build，用：
docker compose --env-file .env.directus -f docker-compose.prod.yml up -d --force-recreate --no-deps web
看日志：
docker compose --env-file .env.directus -f docker-compose.prod.yml logs -f --tail=200 web
5. 验证服务
docker compose --env-file .env.directus -f docker-compose.prod.yml ps

curl -I http://127.0.0.1:3000/
curl -I http://127.0.0.1:3000/admin/notice-articles
curl -I http://127.0.0.1:3000/admin/notice-edit
浏览器验证：
https://www.gzjtjt.cn/admin/notice-articles
https://www.gzjtjt.cn/admin/notice-edit
重点测：
公示公告标题点击弹预览
“预览”按钮弹同一个预览框
不出现 Article not found in current scope
上传附件成功
富文本上传/插入成功
新闻列表预览仍正常
6. 宝塔 / Nginx 不需要改
这次没有改端口和部署结构，宝塔反代保持原样：
官网域名 -> http://127.0.0.1:3000
Directus 域名 -> http://127.0.0.1:8055
不要执行这些操作
docker compose down -v
docker volume rm ...
删除 .data/directus
清空数据库
重新跑 bootstrap seed
给 public 开 directus_files 写权限
7. 回滚方式
如果上线后发现问题，推荐用 Git revert，不动数据库和 uploads：
cd /www/wwwroot/gzjt-official-site

git log --oneline -5
git revert <本次提交commit>
docker compose --env-file .env.directus -f docker-compose.prod.yml up -d --build --no-deps web
如果 compose 不是 build 方式：
docker compose --env-file .env.directus -f docker-compose.prod.yml up -d --force-recreate --no-deps web
数据库和 uploads 不需要回滚，因为这次代码更新不改库结构、不迁移数据。