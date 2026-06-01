# 系统架构设计文档

> 渗透测试工具开发系统 — 架构设计说明

---

## 1. 整体架构概览

本系统采用**全栈 TypeScript 单体应用**架构，前后端共享同一代码仓库，通过 tRPC 实现端到端类型安全。服务端使用 Express 框架，前端使用 React 19，数据库使用 MySQL/TiDB，AI 能力通过统一的 `invokeLLM` 封装层接入。

### 1.1 架构分层

```
┌──────────────────────────────────────────────────────────────────┐
│                     表现层 (Presentation Layer)                   │
│                                                                   │
│  React 19 + Tailwind CSS 4 + shadcn/ui + Monaco Editor           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Overview │ │ Projects │ │  Editor  │ │    Assistant     │   │
│  │ Payloads │ │Templates │ │  Builds  │ │     Settings     │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│                                                                   │
│  全局状态: AppContext (跨模块联动) + React Query (服务端状态)      │
└─────────────────────────┬────────────────────────────────────────┘
                          │ tRPC (类型安全 HTTP RPC)
┌─────────────────────────▼────────────────────────────────────────┐
│                     应用层 (Application Layer)                    │
│                                                                   │
│  Express 4 + tRPC 11 Server                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    tRPC Router                           │    │
│  │  overview | projects | payloads | templates | builds    │    │
│  │  ai       | settings | audit                           │    │
│  └────────────────────┬────────────────────────────────────┘    │
│                       │                                           │
│  ┌────────────────────▼────────────────────────────────────┐    │
│  │              业务逻辑层 (Business Logic)                  │    │
│  │  - 项目管理：CRUD、成员权限、文件存储                    │    │
│  │  - 载荷管理：生成参数、变形、免杀评分                    │    │
│  │  - 构建系统：流水线模拟、产物管理                        │    │
│  │  - AI 层：模型调用、Token 统计、审计记录                 │    │
│  └────────────────────┬────────────────────────────────────┘    │
└───────────────────────┼──────────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────────┐
│                     数据层 (Data Layer)                           │
│                                                                   │
│  ┌──────────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  Drizzle ORM     │  │  S3 Storage   │  │  System KV Store │  │
│  │  TiDB / MySQL    │  │  (文件/产物)   │  │  (配置/设置)     │  │
│  │  13 张业务表      │  │               │  │                  │  │
│  └──────────────────┘  └───────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 跨模块联动机制

系统通过 `AppContext` 实现跨模块状态共享和操作触发：

```typescript
// 核心联动接口
interface CrossModuleAction {
  type: "open_project" | "create_payload" | "insert_template" 
      | "trigger_build" | "open_assistant" | "search_templates" | "view_payload";
  payload?: Record<string, unknown>;
}

// 使用示例：智能助手触发构建
dispatchAction({ type: "trigger_build", payload: { projectId: 101 } });
// → 自动跳转到构建模块 → 触发构建流水线
```

---

## 2. 前端架构

### 2.1 目录结构

```
client/src/
├── components/          # 可复用组件
│   ├── PentestLayout    # 主布局（侧边栏 + 顶栏）
│   ├── GlobalSearch     # ⌘K 全局搜索
│   ├── MitreMatrix      # ATT&CK 矩阵可视化
│   └── ui/              # shadcn/ui 基础组件
├── contexts/
│   └── AppContext        # 全局状态与跨模块联动
├── pages/               # 8大功能模块页面
├── lib/
│   └── trpc.ts          # tRPC 客户端配置
└── index.css            # 全局样式（CSS 变量体系）
```

### 2.2 状态管理策略

| 状态类型 | 管理方式 | 说明 |
|---------|---------|------|
| 服务端数据 | React Query (via tRPC) | 自动缓存、失效、重试 |
| 跨模块状态 | AppContext | 当前模块、活跃项目、跨模块操作 |
| 表单状态 | React useState | 局部表单数据 |
| 编辑器状态 | Monaco Editor API | 文件内容、光标位置 |

### 2.3 样式系统

系统使用 CSS 变量 + Tailwind CSS 4 构建设计系统：

```css
:root {
  /* 品牌色：深靛蓝 */
  --primary: oklch(0.46 0.20 264);
  
  /* 侧边栏深色区域 */
  --sidebar-bg: oklch(0.11 0.022 264);
  
  /* 代码编辑器深色区域 */
  --editor-bg: oklch(0.14 0.022 264);
  
  /* 渐变系统 */
  --grad-primary: linear-gradient(135deg, oklch(0.46 0.20 264), oklch(0.52 0.22 290));
}
```

**视觉对比设计**：白色管理区（背景 `oklch(0.985 0.002 260)`）与深色代码编辑区（背景 `#13141f`）形成强烈视觉对比，提升专业感。

