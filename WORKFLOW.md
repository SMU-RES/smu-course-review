# 海大选课通 (SMU) — 工作流程

## 项目信息

| 项目 | 值 |
|------|---|
| GitHub 组织 | [smu-res](https://github.com/smu-res) |
| 仓库名 | smu-course-review |
| 许可证 | GPL-3.0 |
| Cloudflare 账号 | 202310232052@stu.shmtu.edu.cn |
| Cloudflare Account ID | bf26515b9f79d9beb42b359ee6bb67be |
| D1 数据库名 | ouc-course-review (已创建，保留原名) |
| D1 database_id | 58a90fef-00f8-4a84-b382-d38b343cd53d |
| D1 区域 | APAC |

---

## Phase 0 — 环境搭建 ✅

| 步骤 | 状态 | 内容 |
|------|------|------|
| 0.1 GitHub 组织 | ✅ | 创建 `smu-res` 组织 |
| 0.2 Cloudflare 账号 | ✅ | 新账号注册，API Token 创建 |
| 0.3 Wrangler CLI 登录 | ✅ | 通过 `CLOUDFLARE_API_TOKEN` 环境变量认证 |
| 0.4 D1 数据库创建 | ✅ | `ouc-course-review` 已创建，APAC 区域 |
| 0.5 本地 Git 仓库 | ✅ | 初始化 git，GPL-3.0，.gitignore |
| 0.6 项目骨架 | ✅ | wrangler.toml, package.json, tsconfig 等 |

---

## Phase 1 — 数据准备 ✅

### 1.1 数据清洗
- 输入: `data/2025-2026-2.xls`（上海海事大学教务系统导出，2675 条课程数据）
- Python 脚本清洗:
  - 提取院系列表（41 个）→ departments
  - 提取教师列表（去重，含工号）→ teachers
  - 标准化课程字段 → courses
- 输出: `db/schema.sql` + `db/seed.sql`

### 1.2 数据库 Schema

10 张表：

```
departments (院系)
├── id          INTEGER PRIMARY KEY
└── name        TEXT NOT NULL UNIQUE

teachers (教师)
├── id          TEXT PRIMARY KEY    -- XLS 中方括号内编号
├── name        TEXT NOT NULL
└── department_id INTEGER → departments.id

courses (课程，按 course_code 去重)
├── id          INTEGER PRIMARY KEY
├── course_code TEXT UNIQUE
├── name        TEXT NOT NULL
├── category    TEXT
├── department_id INTEGER → departments.id
├── credits     REAL
└── hours       INTEGER

course_teachers (课程-教师多对多关联)
├── course_id   INTEGER → courses.id
└── teacher_id  TEXT → teachers.id
    PRIMARY KEY (course_id, teacher_id)

users (用户 — 校园邮箱认证)
├── id          INTEGER PRIMARY KEY
├── email       TEXT NOT NULL UNIQUE
└── created_at  DATETIME

comments (课程评论 — 不限次数，支持一级子评论)
├── id          INTEGER PRIMARY KEY
├── course_id   INTEGER → courses.id
├── parent_id   INTEGER → comments.id
├── user_id     INTEGER → users.id (nullable)
├── nickname    TEXT DEFAULT '匿名用户'
├── content     TEXT NOT NULL (限100字)
└── created_at  DATETIME

ratings (课程评分 — IP hash 去重)
├── id          INTEGER PRIMARY KEY
├── course_id   INTEGER → courses.id
├── user_id     INTEGER → users.id (nullable)
├── score       INTEGER CHECK(1~5)
├── ip_hash     TEXT
└── created_at  DATETIME

teacher_comments (教师评论 — 不限次数，支持一级子评论)
├── id          INTEGER PRIMARY KEY
├── teacher_id  TEXT → teachers.id
├── parent_id   INTEGER → teacher_comments.id
├── user_id     INTEGER → users.id (nullable)
├── nickname    TEXT DEFAULT '匿名用户'
├── content     TEXT NOT NULL (限100字)
└── created_at  DATETIME

teacher_ratings (教师评分 — IP hash 去重)
├── id          INTEGER PRIMARY KEY
├── teacher_id  TEXT → teachers.id
├── user_id     INTEGER → users.id (nullable)
├── score       INTEGER CHECK(1~5)
├── ip_hash     TEXT
└── created_at  DATETIME
```

### 1.3 数据导入
- 导入脚本 `tools/import_courses.py`
- 从 XLS 生成 `db/schema.sql` + `db/seed.sql`
- 本地开发: 直接写入 `.wrangler/state/v3/d1/` 下的 sqlite 文件

---

## Phase 2 — 后端 API (Cloudflare Pages Functions) ✅

### 2.1 读取 API

| 端点 | 说明 | 数据源 |
|------|------|--------|
| `GET /api/courses` | 课程列表（搜索、分页、排序） | Worker → D1 |
| `GET /api/courses/:id` | 课程详情 + 评分 + 评论树 | Worker → D1 |
| `GET /api/departments` | 院系列表 | Worker → D1 |

### 2.2 写入 API

| 端点 | 说明 | 限制 |
|------|------|------|
| `POST /api/comments` | 提交评论/子评论 | 100字限制，子评论不可再被评论 |
| `POST /api/ratings` | 提交评分 | IP hash 去重，1-5 分 |

### 2.3 定时任务

- Cron Trigger: 每 10 分钟从 D1 导出数据为静态 JSON（后续实现）

---

## Phase 3 — 前端 (Vue 3 + Material Design) ✅

### 3.1 页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 搜索框 + 快捷入口 |
| 热门课程 | `/hot` | 按评论数排序的热门课程 |
| 全部课程 | `/all` | 搜索 + 分页课程列表 |
| 课程详情 | `/course/:id` | 课程信息 + 评分 + 评论树 |

### 3.2 设计
- Material Design 风格
- MD 卡片、elevation、圆角按钮、pill 形搜索框
- 移动端优先
- 评论支持一级回复（子评论不可再被评论）
- 匿名用户显示"匿名用户"

---

## Phase 3.5 — 教师模块 ✅

### 3.5.1 数据结构
- 课程-教师多对多关系（`course_teachers` 关联表）
- 教师独立评分表 `teacher_ratings`（每人每教师仅一次，IP hash 去重）
- 教师独立评论表 `teacher_comments`（支持一级子评论）

### 3.5.2 后端 API

| 端点 | 说明 |
|------|------|
| `GET /api/teachers` | 教师列表（搜索、分页），含 avg_rating/comment_count |
| `GET /api/teachers/:id` | 教师详情 + 授课列表 + 评分统计 + 评论树 |
| `POST /api/teacher-comments` | 提交教师评论/子评论 |
| `POST /api/teacher-ratings` | 提交教师评分 |

### 3.5.3 前端页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 全部教师 | `/teachers` | 教师搜索 + 分页列表 |
| 教师详情 | `/teacher/:id` | 教师信息 + 授课列表 + 评分 + 评论 |

---

## Phase 3.7 — 静态只读镜像站 (SQLite WASM) ✅

### 3.7.1 架构

共用同一套 Vue 前端代码，通过 `VITE_STATIC_MODE` 环境变量切换：
- **动态站**: `ApiService` — `fetch('/api/...')` → Worker → D1
- **静态站**: `StaticService` — sql.js (SQLite WASM) 在客户端本地查询

```
DataService 接口
├── ApiService (动态站) → fetch → Worker → D1
└── StaticService (静态站) → sql.js → 本地 SQLite 文件
```

### 3.7.2 服务层

| 文件 | 说明 |
|------|------|
| `src/frontend/services/data-service.ts` | 接口定义 + 工厂函数 `getDataService()` |
| `src/frontend/services/api-service.ts` | 动态站实现（原有 fetch 抽取） |
| `src/frontend/services/static-service.ts` | 静态站实现（sql.js WASM 查询） |

### 3.7.3 静态模式 UI

- `StaticBanner` 组件：顶部提示「只读镜像站，评论/评分请访问正式版」
- 评分表单、评论表单、回复按钮：`v-if="!staticMode"` 隐藏
- 空评论提示改为「暂无评价」（不显示「来做第一个」）

### 3.7.4 构建与部署

| 命令 | 说明 |
|------|------|
| `npm run build` | 构建动态站（默认） |
| `npm run build:static` | 构建静态站（`--mode static`） |

- `.env.static` — `VITE_STATIC_MODE=true` + 动态站链接
- `tools/export_static_db.sh` — 从远程 D1 导出 → 脱敏（删 users 表、清 ip_hash/user_id） → `public/data/db.sqlite`
- `.github/workflows/static-deploy.yml` — 每天自动：导出 D1 → 构建静态站 → 部署到 `smu-course-review-static.pages.dev`

### 3.7.5 GitHub Secrets

| Secret | 说明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

---

## Phase 4 — 用户认证（校园邮箱 Magic Code）🔲

### 4.1 方案

**邮件发送服务：Resend**
- 免费额度：3000 封/月，满足校园应用需求
- 集成方式：REST API（一个 `fetch()` 调用）
- 需注册 [resend.com](https://resend.com) 获取 API Key
- 备选方案：Cloudflare Email Routing（需自有域名）、Brevo（300封/天）

**认证流程：无密码登录**
1. 用户输入校园邮箱（限 `@stu.shmtu.edu.cn`）
2. 后端生成 6 位验证码，通过 Resend 发送到邮箱
3. 用户输入验证码，验证通过后生成 session token
4. 后续评论/评分请求携带 session token

### 4.2 数据库变更

新增表：
- `verification_codes`（email, code, expires_at）— 验证码，10 分钟过期
- `sessions`（user_id, token, expires_at）— 登录会话

### 4.3 API

| 端点 | 说明 |
|------|------|
| `POST /api/auth/send-code` | 发送验证码到 `@stu.shmtu.edu.cn` |
| `POST /api/auth/verify` | 校验验证码，返回 session token |
| `GET /api/auth/me` | 获取当前登录状态 |

### 4.4 前端

- 导航栏登录按钮 / 用户头像
- 登录弹窗：邮箱输入 → 验证码输入
- 评论/评分表单关联已登录用户

### 4.5 环境变量

| 变量 | 说明 |
|------|------|
| `RESEND_API_KEY` | Resend API 密钥（secret） |
| `REQUIRE_AUTH` | `true`/`false` 控制是否强制登录 |

---

## Phase 5 — 部署 & 运维

### 5.1 部署流程
1. 推送到 GitHub `smu-res/smu-course-review` 的 `main` 分支
2. Cloudflare Pages 自动拉取构建
3. 前端 + Worker API 部署到全球边缘节点

### 5.2 数据安全
- D1 本质是 SQLite，可通过 `wrangler d1 export` 随时完整备份
- 定时将数据库快照提交到 GitHub 归档
- 静态 JSON 是数据的冗余副本，即使 Worker 挂了也能访问

### 5.3 域名
- 初期: `*.pages.dev` 免费域名
- 后期: 绑定自定义域名 + Cloudflare DNS

---

## 执行顺序清单

| # | 任务 | 依赖 | 状态 |
|---|------|------|------|
| 0.1 | 创建 GitHub 组织 `smu-res` | - | ✅ |
| 0.2 | 注册 Cloudflare 新账号 | - | ✅ |
| 0.3 | Wrangler CLI 认证 | 0.2 | ✅ |
| 0.4 | 创建 D1 数据库 | 0.3 | ✅ |
| 0.5 | 初始化本地 Git 仓库 + GPL-3.0 | - | ✅ |
| 0.6 | 项目骨架 (wrangler.toml, package.json) | 0.5 | ✅ |
| 1.1 | XLS → schema.sql + seed.sql | 0.5 | ✅ |
| 1.2 | 编写 schema.sql 建表 | - | ✅ |
| 1.3 | 编写 seed.sql + 导入 D1 | 1.1 + 1.2 | ✅ |
| 1.4 | 本地 D1 验证数据完整性 | 1.3 | ✅ |
| 2.1 | Worker API: 课程查询 + 列表 | 1.3 | ✅ |
| 2.2 | Worker API: 评论提交（含子评论） | 1.2 | ✅ |
| 2.3 | Worker API: 评分提交 | 1.2 | ✅ |
| 2.4 | Cron: 导出静态 JSON | 2.1 | ⏭️ 后续 |
| 2.5 | 本地 `wrangler pages dev` 联调验证 | 2.1~2.3 | ✅ |
| 3.1 | 前端: 首页 (搜索) | 2.5 | ✅ |
| 3.2 | 前端: 热门课程页 | 2.5 | ✅ |
| 3.3 | 前端: 全部课程页 | 2.5 | ✅ |
| 3.4 | 前端: 课程详情 + 评论树 + 评分 | 2.5 | ✅ |
| 3.5 | 前端: Material Design 风格 | 3.1~3.4 | ✅ |
| 3.6 | 教师模块: 多对多关联 + 教师列表/搜索 API | 1.3 | ✅ |
| 3.7 | 教师模块: 教师评分 + 评论 API | 3.6 | ✅ |
| 3.8 | 教师模块: 全部教师页 + 教师详情页 | 3.6~3.7 | ✅ |
| 3.9 | 静态站: DataService 抽象层 + ApiService | 3.x | ✅ |
| 3.10 | 静态站: StaticService (sql.js WASM) | 3.9 | ✅ |
| 3.11 | 静态站: 重构 Views 使用 DataService | 3.9 | ✅ |
| 3.12 | 静态站: StaticBanner + 隐藏写入 UI | 3.11 | ✅ |
| 3.13 | 静态站: 导出脚本 + GitHub Actions | 3.10 | ✅ |
| 3.14 | 静态站: 在 CF 创建 smu-course-review-static 项目 | 3.13 | 🔲 |
| 3.15 | 静态站: 配置 GitHub Secrets 并触发部署 | 3.14 | 🔲 |
| 4.1 | 注册 Resend 获取 API Key | - | 🔲 |
| 4.2 | 认证 API: send-code / verify / me | 4.1 | 🔲 |
| 4.3 | 前端: 登录弹窗 + 用户状态管理 | 4.2 | 🔲 |
| 4.4 | 评论/评分关联已登录用户 | 4.2~4.3 | 🔲 |
| 5.1 | 推送到 GitHub 组织仓库 | 3.x | ✅ |
| 5.2 | Cloudflare Pages 绑定 GitHub 部署 | 5.1 | 🔲 |
| 5.3 | 线上验证 | 5.2 | 🔲 |
