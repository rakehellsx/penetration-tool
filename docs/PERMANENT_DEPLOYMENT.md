# Penetration Tool 永久网站部署说明

本文档说明如何将当前临时运行的项目部署为**长期可访问的网站**。由于本项目不仅是静态前端，还依赖 Node.js 后端、OpenCode 本地服务、DeepSeek API 以及 Go 交叉编译工具链，因此推荐部署到一台可长期运行的 Linux 服务器或支持 Docker 的云主机。

## 部署方式对比

| 方式 | 适用场景 | 优点 | 代价与限制 |
|---|---|---|---|
| Docker Compose 部署 | 推荐。适合有云服务器、可安装 Docker 的环境 | 一条命令构建运行，OpenCode、Node 服务、Go 编译环境都在容器内，便于迁移和重启 | 需要一台长期在线服务器；需要自行配置域名解析与 HTTPS |
| Ubuntu + systemd 部署 | 适合已有 Ubuntu 服务器，希望直接运行源码 | 便于调试，日志与文件路径清晰，可用 systemd 保活 | 需要手动安装 Node、pnpm、Go、OpenCode、Nginx |
| 纯静态托管平台 | 不推荐 | 前端托管简单 | 不能运行本项目后端、OpenCode 服务和 Go 编译能力，无法满足智能助手与自动编译需求 |

## 方案 A：Docker Compose 部署

首先复制环境变量模板，并填写真实密钥。

```bash
cp .env.production.example .env.production
nano .env.production
```

至少需要配置以下字段。

| 字段 | 示例 | 说明 |
|---|---|---|
| `PORT` | `3000` | 容器内站点端口 |
| `OPENCODE_API_URL` | `http://127.0.0.1:4096` | OpenCode 服务地址，容器内保持默认即可 |
| `DEEPSEEK_API_URL` | `https://api.deepseek.com/chat/completions` | DeepSeek Chat Completions 接口 |
| `DEEPSEEK_API_KEY` | `sk-...` | DeepSeek API Key |

然后启动服务。

```bash
docker compose up -d --build
```

检查状态和日志。

```bash
docker compose ps
docker compose logs -f penetration-tool
```

站点默认监听服务器的 `3000` 端口。生产环境建议使用 Nginx 或云厂商网关将域名反代到 `127.0.0.1:3000`。

## 方案 B：Ubuntu + systemd 部署

在服务器上安装基础依赖后，将项目放到 `/opt/penetration-tool`。

```bash
sudo mkdir -p /opt/penetration-tool
sudo chown -R ubuntu:ubuntu /opt/penetration-tool
rsync -av --exclude node_modules --exclude dist ./ /opt/penetration-tool/
cd /opt/penetration-tool
```

安装依赖并构建。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run build
curl -fsSL https://opencode.ai/install | bash
```

配置环境变量。

```bash
cp .env.production.example .env.production
nano .env.production
```

安装 systemd 服务。

```bash
sudo cp deploy/penetration-tool.service /etc/systemd/system/penetration-tool.service
sudo systemctl daemon-reload
sudo systemctl enable --now penetration-tool
sudo systemctl status penetration-tool
```

查看日志。

```bash
journalctl -u penetration-tool -f
# 或查看项目 logs 目录
 tail -f /opt/penetration-tool/logs/app.log /opt/penetration-tool/logs/opencode.log
```

## 绑定域名与 HTTPS

如果使用 Nginx，可以复制项目中的示例配置。

```bash
sudo cp deploy/nginx.penetration-tool.conf /etc/nginx/sites-available/penetration-tool
sudo ln -s /etc/nginx/sites-available/penetration-tool /etc/nginx/sites-enabled/penetration-tool
sudo nano /etc/nginx/sites-available/penetration-tool
sudo nginx -t
sudo systemctl reload nginx
```

请将 `server_name example.com;` 改成你的真实域名，并将域名 A 记录解析到服务器公网 IP。HTTPS 可使用 Certbot 或云厂商证书服务配置。

## 重要说明

当前沙盒暴露出来的访问地址属于**临时调试地址**，并不等同于长期网站。要实现真正的永久访问，需要将本项目部署到长期在线的服务器、云主机或支持 Docker 的托管平台。项目已经补充了 `Dockerfile`、`docker-compose.yml`、`.env.production.example`、`scripts/production-start.sh`、`deploy/penetration-tool.service` 和 Nginx 示例配置，可以直接迁移部署。
