#!/usr/bin/env bash
# 导出 D1 数据库并脱敏，用于静态站点构建
# 用法: bash tools/export_static_db.sh
#
# 前置条件:
#   - CLOUDFLARE_API_TOKEN 环境变量已设置
#   - sqlite3 已安装
#   - wrangler 已安装 (npx wrangler)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_DIR/public/data"
OUTPUT_DB="$OUTPUT_DIR/db.sqlite"
TEMP_SQL="$PROJECT_DIR/.tmp_export.sql"

echo "=== 海大选课通 — 静态数据库导出 ==="

# 1. 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 2. 从远程 D1 导出 SQL
echo "[1/4] 从远程 D1 导出数据..."
npx wrangler d1 export ouc-course-review --remote --output="$TEMP_SQL"

# 3. 清理旧数据库
rm -f "$OUTPUT_DB"

# 4. 导入到本地 sqlite 并脱敏
echo "[2/4] 导入到本地 SQLite..."
sqlite3 "$OUTPUT_DB" < "$TEMP_SQL"

echo "[3/4] 脱敏处理..."

# 删除用户表（含邮箱等敏感信息）
sqlite3 "$OUTPUT_DB" "DROP TABLE IF EXISTS users;"

# 删除验证码和会话表（如果存在）
sqlite3 "$OUTPUT_DB" "DROP TABLE IF EXISTS verification_codes;"
sqlite3 "$OUTPUT_DB" "DROP TABLE IF EXISTS sessions;"

# 清除评分表中的 ip_hash 和 user_id
sqlite3 "$OUTPUT_DB" "UPDATE ratings SET ip_hash = NULL, user_id = NULL;"
sqlite3 "$OUTPUT_DB" "UPDATE teacher_ratings SET ip_hash = NULL, user_id = NULL;"

# 清除评论表中的 user_id
sqlite3 "$OUTPUT_DB" "UPDATE comments SET user_id = NULL;"
sqlite3 "$OUTPUT_DB" "UPDATE teacher_comments SET user_id = NULL;"

# 压缩数据库
sqlite3 "$OUTPUT_DB" "VACUUM;"

echo "[4/4] 清理临时文件..."
rm -f "$TEMP_SQL"

# 输出统计
echo ""
echo "=== 导出完成 ==="
echo "输出: $OUTPUT_DB"
echo "大小: $(du -h "$OUTPUT_DB" | cut -f1)"
echo ""
echo "表统计:"
sqlite3 "$OUTPUT_DB" "SELECT 'departments', COUNT(*) FROM departments UNION ALL SELECT 'teachers', COUNT(*) FROM teachers UNION ALL SELECT 'courses', COUNT(*) FROM courses UNION ALL SELECT 'course_teachers', COUNT(*) FROM course_teachers UNION ALL SELECT 'comments', COUNT(*) FROM comments UNION ALL SELECT 'ratings', COUNT(*) FROM ratings UNION ALL SELECT 'teacher_comments', COUNT(*) FROM teacher_comments UNION ALL SELECT 'teacher_ratings', COUNT(*) FROM teacher_ratings;" | column -t -s '|'
