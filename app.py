from flask import Flask, jsonify, request, send_from_directory
import os
import database

# Initialize the Flask application
# Specifying static_folder as 'static' allows Flask to serve css, js, and images automatically
app = Flask(__name__, static_folder='static')

# Create tables and load sample data if it's the first execution
database.init_db()

@app.route('/')
def index():
    """Serves the front-end homepage (index.html)"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """
    API endpoint: Get all tasks.
    Supports query parameters for filtering:
    - status (pending/completed)
    - priority (Low/Medium/High)
    - category (Work/Personal/etc)
    - search (text search query)
    """
    filters = {
        'status': request.args.get('status'),
        'priority': request.args.get('priority'),
        'category': request.args.get('category'),
        'search': request.args.get('search')
    }
    
    tasks = database.get_all_tasks(filters)
    return jsonify(tasks)

@app.route('/api/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    """API endpoint: Get a single task by ID"""
    task = database.get_task_by_id(task_id)
    if task:
        return jsonify(task)
    return jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks', methods=['POST'])
def add_task():
    """
    API endpoint: Create a new task.
    Expects JSON payload with 'title', and optional 'description', 'category', 'priority', 'due_date'.
    """
    data = request.get_json() or {}
    title = data.get('title')
    
    if not title or not title.strip():
        return jsonify({"error": "Task title is required"}), 400
        
    description = data.get('description', '')
    category = data.get('category', 'General') or 'General'
    priority = data.get('priority', 'Medium') or 'Medium'
    due_date = data.get('due_date') or None # None converts to NULL in SQLite
    
    new_id = database.create_task(title, description, category, priority, due_date)
    created_task = database.get_task_by_id(new_id)
    
    return jsonify(created_task), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """
    API endpoint: Update one or more fields of an existing task.
    Can modify 'title', 'description', 'category', 'priority', 'due_date', 'status'.
    """
    data = request.get_json() or {}
    
    # Check if the task actually exists
    task = database.get_task_by_id(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
        
    success = database.update_task(task_id, data)
    if success:
        updated_task = database.get_task_by_id(task_id)
        return jsonify(updated_task)
    return jsonify({"error": "Failed to update task or no changes made"}), 400

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """API endpoint: Delete a task by ID"""
    task = database.get_task_by_id(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
        
    success = database.delete_task(task_id)
    if success:
        return jsonify({"message": f"Task {task_id} deleted successfully"})
    return jsonify({"error": "Failed to delete task"}), 400

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """API endpoint: Get lists of all unique user-created categories"""
    categories = database.get_all_categories()
    return jsonify(categories)

if __name__ == '__main__':
    # Start the Flask development server on port 5000
    # debug=True allows automatic server reload upon source changes
    app.run(debug=True, host='127.0.0.1', port=5000)
