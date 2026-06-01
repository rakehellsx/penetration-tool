# 渗透测试工具开发系统

> **PenTest Dev Platform** — 面向红队/渗透测试工程师的一体化 AI 辅助工具开发平台

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 目录

- [系统简介](#系统简介)
- [系统架构](#系统架构)
- [技术栈](#技术栈)
- [功能模块](#功能模块)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [部署指南](#部署指南)
- [项目结构](#项目结构)
- [API 文档](#api-文档)
- [开发规范](#开发规范)

---

## 系统简介

渗透测试工具开发系统是一个集成 AI 能力的专业红队工具开发平台，旨在帮助安全研究人员高效开发、管理和测试渗透测试工具。系统提供从代码编写、载荷生成、免杀测试到报告生成的完整工作流，并通过 AI 大模型提供智能辅助能力。

**核心价值：**

- **AI 辅助开发**：集成 OpenAI 兼容 API，支持代码生成、代码审计、漏洞利用分析和渗透报告生成
- **全流程管理**：覆盖项目创建 → 代码编辑 → 载荷生成 → 构建测试 → 报告输出的完整研究流程
- **团队协作**：多用户权限管理（只读/编辑/管理员），项目成员协作
- **深度联动**：各模块之间深度集成，跨模块操作无缝衔接

> ⚠️ **免责声明**：本系统仅供授权的安全研究和渗透测试使用。使用者须遵守所在地区的法律法规，对未授权系统进行测试属于违法行为。

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端 (Browser)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  React 19   │  │  Monaco      │  │  Recharts 数据可视化    │  │
│  │  + Tailwind │  │  Editor      │  │  + RadialBar/Area/Line  │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────────┘  │
│         │                │                                        │
│  ┌──────▼────────────────▼──────────────────────────────────┐   │
│  │              tRPC Client (类型安全 RPC)                    │   │
│  │         + React Query (缓存/乐观更新)                      │   │
│  └──────────────────────┬────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTPS / WebSocket
┌─────────────────────────▼───────────────────────────────────────┐
│                      服务端 (Node.js / Express)                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   tRPC Router                            │    │
│  │  overview │ projects │ payloads │ templates │ builds     │    │
│  │  ai       │ settings │ audit                            │    │
│  └──────┬──────────┬──────────────────────────────────────┘    │
│         │          │                                             │
│  ┌──────▼──────┐  ┌▼─────────────────────────────────────┐    │
│  │  Drizzle ORM│  │         AI 层 (invokeLLM)             │    │
│  │  + MySQL2   │  │  OpenAI Compatible API                │    │
│  └──────┬──────┘  │  GPT-4o / Claude / DeepSeek / Qwen   │    │
│         │          └──────────────────────────────────────┘    │
└─────────┼───────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                      数据层                                       │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  TiDB / MySQL  │  │   S3 文件存储    │  │  系统设置 KV 存储 │  │
│  │  (13张业务表)  │  │  (构建产物/报告) │  │  (AI配置/偏好)   │  │
│  └────────────────┘  └─────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流说明

系统采用前后端分离架构，前端通过 tRPC 与后端进行类型安全的通信。所有数据库操作通过 Drizzle ORM 执行，AI 调用通过统一的 `invokeLLM` 封装层完成，支持运行时切换模型配置。文件存储（构建产物、导出报告）使用 S3 兼容存储服务。

---

## 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **前端框架** | React | 19.x | UI 渲染与状态管理 |
| **UI 组件** | shadcn/ui + Radix UI | latest | 无障碍组件库 |
| **样式** | Tailwind CSS | 4.x | 原子化 CSS |
| **代码编辑器** | Monaco Editor | 0.55.x | 多语言代码编辑 |
| **数据可视化** | Recharts | 2.x | 图表与数据展示 |
| **RPC 框架** | tRPC | 11.x | 类型安全 API |
| **数据查询** | React Query | 5.x | 缓存与异步状态 |
| **路由** | Wouter | 3.x | 客户端路由 |
| **后端框架** | Express | 4.x | HTTP 服务器 |
| **ORM** | Drizzle ORM | 0.44.x | 数据库操作 |
| **数据库** | TiDB / MySQL | 8.x | 持久化存储 |
| **运行时** | Node.js | 22.x | 服务端运行环境 |
| **语言** | TypeScript | 5.9 | 全栈类型安全 |
| **测试** | Vitest | 2.x | 单元测试 |
| **构建** | Vite | 7.x | 前端构建工具 |
| **AI 层** | OpenAI SDK | compatible | LLM 调用封装 |

---

## 功能模块

### 1. 统计概览 (`/overview`)

统计概览模块提供平台运行状态的全局视图，包含以下核心功能：

- **关键指标卡片**：实时展示项目总数、活跃项目数、构建成功率、载荷总数、AI 调用次数和 Token 消耗，使用 CountUp 动态数字动效
- **AI 调用趋势图**：双轴 AreaChart 展示近7天调用次数与 Token 消耗对比
- **载荷分布图表**：PieChart 展示载荷类型分布（Shellcode/EXE/DLL/Script），BarChart 展示平台架构分布
- **构建统计**：本周构建成功/失败柱状图与成功率趋势折线图
- **操作时间线**：最近操作记录，关联模块图标与状态颜色
- **快捷操作面板**：9宫格快捷入口，支持跨模块跳转

**数据来源**：所有统计数据通过 `trpc.overview.*` 路由从数据库实时查询，有数据时展示真实数据，无数据时展示演示数据。

### 2. 项目管理 (`/projects`)

项目管理模块支持渗透测试项目的全生命周期管理：

- **项目创建**：两步骤向导（基本信息 + 成员权限），支持名称、平台（Windows/Linux/macOS/跨平台）、语言（Go/C/C++/Python/Rust/PowerShell）、描述和标签配置
- **成员权限管理**：三级权限体系（只读/编辑/管理员），搜索添加成员，头像权限徽章可视化，项目卡片展示成员头像组
- **项目操作**：归档、删除、克隆、ZIP 导出/导入
- **构建成功率**：每个项目卡片展示构建成功率进度条
- **视图切换**：网格视图与列表视图切换
- **搜索过滤**：按状态、平台、语言多维度过滤

### 3. 代码编辑 (`/editor`)

代码编辑模块基于 Monaco Editor 提供专业级代码编辑体验：

- **项目文件树**：左侧显示当前项目名称（含平台/语言徽章）和文件树，支持项目切换下拉
- **多标签编辑**：多文件同时打开，标签页按语言着色
- **语法高亮**：支持 Go/C/C++/Python/Rust/PowerShell/Assembly/Makefile
- **AI 内联补全**：1.2秒防抖触发，幽灵文字装饰器预览，Tab 键接受，ESC 取消
- **右键 AI 菜单**：选中代码后右键触发 AI 操作（解释/重写/混淆/反混淆/安全审计）
- **代码片段库**：内置 Shellcode Loader、进程注入、AMSI Bypass 等常用片段，按分类过滤
- **内嵌终端**：模拟 Shell 环境，支持 go build/gcc 等构建命令
- **Git 面板**：变更文件列表、提交信息输入
- **文件持久化**：文件内容保存到数据库，跨会话保持

### 4. 载荷管理 (`/payloads`)

载荷管理模块提供完整的载荷生成与管理能力：

- **载荷生成向导**：4步骤向导（基本配置 → 监听配置 → 混淆加密 → 确认生成），支持 OS/架构/类型/监听类型/LHOST/LPORT/编码/混淆/加密全配置
- **免杀评分可视化**：RadialBar 环形图展示免杀率，风险等级色带（绿/黄/红）
- **载荷变形**：一键生成同功能不同特征的变形版本
- **版本历史对比**：免杀率趋势 AreaChart + 检出数 LineChart，版本列表时间线，参数差异对比（编码/混淆/加密/端口），改善百分比指示器
- **分类过滤**：按 OS、架构、类型、收藏多维度过滤
- **VirusTotal 集成**：支持配置 API Key 进行真实免杀评分

### 5. 模板管理 (`/templates`)

模板管理模块提供代码模板库与 MITRE ATT&CK 映射：

- **内置模板库**：5类内置模板（注入/提权/横向移动/持久化/信息收集），含完整代码骨架
- **MITRE ATT&CK 矩阵**：9个战术列 × 5个技术格的交互式热力图，红色标注有模板覆盖的技术，点击格子直接筛选对应模板，覆盖率圆环统计
- **模板参数化**：变量占位符 `{{PARAM_NAME}}` 替换，参数配置 Tab，实时预览结果
- **自定义模板**：创建向导支持代码编辑器、参数定义、MITRE 映射
- **搜索高亮**：关键词高亮匹配
- **版本历史**：模板修改记录追踪

**内置模板列表：**

| 模板名称 | 分类 | 平台 | MITRE ATT&CK |
|---------|------|------|-------------|
| Process Injection - Classic | 注入 | Windows/C | T1055 |
| Reverse Shell - PowerShell | 其他 | Windows/PS | T1059.001 |
| Privilege Escalation - Token | 提权 | Windows/C | T1134.001 |
| Persistence - Registry Run Key | 持久化 | Windows/C | T1547.001 |
| Lateral Movement - SMB PTH | 横向移动 | Windows/Python | T1550.002 |

### 6. 构建测试 (`/builds`)

构建测试模块提供多平台构建流水线管理：

- **项目选择器**：下拉选取项目管理中的真实项目，显示项目信息，按项目过滤构建记录
- **平台配置**：支持 Windows x64/x86、Linux x64/ARM64、macOS x64/ARM64
- **构建流水线**：4步骤自动执行（编译 → 混淆 → 打包 → 测试），实时状态可视化
- **构建日志**：步骤详情弹窗，完整日志输出
- **产物管理**：SHA256 哈希、文件大小、免杀检测结果
- **构建分析**：本周构建统计柱状图 + 成功率趋势折线图
- **自动轮询**：运行中的构建每2秒自动刷新状态

**构建流水线步骤：**

```
编译 (Compile) → 混淆 (Obfuscate) → 打包 (Package) → 测试 (Test)
```

### 7. 智能助手 (`/assistant`)

智能助手模块提供专业的 AI 对话能力：

- **真实 AI 对话**：调用 `invokeLLM` 接口，支持 GPT-4o/Claude/DeepSeek/Qwen 等模型，AI 配置与系统设置打通
- **5种专项模式**：通用对话/代码生成/代码审计/漏洞利用/报告生成，每种模式有专属 System Prompt
- **代码块提取**：AI 回复自动识别代码块，显示「保存代码到项目」按钮
- **保存到项目**：弹窗支持新建项目或选已有项目，可编辑文件名，多文件勾选，调用 `saveFile` API
- **AI 工具调用**：可直接触发新建载荷、搜索模板、执行构建等跨模块操作
- **多会话管理**：左侧会话列表，支持命名和归档
- **上下文感知**：自动注入当前打开的文件/项目信息
- **对话导出**：导出为 Markdown 文件
- **快捷提示词**：6种预设场景（Windows Shell/Log4Shell/代码审计/渗透报告/提权分析/横向移动）

### 8. 系统设置 (`/settings`)

系统设置模块提供平台配置管理：

- **AI 模型配置**：API Key（加密显示）、Base URL、模型选择（GPT-4o/Claude/DeepSeek/Qwen）、Temperature 滑块、Max Tokens、流式响应开关，配置持久化到数据库并被 AI 路由读取
- **编译环境**：本地工具链路径（GCC/Go/Rust），远程 SSH 构建服务器（主机/端口/用户名/密钥路径），连接测试
- **外部集成**：VirusTotal API Key 验证，代理设置（SOCKS5/HTTP/HTTPS）
- **编辑器偏好**：字体、主题、字体大小、自动换行、小地图、连字、自动保存
- **用户管理**：成员列表（在线状态、权限级别），邀请成员
- **审计日志**：所有操作记录，按模块颜色分类，含 AI 生成 Token 数
- **数据备份**：全量备份导出/恢复，审计日志 CSV 导出

---

## 快速开始

### 前置要求

- Node.js >= 22.0
- pnpm >= 10.0
- MySQL 8.0 或 TiDB

### 安装依赖

```bash
git clone https://github.com/rakehellsx/penetration-tool.git
cd penetration-tool
pnpm install
```

### 配置环境变量

复制环境变量模板并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写以下必要配置：

```env
DATABASE_URL=mysql://user:password@localhost:3306/pentest_db
JWT_SECRET=your-jwt-secret-key
VITE_APP_ID=your-app-id
BUILT_IN_FORGE_API_KEY=your-forge-api-key
BUILT_IN_FORGE_API_URL=https://api.example.com
```

### 数据库初始化

```bash
# 生成迁移文件
pnpm drizzle-kit generate

# 应用迁移
pnpm drizzle-kit migrate
```

### 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:3000` 即可使用系统。

### 运行测试

```bash
pnpm test
```

---

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DATABASE_URL` | ✅ | MySQL/TiDB 连接字符串 |
| `JWT_SECRET` | ✅ | Session Cookie 签名密钥 |
| `VITE_APP_ID` | ✅ | OAuth 应用 ID |
| `OAUTH_SERVER_URL` | ✅ | OAuth 后端服务地址 |
| `VITE_OAUTH_PORTAL_URL` | ✅ | OAuth 登录门户地址 |
| `BUILT_IN_FORGE_API_KEY` | ✅ | 内置 AI API 密钥（服务端） |
| `BUILT_IN_FORGE_API_URL` | ✅ | 内置 AI API 地址 |
| `VITE_FRONTEND_FORGE_API_KEY` | ✅ | 内置 AI API 密钥（前端） |
| `VITE_FRONTEND_FORGE_API_URL` | ✅ | 内置 AI API 地址（前端） |
| `OWNER_OPEN_ID` | ⬜ | 平台所有者 OpenID |
| `OWNER_NAME` | ⬜ | 平台所有者名称 |

> **注意**：AI 模型的 API Key 和模型选择可在系统运行后通过「系统设置 → AI 配置」页面动态配置，无需重启服务。

---

## 部署指南

### 方式一：Manus 平台部署（推荐）

本项目已针对 Manus 平台优化，支持一键部署：

1. 在 Manus 平台创建 Checkpoint
2. 点击管理界面右上角的 **Publish** 按钮
3. 系统自动完成构建和部署
4. 访问分配的域名（如 `pentestdev-zwtjag7j.manus.space`）

**Manus 平台特性支持：**
- 内置数据库（TiDB）
- 内置文件存储（S3 兼容）
- 内置 AI API（无需额外配置 OpenAI Key）
- 自动 HTTPS 和 CDN

### 方式二：Docker 部署

```bash
# 构建镜像
docker build -t pentest-dev-platform .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://..." \
  -e JWT_SECRET="..." \
  --name pentest-platform \
  pentest-dev-platform
```

### 方式三：手动部署（生产环境）

```bash
# 1. 构建前端
pnpm build

# 2. 启动生产服务
NODE_ENV=production node dist/index.js
```

**Nginx 反向代理配置：**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 数据库配置建议

生产环境建议使用 TiDB Cloud 或自建 MySQL 8.0+：

```sql
-- 创建数据库
CREATE DATABASE pentest_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'pentest'@'%' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON pentest_db.* TO 'pentest'@'%';
FLUSH PRIVILEGES;
```

---

## 项目结构

```
penetration-tool/
├── client/                    # 前端代码
│   ├── src/
│   │   ├── components/        # 可复用 UI 组件
│   │   │   ├── PentestLayout.tsx      # 主布局（侧边栏+顶栏）
│   │   │   ├── GlobalSearch.tsx       # ⌘K 全局搜索面板
│   │   │   ├── MitreMatrix.tsx        # MITRE ATT&CK 矩阵
│   │   │   ├── PayloadVersionHistory.tsx  # 载荷版本历史
│   │   │   ├── CreateTemplateDialog.tsx   # 模板创建弹窗
│   │   │   └── ui/                    # shadcn/ui 组件
│   │   ├── contexts/
│   │   │   ├── AppContext.tsx          # 全局状态（跨模块联动）
│   │   │   └── ThemeContext.tsx        # 主题管理
│   │   ├── pages/             # 页面组件（8大模块）
│   │   │   ├── Overview.tsx           # 统计概览
│   │   │   ├── Projects.tsx           # 项目管理
│   │   │   ├── CodeEditor.tsx         # 代码编辑器
│   │   │   ├── Payloads.tsx           # 载荷管理
│   │   │   ├── Templates.tsx          # 模板管理
│   │   │   ├── Builds.tsx             # 构建测试
│   │   │   ├── Assistant.tsx          # 智能助手
│   │   │   └── SystemSettings.tsx     # 系统设置
│   │   ├── lib/
│   │   │   └── trpc.ts                # tRPC 客户端
│   │   ├── App.tsx                    # 路由与布局
│   │   └── index.css                  # 全局样式
│   └── index.html
├── server/                    # 后端代码
│   ├── _core/                 # 框架核心（勿修改）
│   │   ├── llm.ts             # AI 调用封装
│   │   ├── context.ts         # tRPC 上下文
│   │   └── ...
│   ├── routers/               # tRPC 路由
│   │   ├── overview.ts        # 统计概览路由
│   │   ├── projects.ts        # 项目管理路由
│   │   ├── payloads.ts        # 载荷管理路由
│   │   ├── templates.ts       # 模板管理路由
│   │   ├── builds.ts          # 构建测试路由
│   │   ├── ai.ts              # AI 对话路由
│   │   ├── settings.ts        # 系统设置路由
│   │   └── audit.ts           # 审计日志路由
│   ├── db.ts                  # 数据库查询助手
│   ├── routers.ts             # 路由注册
│   └── pentest.test.ts        # 单元测试
├── drizzle/                   # 数据库
│   ├── schema.ts              # 数据库 Schema（13张表）
│   └── migrations/            # 迁移文件
├── shared/                    # 前后端共享类型
├── todo.md                    # 功能追踪
├── package.json
└── README.md
```

---

## API 文档

系统使用 tRPC 提供类型安全的 API，所有接口均通过 `/api/trpc` 路径访问。

### 主要路由

| 路由 | 类型 | 说明 |
|------|------|------|
| `overview.stats` | Query | 获取统计数据 |
| `overview.aiTrend` | Query | AI 使用趋势 |
| `overview.payloadStats` | Query | 载荷分布统计 |
| `projects.list` | Query | 项目列表（支持过滤） |
| `projects.create` | Mutation | 创建项目 |
| `projects.saveFile` | Mutation | 保存项目文件 |
| `payloads.list` | Query | 载荷列表 |
| `payloads.create` | Mutation | 生成载荷 |
| `payloads.morph` | Mutation | 载荷变形 |
| `templates.list` | Query | 模板列表 |
| `templates.seedBuiltin` | Mutation | 加载内置模板 |
| `builds.list` | Query | 构建记录 |
| `builds.create` | Mutation | 触发构建 |
| `ai.chat` | Mutation | AI 对话（真实 LLM） |
| `ai.codeOperation` | Mutation | 代码操作（解释/混淆等） |
| `ai.complete` | Mutation | AI 内联补全 |
| `settings.getAll` | Query | 获取所有设置 |
| `settings.setMany` | Mutation | 批量保存设置 |
| `audit.list` | Query | 审计日志 |

### 数据库表结构

系统包含 13 张业务表：

| 表名 | 说明 |
|------|------|
| `users` | 用户信息与角色 |
| `projects` | 渗透测试项目 |
| `project_members` | 项目成员权限 |
| `project_files` | 项目文件内容 |
| `payloads` | 载荷信息与检测结果 |
| `templates` | 代码模板 |
| `template_versions` | 模板版本历史 |
| `builds` | 构建记录与产物 |
| `ai_sessions` | AI 对话会话 |
| `ai_usage_stats` | AI 使用统计（按日） |
| `audit_logs` | 操作审计日志 |
| `system_settings` | 系统配置 KV 存储 |
| `code_snippets` | 代码片段库 |

---

## 开发规范

### 代码规范

- 使用 TypeScript 严格模式，禁止 `any` 类型（核心业务代码）
- 组件文件使用 PascalCase，工具函数使用 camelCase
- tRPC 路由文件按功能模块拆分，单文件不超过 150 行
- 数据库操作统一通过 Drizzle ORM，禁止原始 SQL（迁移除外）

### 提交规范

```
feat: 新功能
fix: Bug 修复
docs: 文档更新
style: 样式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具链
```

### 安全规范

- AI 接口调用必须在服务端执行，禁止在前端暴露 API Key
- 所有用户输入须经过 Zod Schema 验证
- 敏感配置（API Key）在前端显示时使用密码掩码
- 所有操作记录写入审计日志

---

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

*本系统仅供授权的安全研究和渗透测试使用，请遵守相关法律法规。*
