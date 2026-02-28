#!/usr/bin/env python3
"""
海大选课通 — 课程数据导入工具
每年从上海海事大学教务系统导出 XLS，运行此脚本生成 schema.sql + seed.sql

用法:
    uv run python import_courses.py                          # 默认读取 ../data/exportResult.xls
    uv run python import_courses.py --input path/to/file.xls # 指定文件
    uv run python import_courses.py --output-dir ../db        # 指定输出目录
    uv run python import_courses.py --seed-only               # 仅生成 seed.sql（不重建表）

输出:
    db/schema.sql  — 建表语句（7 张表）
    db/seed.sql    — 种子数据（departments + teachers + courses + course_teachers）
"""

import argparse
import re
import sys
from pathlib import Path

try:
    import xlrd
except ImportError:
    print("错误: 需要安装 xlrd 库")
    print("运行: uv add xlrd 或 pip install xlrd")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Schema 定义（与 db/schema.sql 保持同步）
# ---------------------------------------------------------------------------

SCHEMA_SQL = """\
-- 海大选课通 数据库 Schema
-- 由 import_courses.py 自动生成，请勿手动修改
-- 上海海事大学 (SMU) 课程评价系统


-- 院系
CREATE TABLE IF NOT EXISTS departments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE
);

-- 教师（ID 为 XLS 中方括号内的编号）
CREATE TABLE IF NOT EXISTS teachers (
    id            TEXT    PRIMARY KEY,
    name          TEXT    NOT NULL,
    department_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);
CREATE INDEX IF NOT EXISTS idx_teachers_dept ON teachers(department_id);

-- 课程（按 course_code 合并去重）
CREATE TABLE IF NOT EXISTS courses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code   TEXT    UNIQUE,
    name          TEXT    NOT NULL,
    category      TEXT,
    department_id INTEGER,
    credits       REAL    DEFAULT 0,
    hours         INTEGER DEFAULT 0,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);
CREATE INDEX IF NOT EXISTS idx_courses_dept ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);

-- 课程-教师关联（多对多）
CREATE TABLE IF NOT EXISTS course_teachers (
    course_id  INTEGER NOT NULL,
    teacher_id TEXT    NOT NULL,
    PRIMARY KEY (course_id, teacher_id),
    FOREIGN KEY (course_id)  REFERENCES courses(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 用户（校园邮箱认证，无密码）
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    email      TEXT     NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 评论（不限次数，支持一级子评论）
CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    course_id  INTEGER  NOT NULL,
    parent_id  INTEGER,
    user_id    INTEGER,
    nickname   TEXT     DEFAULT '匿名用户',
    content    TEXT     NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id),
    FOREIGN KEY (user_id)   REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_comments_course ON comments(course_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- 评分（每人每课仅一次）
CREATE TABLE IF NOT EXISTS ratings (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    course_id  INTEGER  NOT NULL,
    user_id    INTEGER,
    score      INTEGER  NOT NULL CHECK(score BETWEEN 1 AND 5),
    ip_hash    TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (user_id)   REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_course ON ratings(course_id);

-- 教师评论（不限次数，支持一级子评论）
CREATE TABLE IF NOT EXISTS teacher_comments (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    teacher_id TEXT     NOT NULL,
    parent_id  INTEGER,
    user_id    INTEGER,
    nickname   TEXT     DEFAULT '匿名用户',
    content    TEXT     NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (parent_id) REFERENCES teacher_comments(id),
    FOREIGN KEY (user_id)   REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_comments_teacher ON teacher_comments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_comments_parent ON teacher_comments(parent_id);

-- 教师评分（每人每教师仅一次）
CREATE TABLE IF NOT EXISTS teacher_ratings (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    teacher_id TEXT     NOT NULL,
    user_id    INTEGER,
    score      INTEGER  NOT NULL CHECK(score BETWEEN 1 AND 5),
    ip_hash    TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (user_id)   REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_ratings_teacher ON teacher_ratings(teacher_id);
"""


# ---------------------------------------------------------------------------
# XLS 列定义（教务系统导出格式）
# ---------------------------------------------------------------------------

COL_COURSE_SEQ = 0   # 课序号  FX110010_001
COL_COURSE_CODE = 1  # 课程号  FX110010
COL_COURSE_NAME = 2  # 课程名  刑法学
COL_CATEGORY = 3     # 课程种类
COL_DEPARTMENT = 4   # 开课院系
COL_SCHEDULE = 5     # 课程安排（不导入）
COL_CLASS_NAME = 6   # 行政班（不导入）
COL_TEACHER = 7      # 教师    朱奇伟[185450] 或 多教师逗号分隔
COL_ENROLLED = 8     # 实际人数（不导入）
COL_CAPACITY = 9     # 人数上限（不导入）
COL_CREDITS = 10     # 学分
COL_HOURS = 11       # 学时


