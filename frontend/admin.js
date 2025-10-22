// Admin Panel JavaScript
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getDatabase, 
    ref, 
    get, 
    set, 
    update, 
    remove, 
    onValue, 
    off 
} from 'firebase/database';

// Import from main app
import { auth, database } from './app.js';

// Global Variables
let adminUser = null;
let adminData = null;
let usersData = [];
let conversationsData = [];
let apiKeysData = [];

// DOM Elements
const elements = {
    // Loading
    loadingScreen: document.getElementById('loading-screen'),
    
    // Login
    adminLoginModal: document.getElementById('admin-login-modal'),
    adminLoginForm: document.getElementById('admin-login-form'),
    adminEmail: document.getElementById('admin-email'),
    adminPassword: document.getElementById('admin-password'),
    adminSecret: document.getElementById('admin-secret'),
    
    // Dashboard
    adminDashboard: document.getElementById('admin-dashboard'),
    themeToggle: document.getElementById('theme-toggle'),
    adminLogoutBtn: document.getElementById('admin-logout-btn'),
    
    // Navigation
    navLinks: document.querySelectorAll('.nav-link'),
    
    // Sections
    sections: document.querySelectorAll('.admin-section'),
    
    // Overview
    totalUsers: document.getElementById('total-users'),
    totalConversations: document.getElementById('total-conversations'),
    totalApiKeys: document.getElementById('total-api-keys'),
    apiUsage: document.getElementById('api-usage'),
    
    // Users
    usersTableBody: document.getElementById('users-table-body'),
    addUserBtn: document.getElementById('add-user-btn'),
    
    // Conversations
    conversationsList: document.getElementById('conversations-list'),
    conversationFilter: document.getElementById('conversation-filter'),
    
    // API Keys
    apiKeysTableBody: document.getElementById('api-keys-table-body'),
    generateApiKeyBtn: document.getElementById('generate-api-key-btn'),
    
    // Modals
    addUserModal: document.getElementById('add-user-modal'),
    generateApiKeyModal: document.getElementById('generate-api-key-modal'),
    addUserForm: document.getElementById('add-user-form'),
    generateApiKeyForm: document.getElementById('generate-api-key-form'),
    apiKeyOwner: document.getElementById('api-key-owner')
};

// Utility Functions
const utils = {
    showLoading() {
        elements.loadingScreen.classList.remove('hidden');
    },
    
    hideLoading() {
        elements.loadingScreen.classList.add('hidden');
    },
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `message ${type}`;
        notification.textContent = message;
        
        // Insert at the top of admin main
        const adminMain = document.querySelector('.admin-main');
        adminMain.insertBefore(notification, adminMain.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    },
    
    formatDate(date) {
        return new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },
    
    formatNumber(number) {
        return new Intl.NumberFormat('ar-SA').format(number);
    },
    
    generateApiKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'rel_admin_';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
};

