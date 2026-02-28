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
| 0.5 本地 Git 仓库 | 🔲 | 初始化 git，GPL-3.0，.gitignore |
| 0.6 项目骨架 | 🔲 | wrangler.toml, package.json, tsconfig 等 |

---

## Phase 1 — 数据准备 ✅

### 1.1 数据清洗
- 输入: `exportResult.xls`（上海海事大学教务系统导出，2675 条课程数据）
- Python 脚本清洗:
  - 提取院系列表（41 个）→ departments
  - 提取教师列表（去重，含工号）→ teachers
  - 标准化课程字段 → courses
- 输出: `data/courses.json`

### 1.2 数据库 Schema

5 张表，无时间地点表：

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
├── course_seq  TEXT           -- 课序号，如 "FX110010_001"
├── name        TEXT NOT NULL
├── category    TEXT           -- 课程种类: 一般课程/实习实践/体育/实验/网络通识
├── department_id INTEGER → departments.id
├── teacher_id  INTEGER → teachers.id
├── class_name  TEXT           -- 行政班
├── enrolled    INTEGER        -- 实际人数
├── capacity    INTEGER        -- 人数上限
├── credits     REAL           -- 学分
└── hours       INTEGER        -- 学时

comments (评论 — 可以一直评论，不限次数)
├── id          INTEGER PRIMARY KEY
├── course_id   INTEGER → courses.id
├── content     TEXT NOT NULL
├── ip_hash     TEXT           -- IP 哈希，用于基本防刷
└── created_at  DATETIME DEFAULT CURRENT_TIMESTAMP

ratings (评分 — 每人每课只能评一次)
├── id          INTEGER PRIMARY KEY
├── course_id   INTEGER → courses.id
├── score       INTEGER CHECK(score BETWEEN 1 AND 5)
├── fingerprint TEXT           -- 浏览器指纹，用于唯一性约束
├── created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
└── UNIQUE(course_id, fingerprint)
```

### 1.3 数据导入
- 编写导入脚本 `scripts/import.py`
- 从 `courses.json` 生成 `schema.sql` + `seed.sql`
- 执行: `npx wrangler d1 execute ouc-course-review --file=schema.sql`
- 执行: `npx wrangler d1 execute ouc-course-review --file=seed.sql`
- 本地开发用: `--local` 参数写入本地 D1 模拟库

---

## Phase 2 — 后端 API (Cloudflare Workers)

### 2.1 读取 API

| 端点 | 说明 | 数据源 |
|------|------|--------|
| `GET /data/courses.json` | 全部课程索引 | 静态 JSON (CDN) |
| `GET /data/dept/{id}.json` | 按院系查课程 | 静态 JSON (CDN) |
| `GET /api/courses/:id` | 课程详情 + 评分 + 评论 | Worker → D1 |

### 2.2 写入 API

| 端点 | 说明 | 限制 |
|------|------|------|
| `POST /api/comments` | 提交评论 | IP 防刷，内容过滤 |
| `POST /api/ratings` | 提交评分 | fingerprint 唯一约束，1-5 分 |

### 2.3 定时任务

- Cron Trigger: 每 10 分钟从 D1 导出数据为静态 JSON
- 导出内容: 课程列表 + 平均评分 + 评论数
- 输出到 `/data/` 目录供 CDN 分发

---

## Phase 3 — 前端 (Vue 3 + Cloudflare Pages)

### 3.1 页面

| 页面 | 路由 | 数据来源 |
|------|------|----------|
| 首页 | `/` | 静态 JSON: 搜索、院系筛选、热门课程 |
| 课程详情 | `/course/:id` | Worker API: 评分统计 + 评论列表 |
| 提交评价 | `/course/:id/review` | Worker API: POST 评论 + 评分 |

### 3.2 设计原则
- 移动端优先（微信内置浏览器访问为主）
- 无需登录注册
- 首屏从静态 JSON 加载，极快
- 评论/评分通过 Worker API 提交

---

## Phase 4 — 部署 & 运维

### 4.1 部署流程
1. 推送到 GitHub `smu-res/ouc-course-review` 的 `main` 分支
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
| 1.1 | XLS → courses.json 数据清洗 | 0.5 | ✅ |
| 1.2 | 编写 schema.sql 建表 | - | ✅ |
| 1.3 | 编写 seed.sql + 导入 D1 | 1.1 + 1.2 | ✅ |
| 1.4 | 本地 D1 验证数据完整性 | 1.3 | 🔲 |
| 2.1 | Worker API: 课程查询 | 1.3 | 🔲 |
| 2.2 | Worker API: 评论提交 | 1.2 | 🔲 |
| 2.3 | Worker API: 评分提交 | 1.2 | 🔲 |
| 2.4 | Cron: 导出静态 JSON | 2.1 | 🔲 |
| 2.5 | 本地 `wrangler dev` 联调验证 | 2.1~2.4 | 🔲 |
| 3.1 | 前端: 首页 + 搜索 | 2.5 | 🔲 |
| 3.2 | 前端: 课程详情 + 评价列表 | 2.5 | 🔲 |
| 3.3 | 前端: 提交评论 + 评分 | 2.5 | 🔲 |
| 4.1 | 推送到 GitHub 组织仓库 | 3.x | 🔲 |
| 4.2 | Cloudflare Pages 绑定 GitHub 部署 | 4.1 | 🔲 |
| 4.3 | 线上验证 | 4.2 | 🔲 |