---

## 3. 后端架构

### 3.1 tRPC 路由设计

```typescript
// 路由树结构
appRouter = {
  auth: { me, logout },
  overview: { stats, aiTrend, payloadStats, recentActivity, recentProjects },
  projects: { list, get, create, update, archive, delete, clone, linkPayload, getFiles, saveFile, deleteFile },
  payloads: { list, get, create, update, delete, morph },
  templates: { list, get, create, update, delete, getVersions, seedBuiltin },
  builds: { list, get, create, cancel, delete },
  ai: { listSessions, createSession, updateSession, deleteSession, chat, codeOperation, generateExploit, complete },
  settings: { getAll, get, set, setMany },
  audit: { list },
}
```

### 3.2 AI 层设计

AI 层通过统一的 `invokeLLM` 函数封装，支持运行时模型切换：

```typescript
// AI 配置读取（运行时从数据库读取）
async function getAiConfig(db) {
  const settings = await db.select().from(systemSettings);
  return {
    model: get("ai.model"),        // 模型名称
    temperature: get("ai.temperature"),  // 温度参数
    maxTokens: get("ai.maxTokens"),      // 最大 Token 数
  };
}

// 调用时注入配置
const response = await invokeLLM({ messages, ...aiConfig });
```

**AI 使用统计**：每次 AI 调用后自动更新 `ai_usage_stats` 表（按日聚合），用于统计概览的趋势图。

### 3.3 构建系统设计

构建流水线通过异步模拟实现，支持真实编译环境接入：

```
触发构建 → 创建构建记录(pending)
         → 异步执行流水线:
           compile  → 随机成功/失败
           obfuscate → 随机成功/失败  
           package  → 随机成功/失败
           test     → 随机成功/失败
         → 更新构建状态(success/failed)
         → 计算免杀评分(模拟)
```

生产环境可替换为真实编译调用（`go build`/`gcc`/`cargo build`）。

---

## 4. 数据库设计

### 4.1 ER 关系图

```
users ──────────────────────────────────────────────────────┐
  │                                                          │
  ├──< projects >──< project_members >──< users             │
  │        │                                                 │
  │        ├──< project_files                               │
  │        ├──< builds                                      │
  │        └──< payloads                                    │
  │                                                         │
  ├──< ai_sessions                                          │
  ├──< ai_usage_stats                                       │
  ├──< audit_logs                                           │
  └──< system_settings                                      │
                                                            │
templates ──< template_versions                             │
code_snippets                                               │
```

### 4.2 核心表说明

**projects 表**：存储项目基础信息，`linkedPayloadIds` 和 `linkedTemplateIds` 使用 JSON 列存储关联 ID 数组，`buildConfig` 存储构建配置。

**payloads 表**：存储载荷生成参数和检测结果，`parentId` 支持变形版本追踪，`generationParams` 存储完整生成参数快照。

**builds 表**：存储构建记录，`pipeline` JSON 列记录每个步骤的状态和日志，`artifactKey` 关联 S3 存储中的产物文件。

**ai_sessions 表**：存储 AI 对话历史，`messages` JSON 列存储完整消息列表，`contextProjectId` 关联当前上下文项目。

---

## 5. 安全设计

### 5.1 认证与授权

系统使用 Manus OAuth 2.0 进行用户认证，Session Cookie 使用 JWT 签名，服务端通过 `protectedProcedure` 验证用户身份。

### 5.2 数据安全

- API Key 等敏感配置存储在 `system_settings` 表，前端展示时使用密码掩码
- 所有用户输入通过 Zod Schema 验证，防止注入攻击
- AI 接口调用仅在服务端执行，API Key 不暴露给前端

### 5.3 审计追踪

所有关键操作（创建项目/生成载荷/AI 调用/触发构建）写入 `audit_logs` 表，记录操作用户、时间、资源和详情，支持操作回溯。

---

## 6. 性能优化

### 6.1 前端优化

- React Query 缓存服务端数据，减少重复请求
- Monaco Editor 按需加载语言包
- 图表组件使用 `ResponsiveContainer` 响应式渲染
- 动画使用 CSS transform/opacity，避免布局重排

### 6.2 后端优化

- 数据库查询使用 Drizzle ORM 的懒加载机制
- AI 补全使用 1.2 秒防抖，避免频繁调用
- 构建状态使用 2 秒轮询，运行中构建才触发

---

*文档版本：v1.0.0 | 更新时间：2026-06-01*
