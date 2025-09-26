// DOM Elements
const taskForm = document.getElementById('task-form');
const tasksContainer = document.getElementById('tasks-container');
const taskTemplate = document.getElementById('task-template');
const filterPriority = document.getElementById('filter-priority');
const filterStatus = document.getElementById('filter-status');
const searchTask = document.getElementById('search-task');
const pendingCount = document.getElementById('pending-count');
const completedCount = document.getElementById('completed-count');
const navItems = document.querySelectorAll('nav ul li');
const tabContents = document.querySelectorAll('.tab-content');
const calendarDays = document.getElementById('calendar-days');
const currentMonthElement = document.getElementById('current-month');
const prevMonthButton = document.getElementById('prev-month');
const nextMonthButton = document.getElementById('next-month');
const selectedDateElement = document.getElementById('selected-date');
const dayTasksList = document.getElementById('day-tasks-list');
const weeklyProgressBar = document.getElementById('weekly-progress');
const monthlyProgressBar = document.getElementById('monthly-progress');
const subjectStats = document.getElementById('subject-stats');
const timeChart = document.getElementById('time-chart');
const enableNotifications = document.getElementById('enable-notifications');
const notificationTime = document.getElementById('notification-time');
const exportDataButton = document.getElementById('export-data');
const importDataButton = document.getElementById('import-data');
const clearDataButton = document.getElementById('clear-data');

// Data Storage
let tasks = JSON.parse(localStorage.getItem('studyTasks')) || [];
let settings = JSON.parse(localStorage.getItem('studyPlannerSettings')) || {
    enableNotifications: true,
    notificationTime: 24
};

// Initialize the application
function init() {
    renderTasks();
    updateTaskCounts();
    renderCalendar();
    updateProgress();
    loadSettings();
    setupEventListeners();
    checkForDueTasks();
}

// Event Listeners
function setupEventListeners() {
    // Task form submission
    taskForm.addEventListener('submit', addTask);
    
    // Filters
    filterPriority.addEventListener('change', renderTasks);
    filterStatus.addEventListener('change', renderTasks);
    searchTask.addEventListener('input', renderTasks);
    
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const tabId = item.getAttribute('data-tab');
            tabContents.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === tabId) {
                    tab.classList.add('active');
                }
            });
            
            if (tabId === 'calendar') {
                renderCalendar();
            } else if (tabId === 'progress') {
                updateProgress();
            }
        });
    });
    
    // Calendar navigation
    prevMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    // Settings
    enableNotifications.addEventListener('change', saveSettings);
    notificationTime.addEventListener('change', saveSettings);
    exportDataButton.addEventListener('click', exportData);
    importDataButton.addEventListener('click', importData);
    clearDataButton.addEventListener('click', clearData);
}

