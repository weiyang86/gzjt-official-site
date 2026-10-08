# 使用数据 API 运行官网

官网 Next.js 的公开内容、管理端读写及账号验证现通过 `CMS_DATA_API_URL` 访问新数据 API。原 PostgreSQL 和 Directus 服务不参与该运行路径。`web/services/cms-api` 的公开接口也使用同一适配层；旧 Prisma 管理模块不再加载。

## 本地运行

先启动已导入数据的 API 服务，再在 `web/` 目录运行 `npm ci` 和 `npm run dev:site`。Windows 上若没有 npm 命令，可直接运行 `pnpm exec next dev --webpack`。开发模式（`pnpm dev` 或 `pnpm run dev:site`）默认使用 `http://localhost:8008/_plugins/gw/curd`；生产模式（先 `pnpm run build`，再 `pnpm run start`）默认使用 `http://192.168.0.221:8000/_plugins/gw/curd`。设置 `CMS_DATA_API_URL` 可以覆盖任一默认值。文件从 `web/.data/cms-uploads` 读取；可用 `CMS_UPLOAD_DIR` 覆盖。

## 生产部署

`docker-compose.api.yml` 只启动官网服务。启动前设置容器可访问的 `CMS_DATA_API_URL`、足够长的随机 `ADMIN_SESSION_SECRET`，以及与统一身份平台一致的 `ADMIN_SSO_SECRET`。例如数据 API 在 Docker 主机的 8008 端口时使用 `http://host.docker.internal:8008/_plugins/gw/curd`。必须确保该地址对容器可达；容器内的 `localhost` 指向容器自身。

```bash
CMS_DATA_API_URL=http://host.docker.internal:8008/_plugins/gw/curd \
ADMIN_SESSION_SECRET='<random-secret>' \
ADMIN_SSO_SECRET='<shared-sso-secret>' \
  docker compose -f docker-compose.api.yml up -d
```

## 管理后台单点登录

统一身份平台可访问 `/admin/login?key=<encrypted>&targetUrl=<path>`。`key` 的明文格式为 `后台账号标识#毫秒时间戳`，账号标识可使用完整邮箱、`external_identifier` 或唯一的邮箱前缀；加密方式须兼容 Java `DES/ECB/PKCS5Padding` 和 URL-safe Base64。链接默认 5 分钟有效，可用 `ADMIN_SSO_MAX_AGE_SECONDS` 配置为 30 至 3600 秒。`targetUrl` 仅接受本站 `/admin` 路径；为空、外站地址或登录页地址时统一跳转 `/admin`。共享密钥仅通过部署环境变量提供，不得提交到仓库。

Compose 将原上传目录 `./.data/directus/uploads` 挂载到官网的文件目录，保留迁移后的图片和附件。若新机器没有该目录，应先从备份复制全部上传文件；数据库行只保存文件元数据，不能替代文件本体。新上传文件也会写入此目录。

切换生产环境前，备份原数据库和 uploads，并确认新 API 数据及上传文件完整。用公开文章接口、图片接口、后台登录和内容新增/修改做验收。确认无误后，方可停止原 Directus/PostgreSQL 容器。

## 回滚

保留原 `docker-compose.prod.yml`、原数据库和 uploads 备份。需要回滚时，停止 `docker-compose.api.yml` 的 web，恢复原 Compose 中的 Directus、PostgreSQL 与 web，并恢复切换前的数据库及文件备份。切换后在新 API 中产生的数据不会自动同步回原数据库。
