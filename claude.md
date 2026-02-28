# 海大选课通 (SMU Course Review)

> AI 协作指南 — 本文件供 Claude / Copilot 等 AI 助手理解项目上下文

## 开发环境规则

- **Python 必须使用 uv 环境**：禁止直接使用 `python` 命令，必须使用 `uv run python` 来执行 Python 脚本。例如 `uv run python tools/import_courses.py`。
- **Windows 环境**：不要使用 `pkill` 等 Linux 命令，不要 kill node 进程。

## 项目概述

海大选课通是一个面向上海海事大学学生的课程评价与信息共享平台。
用户可以对教师课程进行评分、留言，帮助同学们做出更好的选课决策。

- **许可证**: GPL-3.0
- **GitHub 组织**: [smu-res](https://github.com/smu-res)
- **仓库**: smu-res/smu-course-review

## 基础设施

| 资源 | 值 |
|------|---|
| Cloudflare Account ID | bf26515b9f79d9beb42b359ee6bb67be |
| D1 数据库名 | smu-course-review |
| D1 database_id | 58a90fef-00f8-4a84-b382-d38b343cd53d |
| D1 区域 | APAC |
| 认证方式 | 环境变量 `CLOUDFLARE_API_TOKEN`（存于 `.env`，已 gitignore） |

## 技术架构

### 核心原则

- **零成本运营**: 完全依托 Cloudflare 免费层
- **读写分离**: 读取走静态 CDN（无限流量），写入走 Worker + D1（量小）
- **数据持久化**: 定时导出 JSON + GitHub 归档，数据永不丢失
- **渐进式发展**: 先 Web 版 MVP，后续考虑小程序

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite |
| 前端托管 | Cloudflare Pages（无限带宽） |
| 后端 API | Cloudflare Workers（免费 10 万次/天） |
| 数据库 | Cloudflare D1 / SQLite（免费 5GB） |
| 静态数据 | JSON on Pages CDN（抗高并发） |
| 代码管理 | GitHub Organization `smu-res` |
| 本地开发 | Wrangler CLI |

### 架构图

```
读取(高频) → Cloudflare Pages CDN → 静态 JSON 文件 (无限流量, 不耗 Worker 额度)
                                          ↑ Cron 每10分钟生成
写入(低频) → Cloudflare Workers → D1 SQLite
                                          ↓ 定时备份
                                   GitHub 归档
```

## 数据库设计 (D1 SQLite) — 6 张表

### departments (院系)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 自增主键 |
| name | TEXT NOT NULL UNIQUE | 院系名，如"计算机系" |

> 从教务系统导出的 XLS 自动提取

### teachers (教师)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 自增主键 |
| name | TEXT NOT NULL | 教师姓名 |
| teacher_code | TEXT | 工号，如 "185450" |
| department_id | INTEGER | → departments.id |

### courses (课程)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 自增主键 |
| course_code | TEXT | 课程号，如 "FX110010" |
| course_seq | TEXT UNIQUE | 课序号，如 "FX110010_001" |
| name | TEXT NOT NULL | 课程名 |
| category | TEXT | 一般课程/实习实践/体育/实验/网络通识 |
| department_id | INTEGER | → departments.id |
| teacher_id | INTEGER | → teachers.id |
| class_name | TEXT | 行政班 |
| enrolled | INTEGER | 实际人数 |
| capacity | INTEGER | 人数上限 |
| credits | REAL | 学分 |
| hours | INTEGER | 学时 |

> 每年通过导入工具从教务系统 XLS 更新

### users (用户 — 校园邮箱认证)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 自增主键 |
| email | TEXT NOT NULL UNIQUE | 校园邮箱，仅允许 `@stu.shmtu.edu.cn` |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

> 无密码登录：输入邮箱 → 收 6 位验证码 → 验证后获得 session

### comments (评论 — 不限次数)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 自增主键 |
| course_id | INTEGER NOT NULL | → courses.id |
| user_id | INTEGER NOT NULL | → users.id |
| content | TEXT NOT NULL | 评论内容，限 500 字 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

> 用户可对同一课程发表多条评论

### ratings (评分 — 每人每课仅一次)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 自增主键 |
| course_id | INTEGER NOT NULL | → courses.id |
| user_id | INTEGER NOT NULL | → users.id |
| score | INTEGER | CHECK(score BETWEEN 1 AND 5) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

> **UNIQUE(course_id, user_id)** — 同一用户对同一课程只能评分一次

## API 设计

### 运行时配置（环境变量，可随时切换）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REQUIRE_AUTH` | `true` | 写入 API 是否要求邮箱 session 认证 |

- `true`: 评论/评分需校园邮箱验证登录（推荐，防刷效果最好）
- `false`: 降级为 IP 速率限制（每 IP 每小时 N 次），适合初期推广或认证服务故障时应急

> 通过 Cloudflare Dashboard → Workers → Settings → Variables 随时切换，无需改代码重部署。

### 认证（校园邮箱 Magic Code，无密码）

| 路径 | 说明 |
|------|------|
| `POST /api/auth/send-code` | 发送 6 位验证码到 `@stu.shmtu.edu.cn` 邮箱 |
| `POST /api/auth/verify` | 验证码校验，返回 session token |
| `GET  /api/auth/me` | 获取当前登录状态 |

> 浏览课程不需要登录，仅评论/评分时需要验证邮箱。验证码有效期 10 分钟。
> 邮件发送: Resend 免费层（3000 封/月）或 Cloudflare Email Routing

### 读取（静态 CDN，无需登录）

| 路径 | 说明 | 数据源 |
|------|------|--------|
| `GET /data/courses.json` | 全部课程索引 + 平均分 | Pages CDN |
| `GET /data/dept/{id}.json` | 按院系课程列表 | Pages CDN |
| `GET /api/courses/:id` | 课程详情 + 评论 + 评分 | Worker → D1 |

### 写入（走 Worker，认证策略由 `REQUIRE_AUTH` 控制）

| 路径 | 说明 | REQUIRE_AUTH=true | REQUIRE_AUTH=false |
|------|------|---|---|
| `POST /api/comments` | 提交评论 | 需 session + 内容过滤 | IP 限流 + 内容过滤 |
| `POST /api/ratings` | 提交评分 | 需 session，每人每课一次 | IP 限流 + fingerprint 去重 |

### 定时任务

- Cron Trigger 每 10 分钟从 D1 导出 → 静态 JSON → CDN 分发

## 项目结构

```
smu-course-review/
├── .env                       # CF API Token (gitignore)
├── .gitignore
├── LICENSE                    # GPL-3.0
├── README.md
├── claude.md                  # 本文件
├── WORKFLOW.md                # 工作流程 & 进度追踪
├── wrangler.toml              # Cloudflare 配置
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── frontend/              # Vue 3 前端
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── router/
│   │   ├── views/
│   │   ├── components/
│   │   └── assets/
│   └── worker/                # Cloudflare Workers 后端
│       ├── index.ts           # 入口 & 路由
│       ├── api/
│       │   ├── courses.ts
│       │   ├── comments.ts
│       │   └── ratings.ts
│       └── cron.ts            # 定时导出 JSON
├── db/
│   ├── schema.sql             # 建表语句
│   └── seed.sql               # 种子数据 (由导入工具生成)
├── tools/                     # 数据导入工具 (每年复用)
│   ├── import_courses.py      # XLS → 清洗 → schema.sql + seed.sql
│   ├── requirements.txt       # Python 依赖 (xlrd)
│   └── README.md              # 导入工具使用说明
├── data/                      # 原始数据 (gitignore 可选)
│   └── exportResult.xls       # 教务系统导出
└── public/
    └── data/                  # 导出的静态 JSON (CDN 分发)
```

## 开发规范

### 代码风格

- TypeScript strict 模式
- Vue 3 Composition API + `<script setup>`
- ESLint + Prettier
- 中文注释，英文标识符

### Git 规范

- 分支: main (生产) / dev (开发) / feature/* (功能)
- Commit: `type(scope): description`
  - feat / fix / docs / style / refactor / perf / test / chore
  - 例: `feat(comment): 添加评论提交 API`

### 安全

- `.env` 已 gitignore，绝不提交 Token
- 所有用户输入在 Worker 层 sanitize
- 基本 Rate Limiting 防滥用
- 评论内容过滤 XSS

## 数据来源 & 年度更新

- 数据来自上海海事大学教务系统导出的 XLS 文件
- XLS 字段: 课序号、课程号、课程名、课程种类、开课院系、课程安排、行政班、教师、实际人数、人数上限、学分、学时、起始周、周数
- **每年更新流程**: 从教务系统导出新 XLS → 运行 `tools/import_courses.py` → 生成新的 seed.sql → 导入 D1
- 导入工具会自动: 提取院系、教师去重、标准化课程字段、生成建表与种子 SQL