// Add a new task
function addTask(e) {
    e.preventDefault();
    
    const taskName = document.getElementById('task-name').value;
    const subject = document.getElementById('subject').value;
    const dueDate = document.getElementById('due-date').value;
    const priority = document.getElementById('priority').value;
    const estimatedTime = document.getElementById('estimated-time').value;
    const notes = document.getElementById('notes').value;
    
    const newTask = {
        id: Date.now().toString(),
        name: taskName,
        subject: subject,
        dueDate: dueDate,
        priority: priority,
        estimatedTime: estimatedTime,
        notes: notes,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    saveTasks();
    taskForm.reset();
    renderTasks();
    updateTaskCounts();
    
    // Show notification
    showNotification('Task Added', `"${taskName}" has been added to your study plan.`);
}

// Render tasks based on filters
function renderTasks() {
    const priorityFilter = filterPriority.value;
    const statusFilter = filterStatus.value;
    const searchQuery = searchTask.value.toLowerCase();
    
    // Clear the container
    tasksContainer.innerHTML = '';
    
    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'pending' && !task.completed) || 
                             (statusFilter === 'completed' && task.completed);
        const matchesSearch = task.name.toLowerCase().includes(searchQuery) || 
                             task.subject.toLowerCase().includes(searchQuery) ||
                             (task.notes && task.notes.toLowerCase().includes(searchQuery));
        
        return matchesPriority && matchesStatus && matchesSearch;
    });
    
    // Sort tasks: first by completion status, then by due date, then by priority
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        
        if (a.dueDate !== b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    // Render each task
    filteredTasks.forEach(task => {
        const taskElement = document.importNode(taskTemplate.content, true);
        const taskItem = taskElement.querySelector('.task-item');
        
        taskItem.dataset.id = task.id;
        if (task.completed) {
            taskItem.classList.add('completed');
        }
        
        taskItem.querySelector('.task-title').textContent = task.name;
        
        const priorityElement = taskItem.querySelector('.task-priority');
        priorityElement.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
        priorityElement.classList.add(`priority-${task.priority}`);
        
        taskItem.querySelector('.task-subject').textContent = task.subject;
        taskItem.querySelector('.task-due-date').textContent = formatDate(task.dueDate);
        taskItem.querySelector('.task-time').textContent = task.estimatedTime;
        
        if (task.notes) {
            taskItem.querySelector('.task-notes').textContent = task.notes;
        } else {
            taskItem.querySelector('.task-notes').remove();
        }
        
        // Set up action buttons
        const completeButton = taskItem.querySelector('.btn-complete');
        completeButton.addEventListener('click', () => toggleTaskCompletion(task.id));
        
        const editButton = taskItem.querySelector('.btn-edit');
        editButton.addEventListener('click', () => editTask(task.id));
        
        const deleteButton = taskItem.querySelector('.btn-delete');
        deleteButton.addEventListener('click', () => deleteTask(task.id));
        
        tasksContainer.appendChild(taskItem);
    });
    
    // Show message if no tasks match the filters
    if (filteredTasks.length === 0) {
        tasksContainer.innerHTML = '<p class="no-tasks">No tasks match your filters. Try adjusting your search criteria or add new tasks.</p>';
    }
}

// Toggle task completion status
function toggleTaskCompletion(taskId) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        saveTasks();
        renderTasks();
        updateTaskCounts();
        updateProgress();
        
        const task = tasks[taskIndex];
        if (task.completed) {
            showNotification('Task Completed', `Great job! You've completed "${task.name}".`);
        }
    }
}

// Edit a task
function editTask(taskId) {
    const task = tasks.find(task => task.id === taskId);
    if (!task) return;
    
    // Fill the form with task data
    document.getElementById('task-name').value = task.name;
    document.getElementById('subject').value = task.subject;
    document.getElementById('due-date').value = task.dueDate;
    document.getElementById('priority').value = task.priority;
    document.getElementById('estimated-time').value = task.estimatedTime;
    document.getElementById('notes').value = task.notes || '';
    
    // Scroll to the form
    document.querySelector('.add-task').scrollIntoView({ behavior: 'smooth' });
    
    // Change the form submit button to update
    const submitButton = taskForm.querySelector('button[type="submit"]');
    submitButton.textContent = 'Update Task';
    
    // Remove the old event listener and add a new one for updating
    taskForm.removeEventListener('submit', addTask);
    taskForm.addEventListener('submit', function updateTaskHandler(e) {
        e.preventDefault();
        
        // Update the task
        task.name = document.getElementById('task-name').value;
        task.subject = document.getElementById('subject').value;
        task.dueDate = document.getElementById('due-date').value;
        task.priority = document.getElementById('priority').value;
        task.estimatedTime = document.getElementById('estimated-time').value;
        task.notes = document.getElementById('notes').value;
        
        saveTasks();
        renderTasks();
        updateTaskCounts();
        
        // Reset the form and event listeners
        taskForm.reset();
        submitButton.textContent = 'Add Task';
        taskForm.removeEventListener('submit', updateTaskHandler);
        taskForm.addEventListener('submit', addTask);
        
        showNotification('Task Updated', `"${task.name}" has been updated.`);
    });
}

