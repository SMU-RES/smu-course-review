# 海大选课通 (SMU Course Review)

> AI 协作指南 — 供 Claude / Copilot 等助手快速理解当前项目状态

## 开发环境规则

- Python 必须走 `uv`：使用 `uv run python ...`，不要直接执行 `python ...`
- Windows 环境：不要使用 `pkill` 等 Linux 命令，不要强杀 node 进程
- D1 相关命令统一使用数据库名：`ouc-course-review`

## 项目概述

海大选课通是面向上海海事大学学生的课程与教师评价平台，支持课程/教师检索、评分、评论，以及静态只读镜像站查询。

- 许可证：GPL-3.0
- 前端：Vue 3 + TypeScript + Vite
- 后端：Cloudflare Pages Functions（`functions/api`）
- 数据库：Cloudflare D1 (SQLite)
- 静态镜像：sql.js + `public/data/db.sqlite`

## 基础设施

| 资源 | 值 |
|------|---|
| Cloudflare Account ID | `bf26515b9f79d9beb42b359ee6bb67be` |
| D1 绑定名 | `DB` |
| D1 数据库名 | `ouc-course-review` |
| D1 database_id | `58a90fef-00f8-4a84-b382-d38b343cd53d` |
| D1 区域 | APAC |
| 认证方式 | `CLOUDFLARE_API_TOKEN`（本地 `.env`，已 gitignore） |
| 动态站 URL | `https://smu-course-review.pages.dev` |
| 静态站 URL | `https://smu-course-review-static.pages.dev` |

## 技术架构

### 运行模式

- 动态站：前端通过 `/api/*` 调用 Pages Functions，读写 D1
- 静态站：前端通过 `sql.js` 在浏览器查询 `public/data/db.sqlite`（只读）

### 数据流

```text
动态站 (smu-course-review.pages.dev)
  前端 fetch /api/* -> Pages Functions -> D1 (ouc-course-review)

静态站 (smu-course-review-static.pages.dev)
  前端 sql.js -> /data/db.sqlite (脱敏导出)
```

## 数据库设计（当前 schema）

当前 `db/schema.sql` 为 9 张表：

1. `departments`
2. `teachers`
3. `courses`
4. `course_teachers`
5. `users`
6. `comments`
7. `ratings`
8. `teacher_comments`
9. `teacher_ratings`

关键约束（按当前实现）：

- 评论内容限制 100 字（课程/教师评论一致）
- 仅允许一级回复（子评论不可再回复）
- 评分范围 `1-5`
- 评分去重策略为 `ip_hash`（同 IP 可更新原评分）
- 课程/教师的 `avg_score`、`rating_count`、`comment_count` 为预计算字段，由写入接口维护

## 已实现 API（`functions/api`）

### 读取接口

- `GET /api/courses`：课程列表（搜索、分页、院系筛选、排序）
- `GET /api/courses/:id`：课程详情 + 教师列表 + 评论树 + 评分统计
- `GET /api/departments`：院系列表
- `GET /api/teachers`：教师列表（搜索、分页、排序）
- `GET /api/teachers/:id`：教师详情 + 授课课程 + 评论树 + 评分统计

### 写入接口

- `POST /api/comments`：课程评论/回复
- `POST /api/ratings`：课程评分（按 IP hash 去重，可更新）
- `POST /api/teacher-comments`：教师评论/回复
- `POST /api/teacher-ratings`：教师评分（按 IP hash 去重，可更新）

说明：当前代码中尚未启用邮箱登录认证流程，`REQUIRE_AUTH` 为预留变量。

## 前端路由（`src/frontend/router/index.ts`）

- `/`：首页
- `/hot`：热门课程（仅静态模式可访问）
- `/all`：全部课程（静态模式直接访问；动态模式需带 `q`）
- `/teachers`：全部教师（静态模式直接访问；动态模式需带 `q`）
- `/course/:id`：课程详情
- `/teacher/:id`：教师详情

## 项目结构（实际）

```text
.
├── CLAUDE.md
├── WORKFLOW.md
├── wrangler.toml
├── package.json
├── db/
│   ├── schema.sql
│   └── seed.sql
├── functions/
│   ├── env.d.ts
│   └── api/
│       ├── courses/index.ts
│       ├── courses/[id].ts
│       ├── teachers/index.ts
│       ├── teachers/[id].ts
│       ├── comments.ts
│       ├── ratings.ts
│       ├── teacher-comments.ts
│       ├── teacher-ratings.ts
│       └── departments.ts
├── src/frontend/
│   ├── services/
│   │   ├── data-service.ts
│   │   ├── api-service.ts
│   │   └── static-service.ts
│   ├── router/
│   └── views/
└── tools/
    ├── pyproject.toml
    ├── import_courses.py
    └── export_static_db.sh
```

## 常用命令

```bash
# 本地前端开发
npm run dev

# 构建动态站
npm run build

# 本地预览
npm run preview

# 本地联调（Pages Functions）
npm run dev:worker

# D1（本地）
npm run db:schema
npm run db:seed

# D1（远程）
npm run db:schema:remote
npm run db:seed:remote

# 构建静态站
npm run build:static
```

## 数据导入与静态镜像

### 导入教务 XLS

```bash
cd tools
uv run python import_courses.py --input ../data/2025-2026-2.xls --output-dir ../db
```

### 导出静态 SQLite（脱敏）

```bash
bash tools/export_static_db.sh
```

导出脚本会：

1. 从远程 D1 导出 SQL
2. 生成 `public/data/db.sqlite`
3. 删除敏感表/字段（如 `users`、`ip_hash`、`user_id`）
