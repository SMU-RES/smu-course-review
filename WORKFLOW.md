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

6 张表：

```
departments (院系)
├── id          INTEGER PRIMARY KEY
└── name        TEXT NOT NULL UNIQUE

teachers (教师)
├── id          INTEGER PRIMARY KEY
├── name        TEXT NOT NULL
├── teacher_code TEXT          -- 工号，如 "185450"
└── department_id INTEGER → departments.id

courses (课程)
├── id          INTEGER PRIMARY KEY
├── course_code TEXT           -- 课程号，如 "FX110010"
├── course_seq  TEXT UNIQUE    -- 课序号，如 "FX110010_001"
├── name        TEXT NOT NULL
├── category    TEXT           -- 课程种类
├── department_id INTEGER → departments.id
├── teacher_id  INTEGER → teachers.id
├── credits     REAL           -- 学分
└── hours       INTEGER        -- 学时

users (用户 — 校园邮箱认证)
├── id          INTEGER PRIMARY KEY
├── email       TEXT NOT NULL UNIQUE
└── created_at  DATETIME

comments (评论 — 不限次数，支持一级子评论)
├── id          INTEGER PRIMARY KEY
├── course_id   INTEGER → courses.id
├── parent_id   INTEGER → comments.id  -- 子评论指向父评论
├── user_id     INTEGER → users.id (nullable)
├── nickname    TEXT DEFAULT '匿名用户'
├── content     TEXT NOT NULL (限100字)
└── created_at  DATETIME

ratings (评分 — 每人每课仅一次)
├── id          INTEGER PRIMARY KEY
├── course_id   INTEGER → courses.id
├── user_id     INTEGER → users.id (nullable)
├── score       INTEGER CHECK(1~5)
├── ip_hash     TEXT           -- IP 哈希去重
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

## Phase 4 — 部署 & 运维

### 4.1 部署流程
1. 推送到 GitHub `smu-res/smu-course-review` 的 `main` 分支
2. Cloudflare Pages 自动拉取构建
3. 前端 + Worker API 部署到全球边缘节点

### 4.2 数据安全
- D1 本质是 SQLite，可通过 `wrangler d1 export` 随时完整备份
- 定时将数据库快照提交到 GitHub 归档
- 静态 JSON 是数据的冗余副本，即使 Worker 挂了也能访问

### 4.3 域名
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
| 4.1 | 推送到 GitHub 组织仓库 | 3.x | ✅ |
| 4.2 | Cloudflare Pages 绑定 GitHub 部署 | 4.1 | 🔲 |
| 4.3 | 线上验证 | 4.2 | 🔲 |
