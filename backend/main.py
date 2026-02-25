
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3

app = FastAPI()

# Allow all origins for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE = "jatlas.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS actress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            video_count INTEGER DEFAULT 0
        )
    ''')
    
    # Check if data already exists
    cursor.execute("SELECT COUNT(*) FROM actress")
    count = cursor.fetchone()[0]
    
    if count == 0:
        initial_data = [
            ('楪カレン', 302),
            ('鷲尾芽衣', 259),
            ('明里つむぎ', 350),
            ('藤森里穂', 272),
            ('弥生みづき', 255)
        ]
        cursor.executemany("INSERT INTO actress (name, video_count) VALUES (?, ?)", initial_data)
    
    conn.commit()
    conn.close()

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/api/actresses")
def get_actresses():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, video_count FROM actress ORDER BY id DESC")
    actresses = cursor.fetchall()
    conn.close()
    return [dict(row) for row in actresses]

