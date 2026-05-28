# 小贝壳 · 项目开发手册

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术架构](#2-技术架构)
- [3. 环境搭建](#3-环境搭建)
- [4. 项目结构详解](#4-项目结构详解)
- [5. 数据库设计](#5-数据库设计)
- [6. 认证系统](#6-认证系统)
- [7. 核心业务](#7-核心业务)
- [8. 推送通知](#8-推送通知)
- [9. 部署指南](#9-部署指南)
- [10. 常见修改](#10-常见修改)
- [11. 故障排查](#11-故障排查)

---

## 1. 项目概述

小贝壳是一个孕妇服药提醒 Web 应用，帮助准妈妈每天按时服用辅酶Q10和叶酸。

### 核心需求

| 需求 | 实现 |
|------|------|
| 每天 13:00-14:00 提醒服药 | Vercel Cron + Web Push |
| 展示药品剂量 | 辅酶Q10 1粒/次，叶酸 2粒/次 |
| 标记已服用 | 一键点击，写入数据库 |
| 多人查看状态 | 共用同一账号登录 |
| 零费用运行 | 全部使用 Vercel 免费额度 |

### 设计理念

- **极简**：2张表、3个页面、7个API接口
- **安全**：JWT 存 httpOnly Cookie，防 XSS
- **可靠**：事务写入，UPSERT 保证幂等
- **可维护**：代码量少，结构清晰

---

## 2. 技术架构

```
┌─────────────────────────────────────────────┐
│                    浏览器                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │  登录页   │  │  仪表盘   │  │ Service    │ │
│  │ /login   │  │/dashboard│  │ Worker     │ │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
└───────┼─────────────┼─────────────┼─────────┘
        │             │             │
   HTTPS│        HTTPS│        Push│
        │             │             │
┌───────┼─────────────┼─────────────┼─────────┐
│       ▼             ▼             ▼          │
│  ┌──────────────────────────────────────┐   │
│  │           Next.js Server              │   │
│  │  ┌────────┐  ┌──────┐  ┌──────────┐  │   │
│  │  │middleware│  │API   │  │SSR/SSG   │  │   │
│  │  │JWT验证  │  │Routes│  │Pages     │  │   │
│  │  └────────┘  └──┬───┘  └──────────┘  │   │
│  └─────────────────┼────────────────────┘   │
│                    │                         │
│  ┌─────────────────▼────────────────────┐   │
│  │        Vercel Postgres (Neon)         │   │
│  │  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │  users   │  │ medication_logs  │  │   │
│  │  └──────────┘  └──────────────────┘  │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │     Vercel Cron Job                   │   │
│  │     每天 UTC 5:00 (北京时间13:00)      │   │
│  │     触发 /api/notifications/send      │   │
│  └──────────────────────────────────────┘   │
│                     Vercel 平台               │
└─────────────────────────────────────────────┘
```

### 技术选型理由

| 技术 | 理由 |
|------|------|
| Next.js 16 App Router | Vercel 原生支持，免费部署，SSR/API 一体 |
| TypeScript | 类型安全，减少运行时错误 |
| Tailwind CSS | 原子化样式，无需单独 CSS 文件 |
| @vercel/postgres | 数据库直连，低延迟（实际已迁移到 Neon） |
| jose | JWT 库，支持 Edge Runtime |
| bcryptjs | 纯 JS 密码哈希，无需编译原生模块 |
| web-push | Web Push 通知，标准协议 |
| SWR | 客户端数据缓存和重新验证 |

### 为什么不选

- **Prisma/ORM**：杀鸡用牛刀，2张表用原生 SQL 更轻
- **NextAuth.js**：只做手机号登录，自定义更可控
- **Redis**：不需要缓存，数据量极小
- **微信小程序**：需审核备案，Web 更自由

---

## 3. 环境搭建

### 3.1 前置条件

- Node.js >= 18
- npm >= 9
- Vercel 账号（免费注册）
- GitHub 账号

### 3.2 克隆项目

```bash
git clone https://github.com/shawnzhangxiao/pillpal.git
cd pillpal
npm install
```

### 3.3 配置环境变量

复制模板并填写：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# JWT 签名密钥（自己随机生成，64位字符）
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# 数据库连接串（从 Vercel Storage 复制）
POSTGRES_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/db?sslmode=require

# VAPID 密钥对（Web Push 需要）
VAPID_PUBLIC_KEY=BCFQ4GC_...
VAPID_PRIVATE_KEY=hIqudey7...
NEXT_PUBLIC_VAPID_KEY=BCFQ4GC_...  # 与 PUBLIC_KEY 相同

# Cron 调用密钥（自己随机生成）
CRON_SECRET=abc123def456...
```

生成 VAPID 密钥（首次）：

```bash
npx web-push generate-vapid-keys
```

### 3.4 本地数据库（可选）

本地开发可以不用数据库——需要 Vercel 的 Neon 数据库或本地 PostgreSQL。

**选项A：使用远程 Neon 数据库**

直接填 `POSTGRES_URL` 为远程地址即可。

**选项B：本地 PostgreSQL**

```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# 创建数据库
createdb pillpal_local

# 设置连接串
# .env.local 中填写：
# POSTGRES_URL=postgresql://localhost:5432/pillpal_local
```

### 3.5 启动开发

```bash
npm run dev
```

访问 http://localhost:3000

---

## 4. 项目结构详解

```
pillpal/
├── .env.local                    # 环境变量（不提交到 Git）
├── .env.example                  # 环境变量模板
├── vercel.json                   # Vercel 配置（Cron 任务）
├── package.json                  # 依赖管理
├── tsconfig.json                 # TypeScript 配置
├── next.config.ts                # Next.js 配置
├── README.md                     # 项目说明
├── docs/
│   └── DEVELOPMENT.md            # 本文件：开发手册
├── public/
│   └── manifest.json             # PWA 配置
└── src/
    ├── middleware.ts              # 路由拦截 & JWT 验证
    ├── app/
    │   ├── layout.tsx            # 根布局（全局样式、AuthProvider）
    │   ├── page.tsx              # 首页（重定向到 /dashboard）
    │   ├── globals.css           # 全局样式 & 主题色
    │   │
    │   ├── (auth)/               # 认证路由组
    │   │   ├── layout.tsx        # 认证页布局
    │   │   ├── login/page.tsx    # 登录页
    │   │   └── register/page.tsx # 注册页
    │   │
    │   ├── (dashboard)/          # 仪表盘路由组
    │   │   ├── layout.tsx        # 仪表盘布局
    │   │   └── dashboard/
    │   │       └── page.tsx      # 核心仪表盘（唯一核心页面）
    │   │
    │   ├── api/                  # API 路由（后端逻辑）
    │   │   ├── auth/
    │   │   │   ├── login/route.ts     # POST 登录
    │   │   │   ├── register/route.ts  # POST 注册
    │   │   │   ├── logout/route.ts    # POST 登出
    │   │   │   └── me/route.ts        # GET 当前用户
    │   │   ├── today/route.ts         # GET 今日服药状态
    │   │   ├── take/route.ts          # POST 标记已服用
    │   │   ├── init-db/route.ts       # GET 初始化数据库
    │   │   └── notifications/
    │   │       ├── subscribe/route.ts # POST 保存推送订阅
    │   │       └── send/route.ts      # POST 发送推送（Cron调用）
    │   │
    │   └── service-worker/
    │       └── route.ts          # Service Worker 脚本
    │
    ├── lib/                      # 核心库
    │   ├── db.ts                 # 数据库连接 & 建表
    │   ├── auth.ts               # JWT 签发/验证 & 密码哈希
    │   ├── push.ts               # Web Push 发送
    │   └── types.ts              # TypeScript 类型定义
    │
    └── context/
        └── AuthContext.tsx        # React 认证上下文
```

### 关键文件职责

| 文件 | 职责 | 重要程度 |
|------|------|---------|
| `src/middleware.ts` | 每次请求前验证 JWT，注入用户ID | ⭐⭐⭐ |
| `src/lib/auth.ts` | JWT 创建/验证，密码哈希，Cookie 操作 | ⭐⭐⭐ |
| `src/lib/db.ts` | 数据库连接池，建表 SQL | ⭐⭐⭐ |
| `src/lib/push.ts` | Web Push 通知发送，VAPID 配置 | ⭐⭐ |
| `src/context/AuthContext.tsx` | 前端登录状态管理 | ⭐⭐ |
| `src/app/(dashboard)/dashboard/page.tsx` | 用户唯一交互页面 | ⭐⭐⭐ |
| `src/app/api/take/route.ts` | 核心写操作：标记服用 | ⭐⭐⭐ |
| `src/app/api/notifications/send/route.ts` | 定时推送逻辑 | ⭐⭐ |

---

## 5. 数据库设计

### 5.1 表结构

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  push_subscription JSONB,       -- Web Push 订阅信息
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 服药记录表
CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  coq10_taken BOOLEAN DEFAULT false,
  folic_acid_taken BOOLEAN DEFAULT false,
  coq10_time TIMESTAMPTZ,
  folic_acid_time TIMESTAMPTZ,
  UNIQUE(user_id, date)           -- 每人每天只有一条记录
);
```

### 5.2 设计说明

**为什么只用2张表？**

- 药品信息固定（辅酶Q10 + 叶酸），硬编码即可
- 不需要历史表——每天一条记录已足够
- 不需要设置表——剂量写死在代码中

**UNIQUE(user_id, date) 的作用？**

- 保证每人每天只有一条记录
- 配合 `INSERT ... ON CONFLICT DO UPDATE` 实现 UPSERT
- 防止重复点击创建多余记录

**为什么服药记录用布尔字段而不是日志表？**

- 药品种类少且固定（2种）
- 查询简单：一条记录包含当天全部状态
- 比 `(user_id, medication, date)` 的日志设计更直观

### 5.3 初始化数据库

两种方式：

**方式A：API 调用（推荐）**

```bash
# 本地
curl http://localhost:3000/api/init-db

# 生产
curl https://pillpal-ten.vercel.app/api/init-db
```

**方式B：手动执行 SQL**

连接到 Neon 数据库后，执行上述建表 SQL。

### 5.4 数据流

```
注册 → INSERT INTO users
登录 → SELECT FROM users WHERE phone = ?
      → 验证 bcrypt 密码
      → 签发 JWT → 写入 httpOnly Cookie

打开仪表盘 → GET /api/today
       → SELECT FROM medication_logs WHERE user_id = ? AND date = ?
       → 返回 { coq10: {taken, time, pills}, folic_acid: {...} }

标记服用 → POST /api/take { med: "coq10" }
     → INSERT INTO medication_logs ... ON CONFLICT DO NOTHING  # 确保行存在
     → UPDATE medication_logs SET coq10_taken = true, coq10_time = now()
     → 返回最新状态
```

---

## 6. 认证系统

### 6.1 认证流程

```
注册:
  用户输入手机号+密码
    → bcrypt 哈希密码 (12 rounds)
    → INSERT INTO users
    → 签发 JWT (HS256, 30天有效期)
    → 设置 httpOnly Cookie

登录:
  用户输入手机号+密码
    → 查询用户
    → bcrypt 比对密码
    → 签发 JWT → 设置 Cookie

后续请求:
  middleware 拦截
    → 从 Cookie 读取 JWT
    → 验证签名和有效期
    → 注入 x-user-id 和 x-user-phone 请求头
    → API route 从请求头读取用户信息
```

### 6.2 JWT 配置

```typescript
// src/lib/auth.ts
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// 签发
new SignJWT({ sub: userId, phone })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("30d")
  .sign(JWT_SECRET);

// 验证
const { payload } = await jwtVerify(token, JWT_SECRET);
```

### 6.3 Cookie 安全策略

```typescript
response.cookies.set("pillpal_token", token, {
  httpOnly: true,      // JS 无法读取，防 XSS
  secure: true,        // 仅 HTTPS（生产环境）
  sameSite: "lax",     // 允许同站导航携带
  path: "/",           // 全站可用
  maxAge: 30 * 86400,  // 30天
});
```

### 6.4 中间件路由保护

```typescript
// src/middleware.ts

// 公开路径：无需登录
const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

// 特殊路径：有独立鉴权
const CRON_PATH = "/api/notifications/send";   // 用 CRON_SECRET
const INIT_DB_PATH = "/api/init-db";             // 无需认证

// 其他所有路径：需要有效 JWT
//   - 页面 → 重定向到 /login
//   - API → 返回 401
```

---

## 7. 核心业务

### 7.1 获取今日状态

**GET /api/today**

```typescript
// 后端逻辑
const userId = request.headers.get("x-user-id");  // middleware 注入
const today = new Date().toISOString().slice(0, 10);  // "2026-05-28"

const result = await sql`
  SELECT coq10_taken, folic_acid_taken, coq10_time, folic_acid_time
  FROM medication_logs
  WHERE user_id = ${userId} AND date = ${today}
`;

// 返回
{
  coq10:   { taken: false, time: null, pills: 1 },
  folic_acid: { taken: true,  time: "2026-05-28T05:15:00Z", pills: 2 }
}
```

### 7.2 标记已服用

**POST /api/take** body: `{ med: "coq10" | "folic_acid" }`

```typescript
// 1. 确保今天的行存在（幂等）
await sql`
  INSERT INTO medication_logs (user_id, date)
  VALUES (${userId}, ${today})
  ON CONFLICT (user_id, date) DO NOTHING
`;

// 2. 更新对应药品状态
if (med === "coq10") {
  await sql`
    UPDATE medication_logs
    SET coq10_taken = true, coq10_time = ${now}
    WHERE user_id = ${userId} AND date = ${today}
  `;
}

// 3. 返回最新状态
```

**幂等性保证**：
- 重复点击不会出错
- `ON CONFLICT DO NOTHING` 确保行只插入一次
- `UPDATE` 天然幂等

### 7.3 药品配置

药品信息硬编码在两个位置：

**前端（显示用）**：`src/app/(dashboard)/dashboard/page.tsx`
```tsx
<MedCard name="辅酶Q10" subtitle="守护细胞能量" pills={1} ... />
<MedCard name="叶酸"   subtitle="宝宝神经发育" pills={2} ... />
```

**后端（记录用）**：`src/app/api/take/route.ts`
```typescript
if (med === "coq10") { /* 更新 coq10_taken */ }
if (med === "folic_acid") { /* 更新 folic_acid_taken */ }
```

**修改药品**：需同时改前端和后端。

### 7.4 多人共用

同一手机号登录，任何人都能看到最新服药状态。

实现的原理很简单：
- 数据库按 `user_id` 查询状态
- 不同设备用同一个账号登录 = 同一个 `user_id`
- 夫人标记服用 → 数据库更新 → 你刷新页面即可看到

---

## 8. 推送通知

### 8.1 整体流程

```
1. 用户点击「开启服药提醒」
2. 浏览器请求通知权限
3. 注册 Service Worker
4. 订阅 Push 服务 → 获得 subscription 对象
5. 发送 subscription 到服务端 → 存入 users.push_subscription

6. 每天 UTC 5:00 Vercel Cron 触发 /api/notifications/send
7. 查询 push_subscription IS NOT NULL 且当日未服药的用户
8. 对每个用户调用 web-push 发送通知
9. 用户的 Service Worker 接收通知 → 弹出系统级通知
10. 用户点击通知 → 打开 /dashboard
```

### 8.2 Service Worker

位于 `src/app/service-worker/route.ts`，动态生成 JS 代码：

```javascript
self.addEventListener('push', (event) => {
  // 接收推送，弹出系统通知
  event.waitUntil(
    self.registration.showNotification('服药提醒', {
      body: '该吃药了：辅酶Q10(1粒)、叶酸(2粒)',
      icon: '/icon-192.png',
      requireInteraction: true,  // 用户必须手动关闭
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  // 点击通知 → 打开/聚焦 /dashboard
  event.notification.close();
  clients.openWindow('/dashboard');
});
```

### 8.3 VAPID 密钥

Web Push 需要 VAPID 密钥对来标识服务端身份：

```bash
npx web-push generate-vapid-keys
```

输出：
```
Public Key:  BCFQ4GC_...  (65字节 Base64)
Private Key: hIqudey7...  (32字节 Base64)
```

公钥暴露在前端（`NEXT_PUBLIC_VAPID_KEY`），私钥仅存于环境变量。

### 8.4 Cron Job

`vercel.json` 配置：

```json
{
  "crons": [
    {
      "path": "/api/notifications/send",
      "schedule": "0 5 * * *"
    }
  ]
}
```

- `0 5 * * *` = 每天 UTC 5:00 = 北京时间 13:00
- Vercel 免费计划支持 1 个 Cron Job
- 如需多次提醒，可在 `/api/notifications/send` 内部循环处理

### 8.5 通知准确性

**13:00 精确触发吗？**

- Vercel Cron 在设定时间 ± 2分钟内触发
- 只有已订阅且未服药的用户才会收到通知
- 如果 13:00 已服药，不会收到通知

**如果用户没开通知？**

- 仪表盘页面有 **时间窗口横幅**（13:00-14:00 显示暖黄色提醒条）
- 这是纯前端判断，不需要推送

---

## 9. 部署指南

### 9.1 Vercel 部署（推荐）

#### 方式A：Git 自动部署

1. 推送代码到 GitHub
2. 在 vercel.com 导入仓库
3. 配置环境变量
4. 每次 `git push` 自动部署

#### 方式B：CLI 手动部署

```bash
npm install -g vercel
vercel login
vercel --prod
```

### 9.2 数据库创建

1. 在 Vercel 项目 → Storage → 创建 Neon Postgres
2. `POSTGRES_URL` 自动注入环境变量
3. 访问 `/api/init-db` 初始化表

### 9.3 环境变量清单

部署时必须设置的全部变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `JWT_SECRET` | JWT 签名密钥 | 随机64字符 |
| `POSTGRES_URL` | 数据库连接（Neon 自动提供） | `postgresql://...` |
| `VAPID_PUBLIC_KEY` | Web Push 公钥 | `BCFQ4GC_...` |
| `VAPID_PRIVATE_KEY` | Web Push 私钥 | `hIqudey7...` |
| `NEXT_PUBLIC_VAPID_KEY` | 客户端 Web Push 公钥 | 同 VAPID_PUBLIC_KEY |
| `CRON_SECRET` | Cron 调用密钥 | 随机32字符 |

### 9.4 验证部署

```bash
# 1. 检查首页
curl -I https://你的域名

# 2. 初始化数据库
curl https://你的域名/api/init-db
# 应返回 {"success":true}

# 3. 测试注册
curl -X POST https://你的域名/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"123456"}'

# 4. 测试 Cron（需要 CRON_SECRET）
curl -X POST https://你的域名/api/notifications/send \
  -H "Authorization: Bearer 你的CRON_SECRET"
```

---

## 10. 常见修改

### 10.1 修改提醒时间

改两个地方：

**1. `vercel.json` — Cron 调度时间**

```json
{
  "crons": [
    {
      "path": "/api/notifications/send",
      "schedule": "0 6 * * *"    // UTC 6:00 = 北京时间 14:00
    }
  ]
}
```

UTC 和北京时间的换算：北京时间 = UTC + 8

**2. `src/app/(dashboard)/dashboard/page.tsx` — 前端时间窗口**

```tsx
// 找到这行：
setInWindow(h >= 13 && h < 14);
// 改为：
setInWindow(h >= 14 && h < 15);
```

### 10.2 修改药品剂量

**前端显示**：`src/app/(dashboard)/dashboard/page.tsx`

```tsx
// 找到 MedCard 的 pills 属性
<MedCard name="辅酶Q10" pills={1} ... />   // 改这里的数字
<MedCard name="叶酸"   pills={2} ... />   // 改这里的数字
```

**后端不需要改**——数据库只记录「是否已服用」，不记录剂量。

### 10.3 添加新药品

如果将来需要增加到3种药，需要改：

**1. 数据库加字段**

`src/lib/db.ts` 建表 SQL 中添加新字段：

```sql
new_drug_taken BOOLEAN DEFAULT false,
new_drug_time TIMESTAMPTZ,
```

**2. API 加逻辑**

`src/app/api/today/route.ts` 返回新增药品状态
`src/app/api/take/route.ts` 处理新增药品的标记

**3. 前端加卡片**

`src/app/(dashboard)/dashboard/page.tsx` 添加第三个 `<MedCard>`

### 10.4 修改 UI 主题色

全局颜色变量在 `src/app/globals.css`：

```css
:root {
  --ocean: #3B7CB9;          /* 海洋蓝 - 主色调 */
  --ocean-light: #7BB3E0;    /* 浅海蓝 */
  --ocean-deep: #2A5F8F;     /* 深海蓝 */
  --sand: #F5E0C3;           /* 沙滩色 */
  --sand-light: #FBF3E8;     /* 浅沙色 */
  --sunshine: #FFB84D;       /* 阳光橙 */
  --sunshine-light: #FFF3E0; /* 浅阳光 */
  --shell: #F7D6E0;          /* 贝壳粉 */
  --shell-light: #FDF0F4;    /* 浅贝壳粉 */
  --tennis: #A8D8A8;         /* 网球绿 */
}
```

配色会全局生效。

### 10.5 修改登录方式

当前是手机号+密码。如果要改成验证码登录：

1. 接入短信服务商（阿里云短信 / 腾讯云短信）
2. 修改注册流程：发送验证码 → 验证 → 创建用户
3. 修改登录流程：验证码验证通过 → 签发 JWT

### 10.6 添加服药历史页面

如果需要查看历史记录：

1. 新建 `src/app/(dashboard)/history/page.tsx`
2. 新建 `src/app/api/history/route.ts`：查询 `medication_logs` 按月汇总
3. 在 dashboard 页面添加导航链接

---

## 11. 故障排查

### 11.1 数据库连接失败

**错误**：`VercelPostgresError: missing_connection_string`

**解决**：
- 检查 Vercel 环境变量中是否有 `POSTGRES_URL`
- 确认 Neon 数据库已连接到此项目
- 重新部署以应用环境变量

### 11.2 登录后又被踢回登录页

**原因**：JWT 验证失败

**排查**：
- JWT_SECRET 是否设置？
- Cookie 是否被浏览器阻止？（Safari 隐私模式可能阻止）
- 检查 middleware.ts 中的验证逻辑

### 11.3 推送通知收不到

**排查顺序**：

1. **浏览器是否支持**：Chrome/Firefox/Edge 支持；iOS Safari 16.4+ 支持
2. **通知权限是否开启**：浏览器设置 → 网站设置 → 通知
3. **Service Worker 是否注册**：开发者工具 → Application → Service Workers
4. **订阅是否保存**：数据库 `users.push_subscription` 字段是否有值
5. **VAPID 密钥是否正确**：公钥和私钥要配对
6. **Cron 是否触发**：检查 Vercel 部署日志

**手动测试推送**：

```bash
curl -X POST https://你的域名/api/notifications/send \
  -H "Authorization: Bearer 你的CRON_SECRET"
```

### 11.4 构建失败

**常见原因**：

- TypeScript 类型错误：运行 `npx tsc --noEmit` 检查
- 环境变量缺失：检查 `NEXT_PUBLIC_*` 前缀的变量
- 依赖版本冲突：删除 `node_modules` 和 `package-lock.json` 重装

### 11.5 页面空白

**排查**：
- 浏览器控制台是否有 JavaScript 错误？
- `AuthContext` 是否正确包裹？
- API 是否返回了正确的数据？

---

## 附录

### A. 全部 API 接口速查

| 方法 | 路径 | 认证 | Body | 返回 |
|------|------|------|------|------|
| POST | `/api/auth/register` | 无 | `{phone, password}` | `{success}` |
| POST | `/api/auth/login` | 无 | `{phone, password}` | `{success, phone}` |
| POST | `/api/auth/logout` | Cookie | - | `{success}` |
| GET | `/api/auth/me` | Cookie | - | `{id, phone}` |
| GET | `/api/today` | Cookie | - | `{coq10, folic_acid}` |
| POST | `/api/take` | Cookie | `{med}` | `{coq10, folic_acid}` |
| GET | `/api/init-db` | 无 | - | `{success}` |
| POST | `/api/notifications/subscribe` | Cookie | subscription对象 | `{success}` |
| POST | `/api/notifications/send` | CRON_SECRET | - | `{sent, failed}` |

### B. 依赖清单

| 包名 | 版本 | 用途 |
|------|------|------|
| next | ^16 | 全栈框架 |
| react | ^19 | UI 库 |
| @vercel/postgres | ^0.10 | 数据库驱动 |
| jose | ^6 | JWT 处理 |
| bcryptjs | ^3 | 密码哈希 |
| web-push | ^3 | 推送通知 |
| swr | ^2 | 客户端数据请求 |
| tailwindcss | ^4 | CSS 工具 |

### C. 费用估算

| 服务 | 免费额度 | 本项目用量 | 费用 |
|------|---------|-----------|------|
| Vercel 部署 | 100 GB 带宽/月 | < 1 GB | 免费 |
| Neon Postgres | 0.5 GB 存储 | < 10 MB | 免费 |
| Vercel Cron | 1 个任务 | 1 个 | 免费 |
| 域名 | 可选 | vercel.app 子域名 | 免费 |
| **合计** | | | **¥0/月** |

---

> 最后更新：2026-05-28
