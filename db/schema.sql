-- 海大选课通 数据库 Schema
-- 由 import_courses.py 自动生成，请勿手动修改
-- 上海海事大学 (SMU) 课程评价系统

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- 院系
CREATE TABLE IF NOT EXISTS departments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE
);

-- 教师
CREATE TABLE IF NOT EXISTS teachers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    teacher_code  TEXT,
    department_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);
CREATE INDEX IF NOT EXISTS idx_teachers_dept ON teachers(department_id);

-- 课程
CREATE TABLE IF NOT EXISTS courses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code   TEXT,
    course_seq    TEXT    UNIQUE,
    name          TEXT    NOT NULL,
    category      TEXT,
    department_id INTEGER,
    teacher_id    INTEGER,
    class_name    TEXT,
    enrolled      INTEGER DEFAULT 0,
    capacity      INTEGER DEFAULT 0,
    credits       REAL    DEFAULT 0,
    hours         INTEGER DEFAULT 0,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (teacher_id)    REFERENCES teachers(id)
);
CREATE INDEX IF NOT EXISTS idx_courses_dept    ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_code    ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_name    ON courses(name);

-- 用户（校园邮箱认证，无密码）
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    email      TEXT     NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 评论（不限次数）
CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    course_id  INTEGER  NOT NULL,
    user_id    INTEGER  NOT NULL,
    content    TEXT     NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (user_id)   REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_comments_course ON comments(course_id);
CREATE INDEX IF NOT EXISTS idx_comments_user   ON comments(user_id);

-- 评分（每人每课仅一次）
CREATE TABLE IF NOT EXISTS ratings (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    course_id  INTEGER  NOT NULL,
    user_id    INTEGER  NOT NULL,
    score      INTEGER  NOT NULL CHECK(score BETWEEN 1 AND 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (user_id)   REFERENCES users(id),
    UNIQUE(course_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_course ON ratings(course_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user   ON ratings(user_id);
