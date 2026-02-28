// Cloudflare Pages Functions 环境类型定义

interface Env {
  DB: D1Database
  REQUIRE_AUTH: string
  ALLOWED_EMAIL_DOMAIN: string
}
