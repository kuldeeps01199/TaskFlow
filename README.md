# TaskFlow — Modern Python To-Do Task Manager

TaskFlow is a premium, lightweight, features-rich To-Do & Task Manager built using a Python Flask backend, SQLite database persistence, and a highly polished vanilla HTML, CSS, and JavaScript frontend.

It features a unique, modern glassmorphic dashboard design, supporting custom categories, priorities, due dates, interactive stats, smooth search and filtering, and full light/dark theme switching.

---

## 🌟 Key Features

1. **Clean & Premium UI**: Built with modern CSS rules featuring glassmorphism (backdrop blurs, subtle border glow effects, dark/light theme toggle, custom checkboxes, and responsive slide-in menus).
2. **Dynamic Task Customization**: Supports task title, descriptions, custom categories, due-date management (with color-coded overdue/due-today warnings), and High/Medium/Low priority badges.
3. **Interactive Dashboard Stats**: Watch completion statistics update dynamically! Shows total, pending, and completed tasks along with a percentage completion bar.
4. **Rich Sorting & Filtering**:
   - Filter by Status (Pending, Completed, All)
   - Filter by Priority (High, Medium, Low)
   - Filter by dynamic category tags generated in real-time
   - Instant text search across title and description
   - Sort tasks by creation order, status, priority, or due-date
5. **Persistent Storage**: Utilizes SQLite for robust and fast local data persistence. Saves theme selections in your browser's local storage.
6. **Toast Notifications & Micro-animations**: Provides animated notifications for every action (Task added, updated, deleted, completed, or theme shifted) to create a premium user experience.

---

## 📂 Project Structure

```
to do app/
│
├── app.py                  # Flask REST API endpoints and web server
├── database.py             # SQLite helper methods for CRUD operations
├── test_app.py             # Automated unit tests for database and routes
├── requirements.txt        # Python dependency list
├── README.md               # User manual and architecture guide
│
└── static/                 # Frontend assets served by Flask
    ├── index.html          # HTML5 layout (includes fonts and icon CDNs)
    ├── style.css           # Styling system (custom variables, themes, animations)
    └── app.js              # State controller, API fetch calls, and DOM rendering
```

---

## ⚙️ Setup and Installation

### 1. Prerequisites
Ensure you have **Python 3.8+** installed. You can check your version by running:
```bash
python --version
```

### 2. Install Dependencies
Navigate into the project directory and install Flask:
```bash
pip install -r requirements.txt
```

### 3. Run the Application
Start the Flask local development server:
```bash
python app.py
```
After running, Flask will launch the server locally. Open your browser and go to:
```
http://127.0.0.1:5000
```
*(The server will automatically create `tasks.db` on launch and prepopulate it with standard demo tasks so you can see it in action immediately!)*

### 4. Running Tests
You can run the automated unit test suite using python's built-in `unittest` runner:
```bash
python -m unittest test_app.py
```

---

## 🔌 API Endpoints Reference

The backend operates as a REST API. All payloads are transferred in JSON format:

| Method | Endpoint | Description | Query Parameters / JSON Fields |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Serves the HTML homepage | None |
| **GET** | `/api/tasks` | Returns list of tasks | `status`, `priority`, `category`, `search` |
| **POST** | `/api/tasks` | Creates a new task | `{ title*, description, category, priority, due_date }` |
| **PUT** | `/api/tasks/<id>` | Modifies a task | `{ title, description, category, priority, due_date, status }` |
| **DELETE** | `/api/tasks/<id>` | Deletes a task | None |
| **GET** | `/api/categories` | Returns all unique categories | None |