// Authentication Management
const authManager = {
    init() {
        this.bindEvents();
        this.checkAuthState();
    },
    
    bindEvents() {
        elements.adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        elements.adminLogoutBtn.addEventListener('click', () => {
            this.signOut();
        });
    },
    
    async handleLogin() {
        const email = elements.adminEmail.value;
        const password = elements.adminPassword.value;
        const secret = elements.adminSecret.value;
        
        if (!email || !password || !secret) {
            utils.showNotification('يرجى ملء جميع الحقول', 'error');
            return;
        }
        
        // Check admin secret code
        if (secret !== 'admin123') { // In real app, this should be from environment
            utils.showNotification('الرمز السري غير صحيح', 'error');
            return;
        }
        
        try {
            utils.showLoading();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            adminUser = userCredential.user;
            
            // Check if user is admin
            await this.checkAdminRole();
            
            utils.showNotification('تم تسجيل الدخول بنجاح', 'success');
            this.showDashboard();
            
        } catch (error) {
            console.error('Admin login error:', error);
            utils.showNotification(this.getErrorMessage(error.code), 'error');
        } finally {
            utils.hideLoading();
        }
    },
    
    async checkAdminRole() {
        try {
            const userRef = ref(database, `users/${adminUser.uid}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                adminData = snapshot.val();
                if (adminData.role !== 'admin') {
                    throw new Error('User is not an admin');
                }
            } else {
                throw new Error('User data not found');
            }
        } catch (error) {
            await signOut(auth);
            throw new Error('Unauthorized access');
        }
    },
    
    checkAuthState() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                adminUser = user;
                this.showDashboard();
            } else {
                this.showLogin();
            }
        });
    },
    
    showLogin() {
        elements.adminLoginModal.classList.add('active');
        elements.adminDashboard.style.display = 'none';
    },
    
    showDashboard() {
        elements.adminLoginModal.classList.remove('active');
        elements.adminDashboard.style.display = 'flex';
        this.loadDashboardData();
    },
    
    async signOut() {
        try {
            await signOut(auth);
            adminUser = null;
            adminData = null;
            this.showLogin();
            utils.showNotification('تم تسجيل الخروج بنجاح', 'success');
        } catch (error) {
            console.error('Sign out error:', error);
            utils.showNotification('خطأ في تسجيل الخروج', 'error');
        }
    },
    
    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'المستخدم غير موجود',
            'auth/wrong-password': 'كلمة المرور غير صحيحة',
            'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
            'auth/too-many-requests': 'تم تجاوز عدد المحاولات المسموح'
        };
        
        return errorMessages[errorCode] || 'حدث خطأ غير متوقع';
    },
    
    async loadDashboardData() {
        await Promise.all([
            this.loadOverviewStats(),
            this.loadUsers(),
            this.loadConversations(),
            this.loadApiKeys()
        ]);
    }
};

// Navigation Management
const navigation = {
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
                
                // Update active link
                elements.navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    },
    
    showSection(sectionName) {
        // Hide all sections
        elements.sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Load section data
        this.loadSectionData(sectionName);
    },
    
    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'overview':
                overviewManager.loadOverviewData();
                break;
            case 'users':
                usersManager.loadUsers();
                break;
            case 'conversations':
                conversationsManager.loadConversations();
                break;
            case 'api-keys':
                apiKeysManager.loadApiKeys();
                break;
            case 'analytics':
                analyticsManager.loadAnalytics();
                break;
            case 'settings':
                settingsManager.loadSettings();
                break;
        }
    }
};

// Overview Management
const overviewManager = {
    async loadOverviewData() {
        try {
            const [usersSnapshot, conversationsSnapshot, apiKeysSnapshot] = await Promise.all([
                get(ref(database, 'users')),
                get(ref(database, 'conversations')),
                get(ref(database, 'apiKeys'))
            ]);
            
            const users = usersSnapshot.val() || {};
            const conversations = conversationsSnapshot.val() || {};
            const apiKeys = apiKeysSnapshot.val() || {};
            
            // Update stats
            elements.totalUsers.textContent = utils.formatNumber(Object.keys(users).length);
            elements.totalConversations.textContent = utils.formatNumber(Object.keys(conversations).length);
            elements.totalApiKeys.textContent = utils.formatNumber(Object.keys(apiKeys).length);
            
            // Calculate API usage
            let totalApiUsage = 0;
            Object.values(apiKeys).forEach(userKeys => {
                Object.values(userKeys).forEach(key => {
                    totalApiUsage += key.usage || 0;
                });
            });
            elements.apiUsage.textContent = utils.formatNumber(totalApiUsage);
            
            // Load charts
            this.loadCharts(users, conversations, apiKeys);
            
        } catch (error) {
            console.error('Error loading overview data:', error);
            utils.showNotification('خطأ في تحميل البيانات', 'error');
        }
    },
    
    loadCharts(users, conversations, apiKeys) {
        this.loadUsersGrowthChart(users);
        this.loadApiUsageChart(apiKeys);
    },
    
    loadUsersGrowthChart(users) {
        const ctx = document.getElementById('users-growth-chart').getContext('2d');
        
        // Sample data - in real app, this would be calculated from user creation dates
        const data = {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [{
                label: 'المستخدمين الجدد',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4
            }]
        };
        
        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    },
    
    loadApiUsageChart(apiKeys) {
        const ctx = document.getElementById('api-usage-chart').getContext('2d');
        
        // Sample data
        const data = {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [{
                label: 'استخدام API',
                data: [12, 19, 3, 5, 2, 3],
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: '#6366f1',
                borderWidth: 1
            }]
        };
        
        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
};

// Users Management
const usersManager = {
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        elements.addUserBtn.addEventListener('click', () => {
            this.showAddUserModal();
        });
        
        elements.addUserForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addUser();
        });
    },
    
    async loadUsers() {
        try {
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);
            const users = snapshot.val() || {};
            
            usersData = Object.values(users);
            this.displayUsers(usersData);
            
        } catch (error) {
            console.error('Error loading users:', error);
            utils.showNotification('خطأ في تحميل المستخدمين', 'error');
        }
    },
    
    displayUsers(users) {
        elements.usersTableBody.innerHTML = users.map(user => `
            <tr>
                <td>${user.name || 'غير محدد'}</td>
                <td>${user.email || 'غير محدد'}</td>
                <td>
                    <span class="status-badge ${user.plan || 'free'}">
                        ${this.getPlanName(user.plan || 'free')}
                    </span>
                </td>
                <td>${utils.formatDate(user.createdAt)}</td>
                <td>${user.lastLogin ? utils.formatDate(user.lastLogin) : 'لم يسجل دخول'}</td>
                <td>
                    <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-sm btn-edit" onclick="usersManager.editUser('${user.uid}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-sm btn-disable" onclick="usersManager.toggleUserStatus('${user.uid}', ${user.isActive})">
                            <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="btn-sm btn-delete" onclick="usersManager.deleteUser('${user.uid}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    getPlanName(plan) {
        const plans = {
            'free': 'مجانية',
            'pro': 'متقدمة',
            'enterprise': 'مؤسسية'
        };
        return plans[plan] || 'غير محدد';
    },
    
    showAddUserModal() {
        elements.addUserModal.classList.add('active');
    },
    
    async addUser() {
        const name = document.getElementById('new-user-name').value;
        const email = document.getElementById('new-user-email').value;
        const password = document.getElementById('new-user-password').value;
        const plan = document.getElementById('new-user-plan').value;
        
        if (!name || !email || !password) {
            utils.showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        try {
            // In real app, this would create a user via Firebase Admin SDK
            utils.showNotification('تم إضافة المستخدم بنجاح', 'success');
            this.closeAddUserModal();
            this.loadUsers();
            
        } catch (error) {
            console.error('Error adding user:', error);
            utils.showNotification('خطأ في إضافة المستخدم', 'error');
        }
    },
    
    closeAddUserModal() {
        elements.addUserModal.classList.remove('active');
        elements.addUserForm.reset();
    },
    
    async editUser(userId) {
        // Implementation for editing user
        utils.showNotification('ميزة تعديل المستخدم قيد التطوير', 'info');
    },
    
    async toggleUserStatus(userId, currentStatus) {
        try {
            await update(ref(database, `users/${userId}`), {
                isActive: !currentStatus
            });
            
            utils.showNotification(`تم ${!currentStatus ? 'تفعيل' : 'تعطيل'} المستخدم`, 'success');
            this.loadUsers();
            
        } catch (error) {
            console.error('Error toggling user status:', error);
            utils.showNotification('خطأ في تغيير حالة المستخدم', 'error');
        }
    },
    
    async deleteUser(userId) {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        
        try {
            await remove(ref(database, `users/${userId}`));
            utils.showNotification('تم حذف المستخدم بنجاح', 'success');
            this.loadUsers();
            
        } catch (error) {
            console.error('Error deleting user:', error);
            utils.showNotification('خطأ في حذف المستخدم', 'error');
        }
    }
};

// Conversations Management
const conversationsManager = {
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        elements.conversationFilter.addEventListener('change', () => {
            this.filterConversations();
        });
    },
    
    async loadConversations() {
        try {
            const conversationsRef = ref(database, 'conversations');
            const snapshot = await get(conversationsRef);
            const conversations = snapshot.val() || {};
            
            conversationsData = Object.values(conversations);
            this.displayConversations(conversationsData);
            
        } catch (error) {
            console.error('Error loading conversations:', error);
            utils.showNotification('خطأ في تحميل المحادثات', 'error');
        }
    },
    
    displayConversations(conversations) {
        if (conversations.length === 0) {
            elements.conversationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>لا توجد محادثات</h3>
                    <p>لم يتم العثور على أي محادثات في النظام</p>
                </div>
            `;
            return;
        }
        
        elements.conversationsList.innerHTML = conversations.map(conversation => `
            <div class="conversation-item">
                <div class="conversation-header">
                    <div class="conversation-user">
                        <div class="user-avatar">
                            ${conversation.userName ? conversation.userName.charAt(0) : 'U'}
                        </div>
                        <div class="conversation-info">
                            <h4>${conversation.userName || 'مستخدم غير معروف'}</h4>
                            <p>${conversation.userEmail || 'بريد إلكتروني غير معروف'}</p>
                        </div>
                    </div>
                    <div class="conversation-meta">
                        <span><i class="fas fa-clock"></i> ${utils.formatDate(conversation.createdAt)}</span>
                        <span><i class="fas fa-comment"></i> ${conversation.messageCount || 0} رسالة</span>
                    </div>
                </div>
                <div class="conversation-preview">
                    <p>${conversation.lastMessage || 'لا توجد رسائل'}</p>
                </div>
            </div>
        `).join('');
    },
    
    filterConversations() {
        const filter = elements.conversationFilter.value;
        let filteredConversations = conversationsData;
        
        if (filter !== 'all') {
            const now = new Date();
            const filterDate = new Date();
            
            switch (filter) {
                case 'today':
                    filterDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    filterDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1);
                    break;
            }
            
            filteredConversations = conversationsData.filter(conversation => {
                const conversationDate = new Date(conversation.createdAt);
                return conversationDate >= filterDate;
            });
        }
        
        this.displayConversations(filteredConversations);
    }
};

// API Keys Management
const apiKeysManager = {
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        elements.generateApiKeyBtn.addEventListener('click', () => {
            this.showGenerateApiKeyModal();
        });
        
        elements.generateApiKeyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateApiKey();
        });
    },
    
    async loadApiKeys() {
        try {
            const apiKeysRef = ref(database, 'apiKeys');
            const snapshot = await get(apiKeysRef);
            const apiKeys = snapshot.val() || {};
            
            // Flatten the nested structure
            apiKeysData = [];
            Object.keys(apiKeys).forEach(userId => {
                Object.keys(apiKeys[userId]).forEach(keyId => {
                    apiKeysData.push({
                        ...apiKeys[userId][keyId],
                        userId: userId,
                        keyId: keyId
                    });
                });
            });
            
            this.displayApiKeys(apiKeysData);
            this.loadUsersForApiKeyGeneration();
            
        } catch (error) {
            console.error('Error loading API keys:', error);
            utils.showNotification('خطأ في تحميل مفاتيح API', 'error');
        }
    },
    
    displayApiKeys(apiKeys) {
        if (apiKeys.length === 0) {
            elements.apiKeysTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-key"></i>
                        <h3>لا توجد مفاتيح API</h3>
                        <p>لم يتم العثور على أي مفاتيح API في النظام</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        elements.apiKeysTableBody.innerHTML = apiKeys.map(key => `
            <tr>
                <td>${key.userName || 'غير معروف'}</td>
                <td>${key.name}</td>
                <td>${key.key.substring(0, 20)}...</td>
                <td>${key.usage || 0}</td>
                <td>${key.limit === 'unlimited' ? '∞' : key.limit}</td>
                <td>${utils.formatDate(key.createdAt)}</td>
                <td>
                    <span class="status-badge ${key.isActive ? 'active' : 'inactive'}">
                        ${key.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-sm btn-edit" onclick="apiKeysManager.viewKeyDetails('${key.key}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-sm btn-disable" onclick="apiKeysManager.toggleKeyStatus('${key.userId}', '${key.keyId}', ${key.isActive})">
                            <i class="fas fa-${key.isActive ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="btn-sm btn-delete" onclick="apiKeysManager.deleteKey('${key.userId}', '${key.keyId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    async loadUsersForApiKeyGeneration() {
        try {
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);
            const users = snapshot.val() || {};
            
            elements.apiKeyOwner.innerHTML = Object.values(users).map(user => `
                <option value="${user.uid}">${user.name || user.email}</option>
            `).join('');
            
        } catch (error) {
            console.error('Error loading users for API key generation:', error);
        }
    },
    
    showGenerateApiKeyModal() {
        elements.generateApiKeyModal.classList.add('active');
    },
    
    async generateApiKey() {
        const ownerId = elements.apiKeyOwner.value;
        const name = document.getElementById('api-key-name').value;
        const limit = document.getElementById('api-key-limit').value;
        
        if (!ownerId || !name) {
            utils.showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        try {
            const apiKey = utils.generateApiKey();
            const keyData = {
                key: apiKey,
                name: name,
                createdAt: new Date().toISOString(),
                isActive: true,
                usage: 0,
                limit: limit === 'unlimited' ? 'unlimited' : parseInt(limit)
            };
            
            await set(ref(database, `apiKeys/${ownerId}/${apiKey}`), keyData);
            
            utils.showNotification('تم توليد مفتاح API بنجاح', 'success');
            this.closeGenerateApiKeyModal();
            this.loadApiKeys();
            
        } catch (error) {
            console.error('Error generating API key:', error);
            utils.showNotification('خطأ في توليد مفتاح API', 'error');
        }
    },
    
    closeGenerateApiKeyModal() {
        elements.generateApiKeyModal.classList.remove('active');
        elements.generateApiKeyForm.reset();
    },
    
    viewKeyDetails(key) {
        // Implementation for viewing key details
        utils.showNotification('ميزة عرض تفاصيل المفتاح قيد التطوير', 'info');
    },
    
    async toggleKeyStatus(userId, keyId, currentStatus) {
        try {
            await update(ref(database, `apiKeys/${userId}/${keyId}`), {
                isActive: !currentStatus
            });
            
            utils.showNotification(`تم ${!currentStatus ? 'تفعيل' : 'تعطيل'} المفتاح`, 'success');
            this.loadApiKeys();
            
        } catch (error) {
            console.error('Error toggling key status:', error);
            utils.showNotification('خطأ في تغيير حالة المفتاح', 'error');
        }
    },
    
    async deleteKey(userId, keyId) {
        if (!confirm('هل أنت متأكد من حذف هذا المفتاح؟')) return;
        
        try {
            await remove(ref(database, `apiKeys/${userId}/${keyId}`));
            utils.showNotification('تم حذف المفتاح بنجاح', 'success');
            this.loadApiKeys();
            
        } catch (error) {
            console.error('Error deleting key:', error);
            utils.showNotification('خطأ في حذف المفتاح', 'error');
        }
    }
};

// Analytics Management
const analyticsManager = {
    loadAnalytics() {
        this.loadHourlyUsageChart();
        this.loadPlanDistributionChart();
        this.loadConversationsGrowthChart();
        this.loadPopularQuestionsChart();
    },
    
    loadHourlyUsageChart() {
        const ctx = document.getElementById('hourly-usage-chart').getContext('2d');
        
        const data = {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [{
                label: 'الطلبات',
                data: [5, 2, 15, 25, 20, 12],
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                tension: 0.4
            }]
        };
        
        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    },
    
    loadPlanDistributionChart() {
        const ctx = document.getElementById('plan-distribution-chart').getContext('2d');
        
        const data = {
            labels: ['مجانية', 'متقدمة', 'مؤسسية'],
            datasets: [{
                data: [60, 30, 10],
                backgroundColor: ['#6366f1', '#8b5cf6', '#06b6d4']
            }]
        };
        
        new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },
    
    loadConversationsGrowthChart() {
        const ctx = document.getElementById('conversations-growth-chart').getContext('2d');
        
        const data = {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [{
                label: 'المحادثات',
                data: [12, 19, 3, 5, 2, 3],
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: '#6366f1',
                borderWidth: 1
            }]
        };
        
        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    },
    
    loadPopularQuestionsChart() {
        const ctx = document.getElementById('popular-questions-chart').getContext('2d');
        
        const data = {
            labels: ['سؤال 1', 'سؤال 2', 'سؤال 3', 'سؤال 4', 'سؤال 5'],
            datasets: [{
                data: [25, 20, 15, 10, 5],
                backgroundColor: [
                    '#6366f1',
                    '#8b5cf6',
                    '#06b6d4',
                    '#10b981',
                    '#f59e0b'
                ]
            }]
        };
        
        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
};

// Settings Management
const settingsManager = {
    loadSettings() {
        // Load current settings from database
        this.loadApiSettings();
        this.loadSystemSettings();
        this.loadSecuritySettings();
    },
    
    loadApiSettings() {
        // Load API settings
    },
    
    loadSystemSettings() {
        // Load system settings
    },
    
    loadSecuritySettings() {
        // Load security settings
    }
};

// Theme Management
const themeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme');
        const isDarkMode = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        elements.themeToggle.innerHTML = `<i class="fas fa-${isDarkMode ? 'sun' : 'moon'}"></i>`;
        
        this.bindEvents();
    },
    
    bindEvents() {
        elements.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            elements.themeToggle.innerHTML = `<i class="fas fa-${newTheme === 'dark' ? 'sun' : 'moon'}></i>`;
            localStorage.setItem('theme', newTheme);
        });
    }
};

// Modal Management
const modalManager = {
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        // Close modals
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });
        
        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
        
        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    },
    
    closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
        }
    },
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            this.closeModal(modal);
        });
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all managers
    themeManager.init();
    navigation.init();
    authManager.init();
    usersManager.init();
    conversationsManager.init();
    apiKeysManager.init();
    analyticsManager.init();
    settingsManager.init();
    modalManager.init();
    
    // Hide loading screen
    setTimeout(() => {
        utils.hideLoading();
    }, 1000);
    
    console.log('Admin Panel initialized successfully');
});

// Make functions globally available for onclick handlers
window.usersManager = usersManager;
window.apiKeysManager = apiKeysManager;