// Delete a task
function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            const deletedTask = tasks[taskIndex];
            tasks.splice(taskIndex, 1);
            saveTasks();
            renderTasks();
            updateTaskCounts();
            updateProgress();
            
            showNotification('Task Deleted', `"${deletedTask.name}" has been deleted.`);
        }
    }
}

// Update task counts
function updateTaskCounts() {
    const pending = tasks.filter(task => !task.completed).length;
    const completed = tasks.filter(task => task.completed).length;
    
    pendingCount.textContent = pending;
    completedCount.textContent = completed;
}

// Calendar functionality
let currentDate = new Date();
let selectedDate = null;

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update the month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthElement.textContent = `${monthNames[month]} ${year}`;
    
    // Clear the calendar
    calendarDays.innerHTML = '';
    
    // Get the first day of the month and the number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('calendar-day', 'empty');
        calendarDays.appendChild(emptyDay);
    }
    
    // Add days of the month
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = day;
        
        // Check if this day has tasks
        const dateString = formatDateForComparison(new Date(year, month, day));
        const hasTasks = tasks.some(task => formatDateForComparison(new Date(task.dueDate)) === dateString);
        
        if (hasTasks) {
            dayElement.classList.add('has-tasks');
        }
        
        // Check if this is today
        if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) {
            dayElement.classList.add('today');
        }
        
        // Check if this is the selected date
        if (selectedDate && selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day) {
            dayElement.classList.add('selected');
        }
        
        // Add click event to show tasks for this day
        dayElement.addEventListener('click', () => {
            // Remove selected class from all days
            document.querySelectorAll('.calendar-day').forEach(day => day.classList.remove('selected'));
            
            // Add selected class to this day
            dayElement.classList.add('selected');
            
            // Update selected date
            selectedDate = new Date(year, month, day);
            
            // Show tasks for this day
            showTasksForDate(selectedDate);
        });
        
        calendarDays.appendChild(dayElement);
    }
    
    // If no date is selected, select today
    if (!selectedDate) {
        selectedDate = new Date();
        showTasksForDate(selectedDate);
    }
}

// Show tasks for a specific date
function showTasksForDate(date) {
    const dateString = formatDate(date);
    selectedDateElement.textContent = dateString;
    
    // Filter tasks for this date
    const dateForComparison = formatDateForComparison(date);
    const tasksForDate = tasks.filter(task => formatDateForComparison(new Date(task.dueDate)) === dateForComparison);
    
    // Clear the tasks list
    dayTasksList.innerHTML = '';
    
    if (tasksForDate.length === 0) {
        dayTasksList.innerHTML = '<p>No tasks scheduled for this day.</p>';
        return;
    }
    
    // Sort tasks by priority
    tasksForDate.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    // Create a list of tasks
    const taskList = document.createElement('ul');
    taskList.classList.add('day-task-list');
    
    tasksForDate.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.classList.add('day-task-item');
        if (task.completed) {
            taskItem.classList.add('completed');
        }
        
        const taskPriority = document.createElement('span');
        taskPriority.classList.add('task-priority', `priority-${task.priority}`);
        taskPriority.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
        
        const taskName = document.createElement('span');
        taskName.classList.add('task-name');
        taskName.textContent = task.name;
        
        const taskSubject = document.createElement('span');
        taskSubject.classList.add('task-subject');
        taskSubject.textContent = task.subject;
        
        taskItem.appendChild(taskPriority);
        taskItem.appendChild(taskName);
        taskItem.appendChild(taskSubject);
        
        // Add click event to navigate to the task
        taskItem.addEventListener('click', () => {
            // Switch to tasks tab
            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-tab') === 'tasks') {
                    item.classList.add('active');
                }
            });
            
            tabContents.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === 'tasks') {
                    tab.classList.add('active');
                }
            });
            
            // Highlight the task
            setTimeout(() => {
                const taskElement = document.querySelector(`.task-item[data-id="${task.id}"]`);
                if (taskElement) {
                    taskElement.scrollIntoView({ behavior: 'smooth' });
                    taskElement.classList.add('highlight');
                    setTimeout(() => taskElement.classList.remove('highlight'), 2000);
                }
            }, 300);
        });
        
        taskList.appendChild(taskItem);
    });
    
    dayTasksList.appendChild(taskList);
}