# ---------------------------------------------------------------------------
# 解析工具函数
# ---------------------------------------------------------------------------


def parse_all_teachers(raw: str) -> list:
    """
    解析教师字段，返回所有教师列表。
    格式: "朱奇伟[185450]" 或 "郭瑛[195500],邓某某[256009]"
    返回: [("朱奇伟", "185450"), ("邓某某", "256009"), ...]
    """
    if not raw or not raw.strip():
        return []
    parts = re.split(r"[,，;；]", raw.strip())
    result = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        m = re.match(r"(.+?)\[(\w+)\]", p)
        if m:
            result.append((m.group(1).strip(), m.group(2).strip()))
        elif p:
            # 无编号的教师，用名字做临时 ID
            result.append((p, f"_nocode_{p}"))
    return result


def safe_int(val) -> int:
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return 0


def safe_float(val) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def escape_sql(s: str) -> str:
    if s is None:
        return ""
    return str(s).replace("'", "''")


# ---------------------------------------------------------------------------
# 主逻辑
# ---------------------------------------------------------------------------


def read_xls(filepath: str):
    wb = xlrd.open_workbook(filepath)
    sh = wb.sheet_by_index(0)
    rows = []
    for i in range(1, sh.nrows):
        rows.append(sh.row_values(i))
    return rows


def process_data(rows: list) -> dict:
    """
    清洗数据，返回:
    {
        "departments": { name: id },
        "teachers": { teacher_code: {"name": ..., "dept_id": ...} },
        "courses": { course_code: {...} },
        "course_teachers": set of (course_code, teacher_code),
    }
    """
    departments = {}
    teachers = {}       # teacher_code -> {name, dept_id}
    courses = {}        # course_code -> {name, category, dept_id, credits, hours}
    course_teachers = set()  # (course_code, teacher_code)

    dept_id_counter = 0

    for row in rows:
        # --- 院系 ---
        dept_name = str(row[COL_DEPARTMENT]).strip()
        if dept_name and dept_name not in departments:
            dept_id_counter += 1
            departments[dept_name] = dept_id_counter
        dept_id = departments.get(dept_name)

        # --- 教师（解析全部） ---
        teacher_list = parse_all_teachers(str(row[COL_TEACHER]))
        for tname, tcode in teacher_list:
            if tcode not in teachers:
                teachers[tcode] = {
                    "name": tname,
                    "dept_id": dept_id,
                }

        # --- 课程（按 course_code 合并去重） ---
        course_code = str(row[COL_COURSE_CODE]).strip()
        if not course_code:
            continue

        if course_code not in courses:
            courses[course_code] = {
                "name": str(row[COL_COURSE_NAME]).strip(),
                "category": str(row[COL_CATEGORY]).strip(),
                "dept_id": dept_id,
                "credits": safe_float(row[COL_CREDITS]),
                "hours": safe_int(row[COL_HOURS]),
            }

        # --- 课程-教师关联 ---
        for _, tcode in teacher_list:
            course_teachers.add((course_code, tcode))

    return {
        "departments": departments,
        "teachers": teachers,
        "courses": courses,
        "course_teachers": course_teachers,
    }


def generate_seed_sql(data: dict) -> str:
    lines = []
    lines.append("-- 海大选课通 种子数据")
    lines.append("-- 由 import_courses.py 自动生成，请勿手动修改\n")

    # --- departments ---
    lines.append("-- 院系（追加导入，已存在的跳过）")
    for name, did in sorted(data["departments"].items(), key=lambda x: x[1]):
        lines.append(
            f"INSERT OR IGNORE INTO departments (id, name) VALUES ({did}, '{escape_sql(name)}');"
        )
    lines.append("")

    # --- teachers (ID = teacher_code TEXT) ---
    lines.append("-- 教师（追加导入，已存在的跳过）")
    for tcode in sorted(data["teachers"].keys()):
        info = data["teachers"][tcode]
        dept_str = str(info["dept_id"]) if info["dept_id"] else "NULL"
        lines.append(
            f"INSERT OR IGNORE INTO teachers (id, name, department_id) "
            f"VALUES ('{escape_sql(tcode)}', '{escape_sql(info['name'])}', {dept_str});"
        )
    lines.append("")

    # --- courses (按 course_code 去重，自增 ID) ---
    lines.append("-- 课程（追加导入，course_code 已存在的跳过）")
    # 给每个 course_code 分配一个自增 ID
    course_code_to_id = {}
    for i, code in enumerate(sorted(data["courses"].keys()), start=1):
        course_code_to_id[code] = i
        c = data["courses"][code]
        dept_str = str(c["dept_id"]) if c["dept_id"] else "NULL"
        lines.append(
            f"INSERT OR IGNORE INTO courses "
            f"(id, course_code, name, category, department_id, credits, hours) VALUES ("
            f"{i}, "
            f"'{escape_sql(code)}', "
            f"'{escape_sql(c['name'])}', "
            f"'{escape_sql(c['category'])}', "
            f"{dept_str}, "
            f"{c['credits']}, "
            f"{c['hours']}"
            f");"
        )
    lines.append("")

    # --- course_teachers ---
    lines.append("-- 课程-教师关联（追加导入，已存在的跳过）")
    for course_code, tcode in sorted(data["course_teachers"]):
        cid = course_code_to_id.get(course_code)
        if cid is None:
            continue
        lines.append(
            f"INSERT OR IGNORE INTO course_teachers (course_id, teacher_id) "
            f"VALUES ({cid}, '{escape_sql(tcode)}');"
        )

    lines.append("")
    return "\n".join(lines)


