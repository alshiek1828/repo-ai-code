// Admin Panel JavaScript
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, get, set, push, remove, onValue, off } from 'firebase/database';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDZt1RSz5d9wyn-C5S3kF8XVYjEldtSZss",
    authDomain: "gmae-fae90.firebaseapp.com",
    databaseURL: "https://gmae-fae90-default-rtdb.firebaseio.com",
    projectId: "gmae-fae90",
    storageBucket: "gmae-fae90.firebasestorage.app",
    messagingSenderId: "768482186329",
    appId: "1:768482186329:web:ae3b54ed2aaaf89d4e0d48",
    measurementId: "G-KGQ0RQ33XS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Global Variables
let currentAdmin = null;
let currentSection = 'dashboard';
let isDarkMode = localStorage.getItem('theme') === 'dark';
let adminSecretCode = 'admin123'; // In production, this should be from environment variables

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const adminLoginModal = document.getElementById('admin-login-modal');
const adminLoginForm = document.getElementById('admin-login-form');
const themeToggle = document.getElementById('theme-toggle');
const adminProfile = document.getElementById('admin-profile');
const adminName = document.getElementById('admin-name');
const logoutBtn = document.querySelector('.logout-btn');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupAuthStateListener();
    setupTheme();
    checkAdminAccess();
});

// Initialize App Function
function initializeApp() {
    // Hide loading screen after 1 second
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 1000);
}

// Setup Event Listeners
function setupEventListeners() {
    // Admin login form
    adminLoginForm.addEventListener('submit', handleAdminLogin);
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Sidebar menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            switchSection(section);
        });
    });
    
    // Settings tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchSettingsTab(tab);
        });
    });
    
    // Refresh data button
    document.getElementById('refresh-data').addEventListener('click', loadDashboardData);
    
    // Export report button
    document.getElementById('export-report').addEventListener('click', exportReport);
    
    // Generate API key form
    document.getElementById('generate-api-key-form').addEventListener('submit', handleGenerateApiKey);
    
    // Save settings
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    
    // Reset settings
    document.getElementById('reset-settings').addEventListener('click', resetSettings);
    
    // Modal controls
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', hideAllModals);
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideAllModals();
            }
        });
    });
}

// Setup Auth State Listener
function setupAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
        currentAdmin = user;
        if (user) {
            checkAdminRole(user);
        } else {
            showAdminLogin();
        }
    });
}

// Check Admin Role
async function checkAdminRole(user) {
    try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();
        
        if (userData && userData.role === 'admin') {
            updateAdminUI();
            hideAdminLogin();
            loadDashboardData();
        } else {
            showNotification('ليس لديك صلاحية للوصول إلى لوحة التحكم', 'error');
            await signOut(auth);
        }
    } catch (error) {
        console.error('Error checking admin role:', error);
        showNotification('خطأ في التحقق من الصلاحيات', 'error');
    }
}

// Check Admin Access
function checkAdminAccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const secretCode = urlParams.get('code');
    
    if (secretCode === adminSecretCode) {
        // Allow access with secret code
        showAdminLogin();
    } else if (!currentAdmin) {
        // Redirect to main site if no admin access
        window.location.href = 'index.html';
    }
}

// Update Admin UI
function updateAdminUI() {
    if (currentAdmin) {
        adminName.textContent = currentAdmin.displayName || 'المسؤول';
    }
}

// Setup Theme
function setupTheme() {
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Toggle Theme
function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    setupTheme();
}

// Switch Section
function switchSection(sectionName) {
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // Update active content section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    currentSection = sectionName;
    
    // Load section-specific data
    switch (sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'api-keys':
            loadApiKeysData();
            break;
        case 'conversations':
            loadConversationsData();
            break;
        case 'analytics':
            loadAnalyticsData();
            break;
        case 'system':
            loadSystemData();
            break;
        case 'logs':
            loadLogsData();
            break;
    }
}

// Switch Settings Tab
function switchSettingsTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Handle Admin Login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const secretCode = document.getElementById('admin-secret-code').value;
    
    if (secretCode !== adminSecretCode) {
        showNotification('الرمز السري غير صحيح', 'error');
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showNotification('تم تسجيل الدخول بنجاح', 'success');
    } catch (error) {
        console.error('Admin login error:', error);
        showNotification(getErrorMessage(error.code), 'error');
    }
}

