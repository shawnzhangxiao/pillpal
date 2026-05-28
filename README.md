# 小贝壳 · 每日服药提醒

为迎接小公主的到来，帮助准妈妈每天按时服用辅酶Q10和叶酸的小工具。

## 技术栈

- **前端**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Vercel Postgres (Neon)
- **部署**: Vercel (免费)
- **通知**: Web Push API + Vercel Cron Job

## 功能

- 每日 13:00 浏览器推送服药提醒
- 一键标记辅酶Q10（1粒/次）和叶酸（2粒/次）
- 同一账号多人登录，家人可查看服药状态
- PWA 支持，可添加到手机主屏幕

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/shawnzhangxiao/pillpal.git
cd pillpal
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
JWT_SECRET=你的随机密钥
POSTGRES_URL=你的数据库连接字符串
VAPID_PUBLIC_KEY=Web Push 公钥
VAPID_PRIVATE_KEY=Web Push 私钥
NEXT_PUBLIC_VAPID_KEY=同 VAPID_PUBLIC_KEY
CRON_SECRET=Cron 调用密钥
```

生成 VAPID 密钥：

```bash
npx web-push generate-vapid-keys
```

### 3. 初始化数据库

```bash
# 本地开发
curl http://localhost:3000/api/init-db

# 生产环境
curl https://你的域名/api/init-db
```

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 部署到 Vercel

```bash
npx vercel --prod
```

## 项目结构

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx        # 登录页
│   │   └── register/page.tsx     # 注册页
│   ├── (dashboard)/
│   │   └── dashboard/page.tsx    # 核心仪表盘
│   ├── api/
│   │   ├── auth/                 # 认证接口
│   │   ├── today/route.ts        # 获取今日服药状态
│   │   ├── take/route.ts         # 标记已服用
│   │   ├── init-db/route.ts      # 初始化数据库
│   │   └── notifications/        # 通知订阅 & 推送
│   └── service-worker/route.ts   # Service Worker
├── lib/
│   ├── db.ts                     # 数据库连接
│   ├── auth.ts                   # JWT 认证
│   ├── push.ts                   # Web Push
│   └── types.ts                  # 类型定义
└── middleware.ts                  # 路由保护
```

## 数据库表

### users
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| phone | VARCHAR(20) | 手机号（唯一） |
| password_hash | VARCHAR(255) | 密码哈希 |
| push_subscription | JSONB | Web Push 订阅信息 |

### medication_logs
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| date | DATE | 日期 |
| coq10_taken | BOOLEAN | 辅酶Q10是否服用 |
| folic_acid_taken | BOOLEAN | 叶酸是否服用 |
| coq10_time | TIMESTAMPTZ | 辅酶Q10服用时间 |
| folic_acid_time | TIMESTAMPTZ | 叶酸服用时间 |

## 药品说明

| 药品 | 每次用量 | 作用 |
|------|---------|------|
| 辅酶Q10 | 1粒 | 守护细胞能量，支持孕期健康 |
| 叶酸 | 2粒 | 预防神经管缺陷，促进宝宝发育 |

## 提醒机制

- 每天 UTC 5:00（北京时间 13:00）Vercel Cron 触发
- 查询当日未服药的用户
- 通过 Web Push 发送浏览器通知
- 用户点击通知跳转到服药页面

## License

MIT
