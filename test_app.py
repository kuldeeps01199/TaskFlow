import unittest
import os
import json
import sqlite3
import database
import app

class TestTaskFlowApp(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Override the database file path to use a test-specific DB
        cls.test_db_path = os.path.join(os.path.dirname(__file__), 'test_tasks.db')
        database.DATABASE_FILE = cls.test_db_path
        
        # Configure Flask app for testing
        app.app.config['TESTING'] = True
        cls.client = app.app.test_client()

    def setUp(self):
        # Initialize test DB tables
        database.init_db()

    def tearDown(self):
        # Clean up database file after each test
        if os.path.exists(self.test_db_path):
            try:
                os.remove(self.test_db_path)
            except PermissionError:
                pass

    def test_database_init(self):
        """Verify database initializes tables and inserts demo tasks"""
        self.assertTrue(os.path.exists(self.test_db_path))
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'")
        table_exists = cursor.fetchone()
        self.assertIsNotNone(table_exists)
        conn.close()

    def test_get_tasks(self):
        """Verify GET /api/tasks returns JSON array of tasks"""
        response = self.client.get('/api/tasks')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0) # Should contain loaded dummy tasks

    def test_create_task(self):
        """Verify POST /api/tasks successfully adds a new task"""
        new_task = {
            "title": "Learn Flask Testing",
            "description": "Write and run unit tests for Flask REST API endpoints.",
            "category": "Testing",
            "priority": "High",
            "due_date": "2026-08-05"
        }
        
        response = self.client.post(
            '/api/tasks',
            data=json.dumps(new_task),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        
        data = json.loads(response.data)
        self.assertIn("id", data)
        self.assertEqual(data["title"], "Learn Flask Testing")
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["category"], "Testing")
        self.assertEqual(data["priority"], "High")

    def test_create_task_missing_title(self):
        """Verify POST /api/tasks rejects payloads with blank titles"""
        bad_task = {
            "description": "No title specified"
        }
        
        response = self.client.post(
            '/api/tasks',
            data=json.dumps(bad_task),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_update_task(self):
        """Verify PUT /api/tasks/<id> modifies task properties"""
        # Create a task to modify
        task_id = database.create_task("Temp Task", "Temp description")
        
        update_data = {
            "title": "Updated Temp Task",
            "status": "completed",
            "priority": "Low"
        }
        
        response = self.client.put(
            f'/api/tasks/{task_id}',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(data["title"], "Updated Temp Task")
        self.assertEqual(data["status"], "completed")
        self.assertEqual(data["priority"], "Low")

    def test_delete_task(self):
        """Verify DELETE /api/tasks/<id> removes task from database"""
        task_id = database.create_task("To Delete", "Delete test description")
        
        # Verify it exists
        task = database.get_task_by_id(task_id)
        self.assertIsNotNone(task)
        
        # Delete task
        response = self.client.delete(f'/api/tasks/{task_id}')
        self.assertEqual(response.status_code, 200)
        
        # Verify it is deleted
        task = database.get_task_by_id(task_id)
        self.assertIsNone(task)

    def test_get_categories(self):
        """Verify GET /api/categories returns a list of unique categories"""
        response = self.client.get('/api/categories')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        # Should contain 'Work', 'Personal', 'Coding', 'General' from pre-loaded tasks
        self.assertIn("Work", data)
        self.assertIn("Personal", data)

if __name__ == '__main__':
    unittest.main()