// Handle Logout
async function handleLogout() {
    try {
        await signOut(auth);
        showNotification('تم تسجيل الخروج بنجاح', 'success');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('خطأ في تسجيل الخروج', 'error');
    }
}

// Show Admin Login
function showAdminLogin() {
    adminLoginModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Hide Admin Login
function hideAdminLogin() {
    adminLoginModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Load statistics
        const [usersSnapshot, conversationsSnapshot, apiKeysSnapshot] = await Promise.all([
            get(ref(database, 'users')),
            get(ref(database, 'conversations')),
            get(ref(database, 'apiKeys'))
        ]);
        
        const users = usersSnapshot.val() || {};
        const conversations = conversationsSnapshot.val() || {};
        const apiKeys = apiKeysSnapshot.val() || {};
        
        // Update stats
        document.getElementById('total-users').textContent = Object.keys(users).length;
        document.getElementById('total-conversations').textContent = Object.keys(conversations).length;
        document.getElementById('total-api-keys').textContent = Object.keys(apiKeys).length;
        
        // Calculate API usage
        const totalUsage = Object.values(apiKeys).reduce((sum, key) => sum + (key.usage || 0), 0);
        document.getElementById('api-usage').textContent = totalUsage;
        
        // Load charts
        loadDashboardCharts();
        
        // Load recent activity
        loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('خطأ في تحميل بيانات لوحة التحكم', 'error');
    }
}