// Progress tracking
function updateProgress() {
    // Calculate weekly completion rate
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyTasks = tasks.filter(task => new Date(task.createdAt) >= oneWeekAgo);
    const weeklyCompletedTasks = weeklyTasks.filter(task => task.completed);
    
    const weeklyCompletionRate = weeklyTasks.length > 0 
        ? Math.round((weeklyCompletedTasks.length / weeklyTasks.length) * 100) 
        : 0;
    
    weeklyProgressBar.style.width = `${weeklyCompletionRate}%`;
    weeklyProgressBar.textContent = `${weeklyCompletionRate}%`;
    
    // Calculate monthly completion rate
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const monthlyTasks = tasks.filter(task => new Date(task.createdAt) >= oneMonthAgo);
    const monthlyCompletedTasks = monthlyTasks.filter(task => task.completed);
    
    const monthlyCompletionRate = monthlyTasks.length > 0 
        ? Math.round((monthlyCompletedTasks.length / monthlyTasks.length) * 100) 
        : 0;
    
    monthlyProgressBar.style.width = `${monthlyCompletionRate}%`;
    monthlyProgressBar.textContent = `${monthlyCompletionRate}%`;
    
    // Update subject breakdown
    updateSubjectBreakdown();
    
    // Update time chart
    updateTimeChart();
}

// Update subject breakdown
function updateSubjectBreakdown() {
    // Clear the container
    subjectStats.innerHTML = '';
    
    // Get unique subjects
    const subjects = [...new Set(tasks.map(task => task.subject))];
    
    // For each subject, calculate completion rate
    subjects.forEach(subject => {
        const subjectTasks = tasks.filter(task => task.subject === subject);
        const completedTasks = subjectTasks.filter(task => task.completed);
        const completionRate = Math.round((completedTasks.length / subjectTasks.length) * 100);
        
        const subjectStat = document.createElement('div');
        subjectStat.classList.add('subject-stat');
        
        const subjectName = document.createElement('div');
        subjectName.classList.add('subject-name');
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = subject;
        
        const rateSpan = document.createElement('span');
        rateSpan.textContent = `${completionRate}% Complete`;
        
        subjectName.appendChild(nameSpan);
        subjectName.appendChild(rateSpan);
        
        const progressBarContainer = document.createElement('div');
        progressBarContainer.classList.add('progress-bar-container');
        
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        progressBar.style.width = `${completionRate}%`;
        progressBar.textContent = `${completedTasks.length}/${subjectTasks.length} Tasks`;
        
        progressBarContainer.appendChild(progressBar);
        
        subjectStat.appendChild(subjectName);
        subjectStat.appendChild(progressBarContainer);
        
        subjectStats.appendChild(subjectStat);
    });
    
    // Show message if no subjects
    if (subjects.length === 0) {
        subjectStats.innerHTML = '<p>No subjects to display. Add tasks to see subject breakdown.</p>';
    }
}

// Update time chart
function updateTimeChart() {
    // Clear the container
    timeChart.innerHTML = '';
    
    // Get the last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date);
    }
    
    // For each day, calculate total estimated time for completed tasks
    days.forEach(day => {
        const dateString = formatDateForComparison(day);
        const completedTasks = tasks.filter(task => 
            task.completed && 
            formatDateForComparison(new Date(task.dueDate)) === dateString
        );
        
        const totalTime = completedTasks.reduce((sum, task) => sum + parseInt(task.estimatedTime), 0);
        
        const chartBar = document.createElement('div');
        chartBar.classList.add('chart-bar');
        chartBar.style.height = totalTime > 0 ? `${Math.min(totalTime, 200)}px` : '20px';
        chartBar.setAttribute('data-day', day.toLocaleDateString('en-US', { weekday: 'short' }));
        chartBar.setAttribute('data-time', totalTime);
        
        timeChart.appendChild(chartBar);
    });
}

