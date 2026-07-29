/**
 * TASKFLOW - FRONTEND CONTROLLER
 * Vanilla JavaScript implementation for state management, API interactions, and UI rendering.
 */

// Application State
const state = {
    tasks: [],
    categories: [],
    filters: {
        status: 'all',     // 'all', 'pending', 'completed'
        priority: null,    // null, 'High', 'Medium', 'Low'
        category: null,    // null, or string value
        search: ''         // Search keyword
    },
    sortBy: 'status-asc',  // 'status-asc', 'date-newest', 'date-oldest', 'due-date', 'priority-desc'
    theme: 'dark'          // 'dark' or 'light'
};

// DOM Elements
const DOM = {
    taskGrid: document.getElementById('taskGridContainer'),
    categoryFilterList: document.getElementById('category-filter-list'),
    searchInput: document.getElementById('taskSearchInput'),
    sortSelect: document.getElementById('taskSortSelect'),
    themeToggleBtn: document.getElementById('themeToggleButton'),
    openModalBtn: document.getElementById('openNewTaskModalBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    modalBackdrop: document.getElementById('taskModalBackdrop'),
    modalTitle: document.getElementById('modalTitleText'),
    taskForm: document.getElementById('taskForm'),
    taskFormId: document.getElementById('taskFormId'),
    taskFormTitle: document.getElementById('taskFormTitle'),
    taskFormDesc: document.getElementById('taskFormDesc'),
    taskFormCategory: document.getElementById('taskFormCategory'),
    taskFormPriority: document.getElementById('taskFormPriority'),
    taskFormDueDate: document.getElementById('taskFormDueDate'),
    toastContainer: document.getElementById('toastContainer'),
    mobileSidebarToggle: document.getElementById('mobileSidebarToggle'),
    sidebar: document.getElementById('appSidebar'),
    currentDateDisplay: document.getElementById('currentDateDisplay'),
    greetingTitle: document.getElementById('greeting-title'),
    activeFiltersTags: document.getElementById('activeFiltersTags'),
    
    // Stats elements
    statsTotal: document.getElementById('stats-total-tasks'),
    statsCompleted: document.getElementById('stats-completed-tasks'),
    statsPending: document.getElementById('stats-pending-tasks'),
    statsPercent: document.getElementById('stats-completion-percent'),
    
    // Sidebar badges
    badgeAll: document.getElementById('count-all'),
    badgePending: document.getElementById('count-pending'),
    badgeCompleted: document.getElementById('count-completed')
};

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initDateTime();
    registerEventListeners();
    fetchAllData();
});

// Load and apply theme from local storage
function initTheme() {
    const savedTheme = localStorage.getItem('taskflow-theme') || 'dark';
    state.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Display current date and greeting
function initDateTime() {
    const now = new Date();
    
    // Format: "Wednesday, July 29, 2026"
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    DOM.currentDateDisplay.textContent = now.toLocaleDateString('en-US', options);
    
    // Set greeting based on hours
    const hour = now.getHours();
    let greeting = "Good morning!";
    if (hour >= 12 && hour < 17) {
        greeting = "Good afternoon!";
    } else if (hour >= 17) {
        greeting = "Good evening!";
    }
    DOM.greetingTitle.textContent = greeting;
}

// Register UI event handlers
function registerEventListeners() {
    // Theme Toggle
    DOM.themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Mobile Sidebar Toggle
    DOM.mobileSidebarToggle.addEventListener('click', () => {
        DOM.sidebar.classList.toggle('mobile-open');
    });
    
    // Close sidebar on clicking outside it in mobile view
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 992 && 
            !DOM.sidebar.contains(e.target) && 
            !DOM.mobileSidebarToggle.contains(e.target)) {
            DOM.sidebar.classList.remove('mobile-open');
        }
    });

    // Filter clicks (Status and Priority)
    document.querySelectorAll('.filter-item').forEach(item => {
        item.addEventListener('click', handleFilterClick);
    });

    // Search Input (with simple debouncing)
    let searchTimeout;
    DOM.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.filters.search = e.target.value;
            fetchTasks();
        }, 300);
    });

    // Sort Dropdown
    DOM.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderTasks();
    });

    // Modal Control
    DOM.openModalBtn.addEventListener('click', () => openModal());
    DOM.closeModalBtn.addEventListener('click', closeModal);
    DOM.cancelModalBtn.addEventListener('click', closeModal);
    DOM.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.modalBackdrop) closeModal();
    });

    // Form Submit
    DOM.taskForm.addEventListener('submit', handleFormSubmit);
}

// -------------------------------------------------------------
// DATA FETCHING & API INTERACTION
// -------------------------------------------------------------
async function fetchAllData() {
    await fetchTasks();
    await fetchCategories();
}