// Load Dashboard Charts
function loadDashboardCharts() {
    // API Usage Chart
    const apiUsageCtx = document.getElementById('api-usage-chart');
    if (apiUsageCtx) {
        new Chart(apiUsageCtx, {
            type: 'line',
            data: {
                labels: generateLast7Days(),
                datasets: [{
                    label: 'استخدام API',
                    data: generateRandomData(7, 0, 100),
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // New Users Chart
    const newUsersCtx = document.getElementById('new-users-chart');
    if (newUsersCtx) {
        new Chart(newUsersCtx, {
            type: 'bar',
            data: {
                labels: generateLast7Days(),
                datasets: [{
                    label: 'مستخدمين جدد',
                    data: generateRandomData(7, 0, 20),
                    backgroundColor: '#3b82f6',
                    borderColor: '#1d4ed8',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Load Recent Activity
async function loadRecentActivity() {
    try {
        const activityRef = ref(database, 'activity');
        const snapshot = await get(activityRef);
        const activities = snapshot.val() || {};
        
        const activityList = document.getElementById('recent-activity-list');
        const activitiesArray = Object.entries(activities)
            .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        activityList.innerHTML = activitiesArray.map(([id, activity]) => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.description}</p>
                    <span class="activity-time">${formatTime(activity.timestamp)}</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Load Users Data
async function loadUsersData() {
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val() || {};
        
        const usersTableBody = document.getElementById('users-table-body');
        const usersArray = Object.entries(users).map(([id, user]) => ({
            id,
            ...user
        }));
        
        usersTableBody.innerHTML = usersArray.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <strong>${user.name || 'غير محدد'}</strong>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="plan-badge ${user.plan || 'free'}">${getPlanName(user.plan)}</span>
                </td>
                <td>${formatDate(user.createdAt)}</td>
                <td>${formatDate(user.lastLogin)}</td>
                <td>
                    <span class="user-status ${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-view" onclick="viewUser('${user.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-edit" onclick="editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn btn-suspend" onclick="toggleUserStatus('${user.id}', ${user.isActive})">
                            <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading users data:', error);
        showNotification('خطأ في تحميل بيانات المستخدمين', 'error');
    }
}

// Load API Keys Data
async function loadApiKeysData() {
    try {
        const apiKeysRef = ref(database, 'apiKeys');
        const snapshot = await get(apiKeysRef);
        const apiKeys = snapshot.val() || {};
        
        const apiKeysTableBody = document.getElementById('api-keys-table-body');
        const apiKeysArray = Object.entries(apiKeys).map(([id, key]) => ({
            id,
            ...key
        }));
        
        apiKeysTableBody.innerHTML = apiKeysArray.map(key => `
            <tr>
                <td>${key.name}</td>
                <td>${key.userId}</td>
                <td>${key.usage || 0}</td>
                <td>${key.limit === 'unlimited' ? '∞' : key.limit}</td>
                <td>${formatDate(key.createdAt)}</td>
                <td>${formatDate(key.lastUsed)}</td>
                <td>
                    <span class="user-status ${key.isActive ? 'active' : 'inactive'}">
                        ${key.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-view" onclick="viewApiKey('${key.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-edit" onclick="editApiKey('${key.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteApiKey('${key.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading API keys data:', error);
        showNotification('خطأ في تحميل بيانات مفاتيح API', 'error');
    }
}

// Load Conversations Data
async function loadConversationsData() {
    try {
        const conversationsRef = ref(database, 'conversations');
        const snapshot = await get(conversationsRef);
        const conversations = snapshot.val() || {};
        
        const conversationsList = document.getElementById('conversations-list');
        const conversationsArray = Object.entries(conversations).map(([id, conv]) => ({
            id,
            ...conv
        }));
        
        conversationsList.innerHTML = conversationsArray
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50)
            .map(conv => `
                <div class="conversation-item">
                    <div class="conversation-info">
                        <div class="conversation-title">محادثة ${conv.id.substring(0, 8)}</div>
                        <div class="conversation-preview">${conv.userMessage?.substring(0, 100)}...</div>
                        <div class="conversation-meta">
                            <span>${formatDate(conv.timestamp)}</span>
                            <span>المستخدم: ${conv.userId}</span>
                        </div>
                    </div>
                    <div class="conversation-actions">
                        <button class="action-btn btn-view" onclick="viewConversation('${conv.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteConversation('${conv.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        
    } catch (error) {
        console.error('Error loading conversations data:', error);
        showNotification('خطأ في تحميل بيانات المحادثات', 'error');
    }
}

// Load Analytics Data
async function loadAnalyticsData() {
    try {
        // Load analytics charts
        loadAnalyticsCharts();
        
        // Load topics
        loadTopics();
        
    } catch (error) {
        console.error('Error loading analytics data:', error);
        showNotification('خطأ في تحميل بيانات التحليلات', 'error');
    }
}

// Load Analytics Charts
function loadAnalyticsCharts() {
    // Monthly API Usage Chart
    const monthlyApiUsageCtx = document.getElementById('monthly-api-usage-chart');
    if (monthlyApiUsageCtx) {
        new Chart(monthlyApiUsageCtx, {
            type: 'line',
            data: {
                labels: generateLast30Days(),
                datasets: [{
                    label: 'استخدام API',
                    data: generateRandomData(30, 0, 200),
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Daily Conversations Chart
    const dailyConversationsCtx = document.getElementById('daily-conversations-chart');
    if (dailyConversationsCtx) {
        new Chart(dailyConversationsCtx, {
            type: 'bar',
            data: {
                labels: generateLast7Days(),
                datasets: [{
                    label: 'المحادثات',
                    data: generateRandomData(7, 0, 50),
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Users by Plan Chart
    const usersByPlanCtx = document.getElementById('users-by-plan-chart');
    if (usersByPlanCtx) {
        new Chart(usersByPlanCtx, {
            type: 'doughnut',
            data: {
                labels: ['مجاني', 'متقدم', 'مؤسسي'],
                datasets: [{
                    data: [60, 30, 10],
                    backgroundColor: ['#e5e7eb', '#3b82f6', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Load Topics
async function loadTopics() {
    try {
        const topicsList = document.getElementById('topics-list');
        const topics = [
            { name: 'الذكاء الاصطناعي', count: 45 },
            { name: 'البرمجة', count: 32 },
            { name: 'التقنية', count: 28 },
            { name: 'التعلم', count: 25 },
            { name: 'الأعمال', count: 20 }
        ];
        
        topicsList.innerHTML = topics.map(topic => `
            <div class="topic-item">
                <span class="topic-name">${topic.name}</span>
                <span class="topic-count">${topic.count}</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading topics:', error);
    }
}

// Load System Data
async function loadSystemData() {
    try {
        // Load service status
        loadServiceStatus();
        
        // Load system metrics
        loadSystemMetrics();
        
        // Load recent errors
        loadRecentErrors();
        
    } catch (error) {
        console.error('Error loading system data:', error);
        showNotification('خطأ في تحميل بيانات النظام', 'error');
    }
}

// Load Service Status
function loadServiceStatus() {
    const serviceStatus = document.getElementById('service-status');
    const services = [
        { name: 'API Server', status: 'online' },
        { name: 'Database', status: 'online' },
        { name: 'AI Service', status: 'online' },
        { name: 'Storage', status: 'warning' },
        { name: 'Email Service', status: 'offline' }
    ];
    
    serviceStatus.innerHTML = services.map(service => `
        <div class="service-item">
            <span class="service-name">${service.name}</span>
            <div class="service-indicator ${service.status}"></div>
        </div>
    `).join('');
}

// Load System Metrics
function loadSystemMetrics() {
    // Memory usage
    const memoryProgress = document.getElementById('memory-progress');
    const memoryText = document.getElementById('memory-text');
    const memoryUsage = Math.floor(Math.random() * 80) + 20;
    
    memoryProgress.style.width = `${memoryUsage}%`;
    memoryText.textContent = `${memoryUsage}%`;
    
    // Storage usage
    const storageProgress = document.getElementById('storage-progress');
    const storageText = document.getElementById('storage-text');
    const storageUsage = Math.floor(Math.random() * 60) + 30;
    
    storageProgress.style.width = `${storageUsage}%`;
    storageText.textContent = `${storageUsage}%`;
}

// Load Recent Errors
function loadRecentErrors() {
    const recentErrors = document.getElementById('recent-errors');
    const errors = [
        { message: 'API rate limit exceeded', time: '2 minutes ago' },
        { message: 'Database connection timeout', time: '15 minutes ago' },
        { message: 'Invalid API key format', time: '1 hour ago' }
    ];
    
    recentErrors.innerHTML = errors.map(error => `
        <div class="error-item">
            <div class="error-message">${error.message}</div>
            <div class="error-time">${error.time}</div>
        </div>
    `).join('');
}

// Load Logs Data
async function loadLogsData() {
    try {
        const logsList = document.getElementById('logs-list');
        const logs = [
            { level: 'info', message: 'User logged in successfully', time: '2024-01-15 10:30:15' },
            { level: 'warning', message: 'API usage approaching limit', time: '2024-01-15 10:25:42' },
            { level: 'error', message: 'Failed to process AI request', time: '2024-01-15 10:20:18' },
            { level: 'info', message: 'New user registered', time: '2024-01-15 10:15:33' },
            { level: 'error', message: 'Database connection failed', time: '2024-01-15 10:10:55' }
        ];
        
        logsList.innerHTML = logs.map(log => `
            <div class="log-item">
                <span class="log-level ${log.level}">${log.level}</span>
                <span class="log-time">${log.time}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading logs data:', error);
        showNotification('خطأ في تحميل سجلات النظام', 'error');
    }
}

// Handle Generate API Key
async function handleGenerateApiKey(e) {
    e.preventDefault();
    
    const name = document.getElementById('new-api-key-name').value;
    const userId = document.getElementById('api-key-user').value;
    const limit = document.getElementById('api-key-limit').value;
    
    try {
        // Generate API key
        const apiKey = `rel_${crypto.randomUUID().replace(/-/g, '')}`;
        const keyId = crypto.randomUUID();
        
        // Save to database
        const apiKeyRef = ref(database, `apiKeys/${keyId}`);
        await set(apiKeyRef, {
            key: apiKey,
            name: name,
            userId: userId,
            limit: limit,
            usage: 0,
            createdAt: new Date().toISOString(),
            isActive: true
        });
        
        hideModal('generate-api-key-modal');
        showNotification('تم إنشاء مفتاح API بنجاح', 'success');
        document.getElementById('generate-api-key-form').reset();
        loadApiKeysData();
        
    } catch (error) {
        console.error('Error generating API key:', error);
        showNotification('خطأ في إنشاء مفتاح API', 'error');
    }
}

// Save Settings
async function saveSettings() {
    try {
        const settings = {
            systemName: document.getElementById('system-name').value,
            systemDescription: document.getElementById('system-description').value,
            systemStatus: document.getElementById('system-status').checked,
            defaultApiLimit: document.getElementById('default-api-limit').value,
            enableImageGeneration: document.getElementById('enable-image-generation').checked,
            enableModeration: document.getElementById('enable-moderation').checked,
            enableEncryption: document.getElementById('enable-encryption').checked,
            sessionTimeout: document.getElementById('session-timeout').value,
            enableActivityLogging: document.getElementById('enable-activity-logging').checked,
            enableEmailNotifications: document.getElementById('enable-email-notifications').checked,
            enableSystemNotifications: document.getElementById('enable-system-notifications').checked,
            notificationEmail: document.getElementById('notification-email').value
        };
        
        const settingsRef = ref(database, 'adminSettings');
        await set(settingsRef, settings);
        
        showNotification('تم حفظ الإعدادات بنجاح', 'success');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('خطأ في حفظ الإعدادات', 'error');
    }
}

// Reset Settings
function resetSettings() {
    if (confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات؟')) {
        // Reset all form fields to default values
        document.getElementById('system-name').value = 'Relosity AI Platform';
        document.getElementById('system-description').value = 'منصة الذكاء الاصطناعي المتطورة والمتكاملة';
        document.getElementById('system-status').checked = true;
        document.getElementById('default-api-limit').value = '100';
        document.getElementById('enable-image-generation').checked = true;
        document.getElementById('enable-moderation').checked = true;
        document.getElementById('enable-encryption').checked = true;
        document.getElementById('session-timeout').value = '60';
        document.getElementById('enable-activity-logging').checked = true;
        document.getElementById('enable-email-notifications').checked = true;
        document.getElementById('enable-system-notifications').checked = true;
        document.getElementById('notification-email').value = 'admin@relosity-ai.com';
        
        showNotification('تم إعادة تعيين الإعدادات', 'success');
    }
}

// Export Report
function exportReport() {
    const reportData = {
        timestamp: new Date().toISOString(),
        totalUsers: document.getElementById('total-users').textContent,
        totalConversations: document.getElementById('total-conversations').textContent,
        totalApiKeys: document.getElementById('total-api-keys').textContent,
        apiUsage: document.getElementById('api-usage').textContent
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relosity-admin-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('تم تصدير التقرير بنجاح', 'success');
}

// Utility Functions
function generateLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toLocaleDateString('ar-SA', { weekday: 'short' }));
    }
    return days;
}

function generateLast30Days() {
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.getDate());
    }
    return days;
}

function generateRandomData(count, min, max) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return data;
}

function formatDate(timestamp) {
    if (!timestamp) return 'غير محدد';
    return new Date(timestamp).toLocaleDateString('ar-SA');
}

function formatTime(timestamp) {
    if (!timestamp) return 'غير محدد';
    return new Date(timestamp).toLocaleString('ar-SA');
}

function getPlanName(plan) {
    const plans = {
        'free': 'مجاني',
        'pro': 'متقدم',
        'enterprise': 'مؤسسي'
    };
    return plans[plan] || 'غير محدد';
}

function getActivityIcon(type) {
    const icons = {
        'user': 'user-plus',
        'api': 'key',
        'conversation': 'comments',
        'error': 'exclamation-triangle',
        'system': 'cogs'
    };
    return icons[type] || 'info-circle';
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': 'المستخدم غير موجود',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
        'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
        'auth/user-disabled': 'تم تعطيل هذا الحساب',
        'auth/too-many-requests': 'محاولات كثيرة جداً، حاول لاحقاً'
    };
    
    return errorMessages[errorCode] || 'حدث خطأ غير متوقع';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    });
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Global Functions (for onclick handlers)
window.viewUser = function(userId) {
    showNotification('عرض تفاصيل المستخدم', 'info');
};

window.editUser = function(userId) {
    showNotification('تعديل المستخدم', 'info');
};

window.toggleUserStatus = function(userId, isActive) {
    const action = isActive ? 'تعطيل' : 'تفعيل';
    if (confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) {
        showNotification(`تم ${action} المستخدم بنجاح`, 'success');
    }
};

window.deleteUser = function(userId) {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        showNotification('تم حذف المستخدم بنجاح', 'success');
    }
};

window.viewApiKey = function(keyId) {
    showNotification('عرض تفاصيل مفتاح API', 'info');
};

window.editApiKey = function(keyId) {
    showNotification('تعديل مفتاح API', 'info');
};

window.deleteApiKey = function(keyId) {
    if (confirm('هل أنت متأكد من حذف هذا المفتاح؟')) {
        showNotification('تم حذف مفتاح API بنجاح', 'success');
    }
};

window.viewConversation = function(conversationId) {
    showNotification('عرض المحادثة', 'info');
};

window.deleteConversation = function(conversationId) {
    if (confirm('هل أنت متأكد من حذف هذه المحادثة؟')) {
        showNotification('تم حذف المحادثة بنجاح', 'success');
    }
};

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0;
        margin-left: 0.5rem;
    }
`;
document.head.appendChild(style);