import sqlite3
from sqlite3 import Connection

DB_PATH = "startup_os.db"

def get_db_connection() -> Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Plans Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        title TEXT,
        summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # OKRs Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS plan_okrs (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        objective TEXT,
        FOREIGN KEY(plan_id) REFERENCES plans(id)
    )
    ''')

    # Key Results Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS plan_key_results (
        id TEXT PRIMARY KEY,
        okr_id TEXT,
        title TEXT,
        target_value REAL,
        current_value REAL,
        FOREIGN KEY(okr_id) REFERENCES plan_okrs(id)
    )
    ''')

    # KPIs Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS plan_kpis (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        name TEXT,
        value REAL,
        target REAL,
        FOREIGN KEY(plan_id) REFERENCES plans(id)
    )
    ''')

    # Sprints Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS plan_sprints (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        week_number INTEGER,
        goal TEXT,
        completed BOOLEAN DEFAULT 0,
        FOREIGN KEY(plan_id) REFERENCES plans(id)
    )
    ''')
    
    # Risks Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS plan_risks (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        description TEXT,
        impact TEXT,
        mitigation TEXT,
        resolved BOOLEAN DEFAULT 0,
        FOREIGN KEY(plan_id) REFERENCES plans(id)
    )
    ''')

    # Assumptions Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS plan_assumptions (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        statement TEXT,
        validated BOOLEAN DEFAULT 0,
        notes TEXT,
        FOREIGN KEY(plan_id) REFERENCES plans(id)
    )
    ''')

    # Execution Events Table (The Source of Truth for Reactivity)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS execution_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT,
        event_type TEXT,
        payload TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT 0,
        FOREIGN KEY(plan_id) REFERENCES plans(id)
    )
    ''')

    # Computed Metrics (Snapshot for UI)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS computed_metrics (
        plan_id TEXT PRIMARY KEY,
        overall_progress REAL,
        active_sprint_id TEXT,
        last_computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(plan_id) REFERENCES plans(id)
    )
    ''')

    conn.commit()
    conn.close()