// Fetch tasks from Python Flask API
async function fetchTasks() {
    try {
        // Construct query parameters based on filters
        const params = new URLSearchParams();
        if (state.filters.status !== 'all') {
            params.append('status', state.filters.status);
        }
        if (state.filters.priority) {
            params.append('priority', state.filters.priority);
        }
        if (state.filters.category) {
            params.append('category', state.filters.category);
        }
        if (state.filters.search) {
            params.append('search', state.filters.search);
        }

        const response = await fetch(`/api/tasks?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to load tasks");
        
        state.tasks = await response.json();
        renderTasks();
        updateStats();
    } catch (error) {
        console.error(error);
        showToast("Error loading tasks from server", "error");
        DOM.taskGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon" style="color: var(--color-high);"><i data-lucide="alert-triangle"></i></div>
                <h3>Failed to load tasks</h3>
                <p>Please check your backend connection and reload the page.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

// Fetch categories from Flask API to populate sidebar and dropdown recommendations
async function fetchCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error("Failed to load categories");
        
        state.categories = await response.json();
        renderCategoryFilters();
        
        // Update data list options in the form
        const dataList = document.getElementById('categorySuggestions');
        dataList.innerHTML = '';
        state.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            dataList.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// -------------------------------------------------------------
// UI RENDERING
// -------------------------------------------------------------

// Render task list container (with sorting applied)
function renderTasks() {
    DOM.taskGrid.innerHTML = '';
    
    if (state.tasks.length === 0) {
        DOM.taskGrid.innerHTML = `
            <div class="empty-state animate-scale">
                <div class="empty-state-icon"><i data-lucide="clipboard-list"></i></div>
                <h3>No tasks found</h3>
                <p>Try refining your filters, search term, or create a new task to get started!</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // Sort tasks in memory
    const sortedTasks = [...state.tasks].sort((a, b) => {
        if (state.sortBy === 'status-asc') {
            // Pending first, then newest
            if (a.status === b.status) return new Date(b.created_at) - new Date(a.created_at);
            return a.status === 'pending' ? -1 : 1;
        }
        if (state.sortBy === 'date-newest') {
            return new Date(b.created_at) - new Date(a.created_at);
        }
        if (state.sortBy === 'date-oldest') {
            return new Date(a.created_at) - new Date(b.created_at);
        }
        if (state.sortBy === 'due-date') {
            // Tasks without due date go to the end
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date) - new Date(b.due_date);
        }
        if (state.sortBy === 'priority-desc') {
            const weights = { 'High': 3, 'Medium': 2, 'Low': 1 };
            return weights[b.priority] - weights[a.priority];
        }
        return 0;
    });

    // Create cards and append to container
    sortedTasks.forEach((task, index) => {
        const card = createTaskCard(task);
        // Stagger card entrance animation slightly
        card.style.animationDelay = `${index * 0.05}s`;
        DOM.taskGrid.appendChild(card);
    });

    // Render filter pills
    renderActiveFilterPills();
    
    // Refresh Icons
    lucide.createIcons();
}

// Generate the HTML Element for an individual task card
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card glass-panel priority-${task.priority} status-${task.status} task-card-enter`;
    card.setAttribute('data-id', task.id);

    // Compute Date alerts
    let dateBadgeClass = 'badge-date';
    let dateIcon = 'calendar';
    let formattedDate = 'No due date';
    
    if (task.due_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        // Humanize display date
        const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        formattedDate = dueDate.toLocaleDateString('en-US', dateOptions);

        if (dueDate < today && task.status === 'pending') {
            dateBadgeClass += ' overdue';
            dateIcon = 'alert-circle';
            formattedDate += ' (Overdue)';
        } else if (dueDate.getTime() === today.getTime() && task.status === 'pending') {
            dateBadgeClass += ' due-today';
            dateIcon = 'clock';
            formattedDate = 'Due Today';
        }
    }

    card.innerHTML = `
        <div class="task-checkbox-container">
            <div class="custom-checkbox" onclick="toggleTaskStatus(${task.id}, '${task.status}')" role="checkbox" aria-checked="${task.status === 'completed'}" tabindex="0">
                <i data-lucide="check"></i>
            </div>
        </div>
        <div class="task-content">
            <div class="task-title-row">
                <h4 class="task-title">${escapeHTML(task.title)}</h4>
                <div class="task-actions">
                    <button class="action-btn" onclick="editTask(${task.id})" title="Edit Task" aria-label="Edit Task">
                        <i data-lucide="edit-3" class="icon-sm"></i>
                    </button>
                    <button class="action-btn action-btn-delete" onclick="deleteTaskPrompt(${task.id})" title="Delete Task" aria-label="Delete Task">
                        <i data-lucide="trash-2" class="icon-sm"></i>
                    </button>
                </div>
            </div>
            ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ''}
            <div class="task-meta-row">
                <span class="badge badge-category">
                    <i data-lucide="tag" class="icon-sm"></i>
                    ${escapeHTML(task.category)}
                </span>
                <span class="badge badge-priority-${task.priority.toLowerCase()}">
                    <span class="dot-indicator dot-${task.priority.toLowerCase()}"></span>
                    ${task.priority} Priority
                </span>
                <span class="badge ${dateBadgeClass}">
                    <i data-lucide="${dateIcon}" class="icon-sm"></i>
                    ${formattedDate}
                </span>
            </div>
        </div>
    `;

    return card;
}

// Render dynamic categories inside the sidebar nav
function renderCategoryFilters() {
    DOM.categoryFilterList.innerHTML = '';
    
    if (state.categories.length === 0) {
        DOM.categoryFilterList.innerHTML = `
            <li class="filter-item text-muted" style="cursor: default; font-style: italic;">
                No categories yet
            </li>
        `;
        return;
    }

    state.categories.forEach(cat => {
        const isSelected = state.filters.category === cat;
        const li = document.createElement('li');
        li.className = `filter-item category-item ${isSelected ? 'active' : ''}`;
        li.setAttribute('data-filter', 'category');
        li.setAttribute('data-value', cat);
        
        li.innerHTML = `
            <div class="category-text-wrapper">
                <i data-lucide="hash" class="icon-sm"></i>
                <span>${escapeHTML(cat)}</span>
            </div>
        `;
        
        li.addEventListener('click', handleFilterClick);
        DOM.categoryFilterList.appendChild(li);
    });
}

// Render active filter tag pills on top of task grid
function renderActiveFilterPills() {
    DOM.activeFiltersTags.innerHTML = '';
    
    // Priority pill
    if (state.filters.priority) {
        createFilterPill('Priority: ' + state.filters.priority, () => {
            state.filters.priority = null;
            clearSidebarActiveFilter('priority');
            fetchTasks();
        });
    }

    // Category pill
    if (state.filters.category) {
        createFilterPill('Category: ' + state.filters.category, () => {
            state.filters.category = null;
            clearSidebarActiveFilter('category');
            fetchTasks();
        });
    }
}

function createFilterPill(text, onClear) {
    const pill = document.createElement('div');
    pill.className = 'filter-pill animate-scale';
    pill.innerHTML = `
        <span>${escapeHTML(text)}</span>
        <button aria-label="Clear filter"><i data-lucide="x" class="icon-sm"></i></button>
    `;
    pill.querySelector('button').addEventListener('click', onClear);
    DOM.activeFiltersTags.appendChild(pill);
}

// Clear sidebar selected highlights for specific filter groups
function clearSidebarActiveFilter(filterType) {
    document.querySelectorAll(`.filter-item[data-filter="${filterType}"]`).forEach(item => {
        item.classList.remove('active');
    });
}

// -------------------------------------------------------------
// STATS CALCULATOR
// -------------------------------------------------------------
async function updateStats() {
    try {
        // Fetch all raw tasks to get correct overall statistics, unfiltered
        const res = await fetch('/api/tasks');
        const allTasks = await res.json();
        
        const total = allTasks.length;
        const completed = allTasks.filter(t => t.status === 'completed').length;
        const pending = total - completed;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        DOM.statsTotal.textContent = total;
        DOM.statsCompleted.textContent = completed;
        DOM.statsPending.textContent = pending;
        DOM.statsPercent.textContent = `${pct}% completed`;
        
        // Update sidebar badges
        DOM.badgeAll.textContent = total;
        DOM.badgePending.textContent = pending;
        DOM.badgeCompleted.textContent = completed;
    } catch (e) {
        console.error("Failed to compute statistics:", e);
    }
}

// -------------------------------------------------------------
// EVENT HANDLERS & OPERATIONS
// -------------------------------------------------------------

// Sidebar filter selection handler
function handleFilterClick(e) {
    const item = e.currentTarget;
    const filterType = item.getAttribute('data-filter');
    const filterValue = item.getAttribute('data-value');
    
    if (filterType === 'status') {
        // Highlight active status link
        document.querySelectorAll('.filter-item[data-filter="status"]').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        state.filters.status = filterValue;
    } else if (filterType === 'priority') {
        // Highlight priority filter
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.filter-item[data-filter="priority"]').forEach(el => el.classList.remove('active'));
        
        if (isActive) {
            state.filters.priority = null;
        } else {
            item.classList.add('active');
            state.filters.priority = filterValue;
        }
    } else if (filterType === 'category') {
        // Highlight category filter
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.filter-item[data-filter="category"]').forEach(el => el.classList.remove('active'));
        
        if (isActive) {
            state.filters.category = null;
        } else {
            item.classList.add('active');
            state.filters.category = filterValue;
        }
    }
    
    // Close sidebar on mobile after choosing a filter
    if (window.innerWidth <= 992) {
        DOM.sidebar.classList.remove('mobile-open');
    }
    
    fetchTasks();
}

// Handle Add/Edit task submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const taskId = DOM.taskFormId.value;
    const isEdit = !!taskId;
    
    const taskData = {
        title: DOM.taskFormTitle.value.trim(),
        description: DOM.taskFormDesc.value.trim(),
        category: DOM.taskFormCategory.value.trim() || 'General',
        priority: DOM.taskFormPriority.value,
        due_date: DOM.taskFormDueDate.value || null
    };

    try {
        let url = '/api/tasks';
        let method = 'POST';
        
        if (isEdit) {
            url = `/api/tasks/${taskId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        if (!response.ok) throw new Error("Failed to save task");
        
        showToast(
            isEdit ? "Task updated successfully!" : "New task created successfully!", 
            "success"
        );
        
        closeModal();
        fetchAllData();
    } catch (error) {
        console.error(error);
        showToast("Error processing task submission", "error");
    }
}