def print_summary(data: dict):
    print(f"\n{'=' * 50}")
    print(f"  海大选课通 -- 数据导入摘要")
    print(f"{'=' * 50}")
    print(f"  院系:       {len(data['departments'])} 个")
    print(f"  教师:       {len(data['teachers'])} 位")
    print(f"  课程(去重): {len(data['courses'])} 门")
    print(f"  课程-教师:  {len(data['course_teachers'])} 条关联")
    print(f"{'=' * 50}")

    # 按院系统计课程数
    dept_course_count = {}
    dept_id_to_name = {v: k for k, v in data["departments"].items()}
    for c in data["courses"].values():
        dname = dept_id_to_name.get(c["dept_id"], "未知")
        dept_course_count[dname] = dept_course_count.get(dname, 0) + 1

    print("\n  按院系统计:")
    for dname, cnt in sorted(dept_course_count.items(), key=lambda x: -x[1]):
        print(f"    {dname}: {cnt} 门")

    # 按课程种类统计
    cat_count = {}
    for c in data["courses"].values():
        cat = c["category"] or "未分类"
        cat_count[cat] = cat_count.get(cat, 0) + 1

    print("\n  按课程种类统计:")
    for cat, cnt in sorted(cat_count.items(), key=lambda x: -x[1]):
        print(f"    {cat}: {cnt} 门")

    print()


# ---------------------------------------------------------------------------
# CLI 入口
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="海大选课通 -- 课程数据导入工具 (上海海事大学)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    script_dir = Path(__file__).parent
    default_input = script_dir / ".." / "data" / "exportResult.xls"
    default_output = script_dir / ".." / "db"

    parser.add_argument("--input", "-i", default=str(default_input),
                        help="输入 XLS 文件路径")
    parser.add_argument("--output-dir", "-o", default=str(default_output),
                        help="输出目录 (默认: db/)")
    parser.add_argument("--seed-only", action="store_true",
                        help="仅生成 seed.sql，不重新生成 schema.sql")

    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    if not input_path.exists():
        print(f"错误: 找不到文件 {input_path}")
        sys.exit(1)

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. 读取 XLS
    print(f"读取: {input_path}")
    rows = read_xls(str(input_path))
    print(f"读取到 {len(rows)} 行数据")

    # 2. 清洗
    data = process_data(rows)
    print_summary(data)

    # 3. 生成 schema.sql
    if not args.seed_only:
        schema_path = output_dir / "schema.sql"
        with open(schema_path, "w", encoding="utf-8") as f:
            f.write(SCHEMA_SQL)
        print(f"[OK] schema.sql -> {schema_path}")

    # 4. 生成 seed.sql
    seed_sql = generate_seed_sql(data)
    seed_path = output_dir / "seed.sql"
    with open(seed_path, "w", encoding="utf-8") as f:
        f.write(seed_sql)
    print(f"[OK] seed.sql   -> {seed_path}")

    # 5. 提示下一步
    db_name = "ouc-course-review"
    project_root = script_dir / ".."
    seed_rel = seed_path.relative_to(project_root.resolve())
    print(f"\n下一步 -- 导入到 D1 (在项目根目录执行):")
    if not args.seed_only:
        schema_rel = schema_path.relative_to(project_root.resolve())
        print(f"  npx wrangler d1 execute {db_name} --file={schema_rel} --remote")
    print(f"  npx wrangler d1 execute {db_name} --file={seed_rel} --remote")
    print(f"\n本地开发 -- 加 --local 参数即可")


if __name__ == "__main__":
    main()
