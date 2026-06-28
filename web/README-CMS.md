# 甘孜州建投集团官网 · CMS（后台 + API）

## 本地开发（推荐）

### 1) 安装依赖
在项目根目录执行：
```bash
npm install
```

### 2) 启动数据库与对象存储（Docker）
```bash
docker compose up -d
```

### 3) 初始化后端（迁移 + 种子数据）
```bash
npm --prefix services/cms-api run prisma:migrate
npm --prefix services/cms-api run seed
```

### 4) 启动 CMS API
```bash
npm run dev:api
```

API 默认地址：
- http://localhost:4000

### 5) 启动 CMS 管理端
```bash
npm run dev:admin
```

管理端地址：
- http://localhost:5173/cms/login

默认管理员账号：
- 用户名：admin
- 密码：admin123456

## 现有官网前台
现有静态前台保持不动，可继续使用：
```bash
npm run dev:site
```

