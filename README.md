# 海大选课通 (SMU Course Review)

海大选课通是一个面向上海海事大学学生的课程与教师评价平台，支持课程/教师检索、评分、评论，并提供静态只读镜像站以提升查询稳定性。

## 在线地址

- 动态站（可评论/评分）：https://smu-course-review.pages.dev
- 静态站（只读查询）：https://smu-course-review-static.pages.dev

## 页面功能

- 首页：关键词搜索课程/教师入口
- 热门课程：按热度展示课程（静态模式可访问）
- 全部课程：课程检索、分页、排序、院系筛选
- 课程详情：课程信息、教师列表、评分统计、评论树（支持一级回复）
- 全部教师：教师检索、分页、排序
- 教师详情：教师信息、授课课程、评分统计、评论树（支持一级回复）

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite + Vue Router |
| 服务层抽象 | `DataService`（动态 `ApiService` / 静态 `StaticService`） |
| 后端 | Cloudflare Pages Functions |
| 数据库 | Cloudflare D1 (SQLite) |
| 静态查询 | sql.js (SQLite WASM) + `public/data/db.sqlite` |
| 数据导入 | Python + `uv` + xlrd |
| 部署 | Cloudflare Pages + GitHub Actions |

## 架构说明

- 动态站：前端调用 `/api/*` -> Pages Functions -> D1（`ouc-course-review`）
- 静态站：前端在浏览器使用 sql.js 查询 `db.sqlite`，不走写入接口
- 静态镜像数据库由 `tools/export_static_db.sh` 导出并脱敏（移除用户敏感数据）

## 目录结构

```text
.
├── src/frontend/                  # Vue 前端
├── functions/api/                 # Pages Functions API
├── db/schema.sql                  # D1 Schema
├── db/seed.sql                    # 初始/导入数据
├── tools/import_courses.py        # XLS -> SQL 导入工具
├── tools/export_static_db.sh      # 导出脱敏静态 SQLite
├── .github/workflows/static-deploy.yml
├── wrangler.toml                  # 动态站配置（含 D1）
└── wrangler.static.toml           # 静态站部署配置（不含 D1）
```

## 本地开发

### 1) 安装依赖

```bash
npm ci
```

### 2) 启动前端开发

```bash
npm run dev
```

### 3) 本地联调（Pages Functions）

```bash
npm run build
npm run dev:worker
```

## 数据库操作（D1）

```bash
# 本地 D1
npm run db:schema
npm run db:seed

# 远程 D1
npm run db:schema:remote
npm run db:seed:remote
```

> 数据库名：`ouc-course-review`

## 课程数据导入

```bash
cd tools
uv run python import_courses.py --input ../data/2025-2026-2.xls --output-dir ../db
```

## 构建与部署

### 动态站

```bash
npm run build
npx wrangler pages deploy dist --project-name=smu-course-review
```

### 静态站

```bash
bash tools/export_static_db.sh
npm run build:static
```

静态站建议通过 GitHub Actions 自动部署（`static-deploy.yml`），流程中会使用 `wrangler.static.toml`，避免绑定 D1。

## License

GPL-3.0