// Check/Uncheck task status
async function toggleTaskStatus(taskId, currentStatus) {
    const nextStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });
        
        if (!response.ok) throw new Error("Failed to toggle status");
        
        const updated = await response.json();
        
        // Optimistic UI updates
        state.tasks = state.tasks.map(t => t.id === taskId ? updated : t);
        renderTasks();
        updateStats();
        
        showToast(
            nextStatus === 'completed' ? "Task marked as completed!" : "Task marked as pending",
            nextStatus === 'completed' ? "success" : "info"
        );
    } catch (error) {
        console.error(error);
        showToast("Failed to update task status", "error");
    }
}

// Delete task entry point (Prompt confirmation first)
function deleteTaskPrompt(taskId) {
    if (confirm("Are you sure you want to permanently delete this task?")) {
        deleteTask(taskId);
    }
}

async function deleteTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error("Failed to delete task");
        
        showToast("Task successfully deleted", "info");
        
        // Remove from memory state and re-render
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        renderTasks();
        
        // Refresh stats and categories lists
        updateStats();
        fetchCategories();
    } catch (error) {
        console.error(error);
        showToast("Failed to delete task", "error");
    }
}

// Edit task entry point: Loads details from state and opens modal
function editTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    openModal(task);
}

// Theme toggler logic
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    
    state.theme = next;
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('taskflow-theme', next);
    showToast(`Switched to ${next} theme`, 'info');
}

