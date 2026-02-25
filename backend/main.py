
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from typing import Optional

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

class ActressCreate(BaseModel):
    name: str
    video_count: int = 0
    tier_id: Optional[int] = None

class ActressUpdate(BaseModel):
    name: Optional[str] = None
    video_count: Optional[int] = None
    tier_id: Optional[int] = None

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Enable foreign key support
    cursor.execute("PRAGMA foreign_keys = ON")

    # Create tier table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tier (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('现役', '引退'))
        )
    ''')

    # Create actress table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS actress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            video_count INTEGER DEFAULT 0,
            tier_id INTEGER,
            FOREIGN KEY (tier_id) REFERENCES tier (id)
        )
    ''')
    
    # Seed tiers
    cursor.execute("SELECT COUNT(*) FROM tier")
    if cursor.fetchone()[0] == 0:
        tiers = [
            ('Infinite', '现役'), ('Premium', '现役'), ('Impression', '现役'),
            ('Honor', '引退'), ('Fame', '引退'), ('Classic', '引退'),
            ('Archive', '引退'), ('Opus', '引退')
        ]
        cursor.executemany("INSERT INTO tier (name, status) VALUES (?, ?)", tiers)

    # Seed actresses
    cursor.execute("SELECT COUNT(*) FROM actress")
    if cursor.fetchone()[0] == 0:
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

@app.get("/api/tiers")
def get_tiers():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, status FROM tier")
    tiers = cursor.fetchall()
    conn.close()
    return [dict(row) for row in tiers]

@app.get("/api/actresses")
def get_actresses():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.id, a.name, a.video_count, t.name as tier_name
        FROM actress a
        LEFT JOIN tier t ON a.tier_id = t.id
        ORDER BY a.video_count DESC
    ''')
    actresses = cursor.fetchall()
    conn.close()
    return [dict(row) for row in actresses]

@app.get("/api/actresses/check")
def check_actress_name(name: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM actress WHERE name = ?", (name,))
    exists = cursor.fetchone()
    conn.close()
    return {"exists": exists is not None}

@app.post("/api/actresses", status_code=201)
def create_actress(actress: ActressCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO actress (name, video_count, tier_id) VALUES (?, ?, ?)",
            (actress.name, actress.video_count, actress.tier_id)
        )
        conn.commit()
        new_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Actress with this name already exists")
    finally:
        conn.close()
    return {"id": new_id, **actress.dict()}

@app.put("/api/actresses/{actress_id}")
def update_actress(actress_id: int, actress: ActressUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    update_data = actress.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join([f"{key} = ?" for key in update_data.keys()])
    values = list(update_data.values())
    values.append(actress_id)

    cursor.execute(f"UPDATE actress SET {set_clause} WHERE id = ?", tuple(values))
    conn.commit()
    
    cursor.execute('''
        SELECT a.id, a.name, a.video_count, t.name as tier_name
        FROM actress a
        LEFT JOIN tier t ON a.tier_id = t.id
        WHERE a.id = ?
    ''', (actress_id,))
    updated_actress = cursor.fetchone()
    conn.close()

    if updated_actress is None:
        raise HTTPException(status_code=404, detail="Actress not found")
    
    return dict(updated_actress)

@app.delete("/api/actresses/{actress_id}", status_code=204)
def delete_actress(actress_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM actress WHERE id = ?", (actress_id,))
    conn.commit()
    conn.close()
    return Response(status_code=204)

