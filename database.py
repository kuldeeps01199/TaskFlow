import sqlite3
import os

# On Render (and similar PaaS), the working directory may be ephemeral.
# Use /tmp if available (Linux/Render), otherwise fall back to local dir.
_local_db = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tasks.db')
DATABASE_FILE = '/tmp/tasks.db' if os.path.exists('/tmp') else _local_db

def get_db_connection():
    """
    Creates and returns a connection to the SQLite database.
    Configures row_factory to sqlite3.Row so we can access columns by name.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes the SQLite database.
    Creates the 'tasks' table if it does not exist and inserts sample tasks if empty.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create the tasks table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT DEFAULT 'General',
            priority TEXT DEFAULT 'Medium',
            due_date TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Seed demo data on first run (when table is empty)
    cursor.execute("SELECT COUNT(*) FROM tasks")
    if cursor.fetchone()[0] == 0:
        sample_tasks = [
            ('Design new landing page', 'Create wireframes and mockups for the new marketing site', 'Work', 'High', None, 'pending'),
            ('Buy groceries', 'Milk, eggs, bread, fruits and vegetables for the week', 'Personal', 'Medium', None, 'pending'),
            ('Read "Atomic Habits"', 'Finish chapters 5–10 and take notes on key takeaways', 'Study', 'Low', None, 'pending'),
            ('Morning run', '5km jog around the park — track time with phone', 'Health', 'Medium', None, 'completed'),
            ('Fix login bug', 'Resolve the OAuth token expiry issue reported in issue #42', 'Work', 'High', None, 'completed'),
        ]
        cursor.executemany(
            "INSERT INTO tasks (title, description, category, priority, due_date, status) VALUES (?, ?, ?, ?, ?, ?)",
            sample_tasks
        )
        
    conn.commit()
    conn.close()

def get_all_tasks(filters=None):
    """
    Retrieves tasks from the database with optional filtering.
    filters can contain: status, priority, category, or search.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM tasks WHERE 1=1"
    params = []
    
    if filters:
        if filters.get('status'):
            query += " AND status = ?"
            params.append(filters['status'])
        if filters.get('priority'):
            query += " AND priority = ?"
            params.append(filters['priority'])
        if filters.get('category'):
            query += " AND category = ?"
            params.append(filters['category'])
        if filters.get('search'):
            query += " AND (title LIKE ? OR description LIKE ?)"
            search_param = f"%{filters['search']}%"
            params.append(search_param)
            params.append(search_param)
            
    # Sort order: pending tasks first, then by priority, then by due date
    # We can also just sort by status (pending first) and then created_at DESC or due_date ASC
    query += " ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    # Convert sqlite3.Row items to dictionaries for easy JSON serialization
    tasks = [dict(row) for row in rows]
    conn.close()
    return tasks

def get_task_by_id(task_id):
    """
    Retrieves a single task by its database ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_task(title, description, category='General', priority='Medium', due_date=None):
    """
    Creates a new task in the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tasks (title, description, category, priority, due_date, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
    ''', (title, description, category, priority, due_date))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

def update_task(task_id, data):
    """
    Updates fields of an existing task. 
    'data' is a dictionary of fields to update.
    """
    if not data:
        return False
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Dynamically build UPDATE query depending on what data was passed
    allowed_keys = ['title', 'description', 'category', 'priority', 'due_date', 'status']
    update_keys = [k for k in data.keys() if k in allowed_keys]
    
    if not update_keys:
        conn.close()
        return False
        
    set_clause = ", ".join([f"{k} = ?" for k in update_keys])
    params = [data[k] for k in update_keys]
    params.append(task_id)
    
    cursor.execute(f"UPDATE tasks SET {set_clause} WHERE id = ?", params)
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

def delete_task(task_id):
    """
    Deletes a task by its ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

def get_all_categories():
    """
    Retrieves a list of all unique categories in the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT category FROM tasks WHERE category IS NOT NULL AND category != ''")
    rows = cursor.fetchall()
    conn.close()
    # Return flat list of strings
    return [row['category'] for row in rows]