// Settings
function loadSettings() {
    enableNotifications.checked = settings.enableNotifications;
    notificationTime.value = settings.notificationTime;
}

function saveSettings() {
    settings.enableNotifications = enableNotifications.checked;
    settings.notificationTime = parseInt(notificationTime.value);
    localStorage.setItem('studyPlannerSettings', JSON.stringify(settings));
    
    showNotification('Settings Saved', 'Your settings have been updated.');
}

// Data management
function exportData() {
    const data = {
        tasks: tasks,
        settings: settings
    };
    
    const dataStr = JSON.stringify(data);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'study_planner_data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Data Exported', 'Your data has been exported successfully.');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        
        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        
        reader.onload = readerEvent => {
            try {
                const content = readerEvent.target.result;
                const data = JSON.parse(content);
                
                if (data.tasks && data.settings) {
                    tasks = data.tasks;
                    settings = data.settings;
                    
                    saveTasks();
                    localStorage.setItem('studyPlannerSettings', JSON.stringify(settings));
                    
                    init();
                    
                    showNotification('Data Imported', 'Your data has been imported successfully.');
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (error) {
                showNotification('Import Error', 'Failed to import data. Please make sure the file is valid.');
                console.error('Import error:', error);
            }
        };
    };
    
    input.click();
}

function clearData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        tasks = [];
        settings = {
            enableNotifications: true,
            notificationTime: 24
        };
        
        localStorage.removeItem('studyTasks');
        localStorage.setItem('studyPlannerSettings', JSON.stringify(settings));
        
        init();
        
        showNotification('Data Cleared', 'All your data has been cleared.');
    }
}

// Check for due tasks
function checkForDueTasks() {
    if (!settings.enableNotifications) return;
    
    const now = new Date();
    const notificationTimeHours = settings.notificationTime;
    
    tasks.forEach(task => {
        if (task.completed) return;
        
        const dueDate = new Date(task.dueDate);
        const timeDiff = dueDate - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff > 0 && hoursDiff <= notificationTimeHours) {
            showNotification('Task Due Soon', `"${task.name}" is due in ${Math.round(hoursDiff)} hours.`);
        }
    });
}

// Helper functions
function saveTasks() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateForComparison(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function showNotification(title, message) {
    // Check if the Notification API is supported
    if ('Notification' in window) {
        // Check if permission is already granted
        if (Notification.permission === 'granted') {
            new Notification(title, { body: message });
        }
        // Otherwise, request permission
        else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body: message });
                }
            });
        }
    }
    
    // Fallback for browsers that don't support notifications
    // Create a custom notification element
    const notificationElement = document.createElement('div');
    notificationElement.classList.add('custom-notification');
    
    const notificationTitle = document.createElement('h3');
    notificationTitle.textContent = title;
    
    const notificationMessage = document.createElement('p');
    notificationMessage.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(notificationElement);
    });
    
    notificationElement.appendChild(closeButton);
    notificationElement.appendChild(notificationTitle);
    notificationElement.appendChild(notificationMessage);
    
    document.body.appendChild(notificationElement);
    
    // Add styles for the notification
    const style = document.createElement('style');
    style.textContent = `
        .custom-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: white;
            border-left: 4px solid var(--accent-color);
            padding: 15px;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        }
        
        .custom-notification h3 {
            margin: 0 0 5px 0;
            color: var(--primary-color);
        }
        
        .custom-notification p {
            margin: 0;
            color: var(--dark-color);
        }
        
        .custom-notification button {
            position: absolute;
            top: 5px;
            right: 5px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    
    document.head.appendChild(style);
    
    // Remove the notification after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notificationElement)) {
            document.body.removeChild(notificationElement);
        }
    }, 5000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);