// -------------------------------------------------------------
// DIALOG CONTROLLER
// -------------------------------------------------------------
function openModal(task = null) {
    DOM.taskForm.reset();
    
    if (task) {
        // Editing existing task
        DOM.modalTitle.textContent = "Edit Task";
        DOM.taskFormId.value = task.id;
        DOM.taskFormTitle.value = task.title;
        DOM.taskFormDesc.value = task.description || '';
        DOM.taskFormCategory.value = task.category || 'General';
        DOM.taskFormPriority.value = task.priority;
        DOM.taskFormDueDate.value = task.due_date || '';
    } else {
        // Adding new task
        DOM.modalTitle.textContent = "Add New Task";
        DOM.taskFormId.value = '';
        DOM.taskFormCategory.value = 'General';
        DOM.taskFormPriority.value = 'Medium';
    }
    
    DOM.modalBackdrop.classList.add('open');
    DOM.taskFormTitle.focus();
}

function closeModal() {
    DOM.modalBackdrop.classList.remove('open');
    DOM.taskForm.reset();
}

// -------------------------------------------------------------
// TOAST COMPONENT
// -------------------------------------------------------------
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
        <div class="toast-icon toast-icon-${type}">
            <i data-lucide="${iconName}"></i>
        </div>
        <div class="toast-body">${escapeHTML(message)}</div>
        <button class="toast-close" aria-label="Close message">
            <i data-lucide="x" class="icon-sm"></i>
        </button>
    `;

    // Attach click handler to close manually
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });

    DOM.toastContainer.appendChild(toast);
    lucide.createIcons(); // Instantiates lucide icon in newly added DOM element

    // Auto delete after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px) scale(0.95)';
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// -------------------------------------------------------------
// UTILITIES
// -------------------------------------------------------------

// Security helper to escape HTML inputs and avoid XSS injections
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
