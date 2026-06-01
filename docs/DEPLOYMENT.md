# 部署指南

> 渗透测试工具开发系统 — 生产环境部署说明

---

## 部署方式对比

| 方式 | 难度 | 适用场景 | 特点 |
|------|------|---------|------|
| Manus 平台 | ⭐ | 快速上线 | 一键部署，内置数据库和 AI |
| Docker | ⭐⭐ | 私有化部署 | 容器化，环境隔离 |
| 手动部署 | ⭐⭐⭐ | 定制化需求 | 完全控制，灵活配置 |

---

## 方式一：Manus 平台部署（推荐）

Manus 平台提供开箱即用的部署能力，无需配置数据库和 AI API Key。

### 步骤

1. 确保代码已提交到 Checkpoint
2. 在 Manus 管理界面点击右上角 **Publish** 按钮
3. 等待约 2-3 分钟完成构建
4. 访问分配的域名（格式：`xxx.manus.space`）

### 自定义域名

在 Manus 管理界面 → **Settings → Domains** 中可以：
- 修改自动生成的子域名前缀
- 绑定自有域名（需配置 CNAME 记录）
- 购买新域名

### 环境变量配置

Manus 平台自动注入以下环境变量，无需手动配置：

```
DATABASE_URL         # TiDB 连接字符串
JWT_SECRET           # 自动生成
BUILT_IN_FORGE_API_KEY   # 内置 AI API Key
BUILT_IN_FORGE_API_URL   # 内置 AI API 地址
VITE_APP_ID          # OAuth 应用 ID
OAUTH_SERVER_URL     # OAuth 服务地址
```

---

## 方式二：Docker 部署

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- MySQL 8.0 或 TiDB

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://pentest:password@db:3306/pentest_db
      - JWT_SECRET=${JWT_SECRET}
      - VITE_APP_ID=${VITE_APP_ID}
      - OAUTH_SERVER_URL=${OAUTH_SERVER_URL}
      - VITE_OAUTH_PORTAL_URL=${VITE_OAUTH_PORTAL_URL}
      - BUILT_IN_FORGE_API_KEY=${BUILT_IN_FORGE_API_KEY}
      - BUILT_IN_FORGE_API_URL=${BUILT_IN_FORGE_API_URL}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: pentest_db
      MYSQL_USER: pentest
      MYSQL_PASSWORD: password
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  mysql_data:
```

### Dockerfile

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine AS runner

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 启动命令

```bash
# 创建 .env 文件
cat > .env << EOF
JWT_SECRET=your-super-secret-key-min-32-chars
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
BUILT_IN_FORGE_API_KEY=your-ai-api-key
BUILT_IN_FORGE_API_URL=https://api.openai.com/v1
EOF

# 启动服务
docker-compose up -d

# 初始化数据库
docker-compose exec app node -e "
const { drizzle } = require('drizzle-orm/mysql2');
// 运行迁移...
"

# 查看日志
docker-compose logs -f app
```

---

## 方式三：手动部署（生产环境）

### 系统要求

| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB | 8 GB |
| 磁盘 | 20 GB | 100 GB |
| 操作系统 | Ubuntu 20.04+ | Ubuntu 22.04 |
| Node.js | 22.x | 22.x LTS |
| MySQL | 8.0 | 8.0 / TiDB |

### 安装 Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # v22.x.x
```

### 安装 pnpm

```bash
npm install -g pnpm
pnpm --version  # 10.x.x
```

### 克隆并构建

```bash
# 克隆代码
git clone https://github.com/rakehellsx/penetration-tool.git
cd penetration-tool

# 安装依赖
pnpm install --frozen-lockfile

# 配置环境变量
cp .env.example .env
nano .env  # 填写配置

# 数据库迁移
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 构建生产版本
pnpm build

# 启动服务
NODE_ENV=production node dist/index.js
```

### 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start dist/index.js --name "pentest-platform" \
  --env production \
  --max-memory-restart 1G

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs pentest-platform
```

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # 反向代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

### SSL 证书（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 数据库配置

### MySQL 8.0 初始化

```sql
-- 创建数据库
CREATE DATABASE pentest_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'pentest'@'%' IDENTIFIED BY 'your-strong-password';
GRANT ALL PRIVILEGES ON pentest_db.* TO 'pentest'@'%';
FLUSH PRIVILEGES;

-- 验证连接
mysql -u pentest -p pentest_db
```

### TiDB Cloud 配置

1. 在 TiDB Cloud 创建 Serverless 集群
2. 获取连接字符串（格式：`mysql://user:pass@host:4000/db?ssl=true`）
3. 填入 `DATABASE_URL` 环境变量

### 数据库备份

```bash
# 备份
mysqldump -u pentest -p pentest_db > backup_$(date +%Y%m%d).sql

# 恢复
mysql -u pentest -p pentest_db < backup_20260601.sql
```

---

## AI 配置

系统支持任何 OpenAI 兼容的 API，包括：

| 服务 | Base URL | 说明 |
|------|---------|------|
| OpenAI | `https://api.openai.com/v1` | 官方 API |
| Azure OpenAI | `https://xxx.openai.azure.com/` | 企业版 |
| DeepSeek | `https://api.deepseek.com/v1` | 国内可用 |
| Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 阿里云 |
| Ollama | `http://localhost:11434/v1` | 本地部署 |

在系统运行后，通过「系统设置 → AI 配置」页面配置，无需重启服务。

---

## 监控与运维

### 健康检查

```bash
# 检查服务状态
curl http://localhost:3000/api/trpc/auth.me?batch=1&input={}

# 检查数据库连接
curl http://localhost:3000/api/trpc/overview.stats?batch=1&input={}
```

### 日志位置

```
.manus-logs/
├── devserver.log      # 服务器启动日志
├── browserConsole.log # 前端控制台日志
├── networkRequests.log # HTTP 请求日志
└── sessionReplay.log  # 用户操作日志
```

### 常见问题

**Q: 数据库连接失败**
```bash
# 检查连接字符串格式
echo $DATABASE_URL
# 正确格式: mysql://user:pass@host:3306/db
```

**Q: AI 对话无响应**
- 检查系统设置中的 API Key 是否正确
- 确认 Base URL 可访问
- 查看服务器日志中的错误信息

**Q: 构建记录不更新**
- 构建使用 2 秒轮询，等待即可
- 检查数据库写入权限

---

*文档版本：v1.0.0 | 更新时间：2026-06-01*
