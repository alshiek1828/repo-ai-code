// Import Firebase modules
import { 
    getAuth, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'firebase/auth';
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    push, 
    onValue, 
    off,
    update,
    remove
} from 'firebase/database';
import { 
    getStorage, 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL 
} from 'firebase/storage';

// Import from main app
import { auth, database, storage, currentUser, utils } from './app.js';

// Global Variables
let userData = null;
let userApiKeys = [];
let currentChat = null;
let chatHistory = [];

// DOM Elements
const elements = {
    // Loading
    loadingScreen: document.getElementById('loading-screen'),
    
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    
    // Navigation
    navLinks: document.querySelectorAll('.nav-link'),
    
    // Header
    themeToggle: document.getElementById('theme-toggle'),
    userMenuBtn: document.getElementById('user-menu-btn'),
    userDropdown: document.getElementById('user-dropdown'),
    userName: document.getElementById('user-name'),
    userNameSmall: document.getElementById('user-name-small'),
    userPlan: document.getElementById('user-plan'),
    logoutBtn: document.getElementById('logout-btn'),
    logoutLink: document.getElementById('logout-link'),
    
    // Content sections
    contentSections: document.querySelectorAll('.content-section'),
    pageTitle: document.getElementById('page-title'),
    
    // Dashboard
    totalConversations: document.getElementById('total-conversations'),
    totalApiCalls: document.getElementById('total-api-calls'),
    activeTime: document.getElementById('active-time'),
    successRate: document.getElementById('success-rate'),
    activityList: document.getElementById('activity-list'),
    usageChart: document.getElementById('usage-chart'),
    
    // Quick actions
    newChatBtn: document.getElementById('new-chat-btn'),
    generateApiBtn: document.getElementById('generate-api-btn'),
    viewAnalyticsBtn: document.getElementById('view-analytics-btn'),
    exportDataBtn: document.getElementById('export-data-btn'),
    
    // Chat
    chatList: document.getElementById('chat-list'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    newChatMainBtn: document.getElementById('new-chat-main-btn'),
    
    // API Keys
    apiKeysList: document.getElementById('api-keys-list'),
    createApiKeyBtn: document.getElementById('create-api-key-btn'),
    
    // Modals
    createApiKeyModal: document.getElementById('create-api-key-modal'),
    apiKeyDetailsModal: document.getElementById('api-key-details-modal'),
    createApiKeyForm: document.getElementById('create-api-key-form'),
    
    // Settings
    profileForm: document.getElementById('profile-form'),
    passwordForm: document.getElementById('password-form'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content')
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

// Navigation Management
const navigation = {
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        // Sidebar toggle
        elements.sidebarToggle.addEventListener('click', () => {
            elements.sidebar.classList.toggle('collapsed');
        });
        
        // Mobile menu toggle
        elements.mobileMenuBtn.addEventListener('click', () => {
            elements.sidebar.classList.toggle('active');
        });
        
        // Navigation links
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
                
                // Update active link
                elements.navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Close mobile menu
                elements.sidebar.classList.remove('active');
            });
        });
        
        // User menu
        elements.userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.userDropdown.classList.toggle('active');
        });
        
        // Close user menu when clicking outside
        document.addEventListener('click', () => {
            elements.userDropdown.classList.remove('active');
        });
        
        // Logout
        elements.logoutBtn.addEventListener('click', () => authManager.signOut());
        elements.logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            authManager.signOut();
        });
    },
    
    showSection(sectionName) {
        // Hide all sections
        elements.contentSections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update page title
        const titles = {
            'dashboard': 'لوحة التحكم',
            'chat': 'المحادثات',
            'api-keys': 'مفاتيح API',
            'analytics': 'الإحصائيات',
            'settings': 'الإعدادات',
            'help': 'المساعدة'
        };
        
        elements.pageTitle.textContent = titles[sectionName] || 'لوحة التحكم';
        
        // Load section data
        this.loadSectionData(sectionName);
    },
    
    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                dashboardManager.loadDashboardData();
                break;
            case 'chat':
                chatManager.loadChats();
                break;
            case 'api-keys':
                apiKeyManager.loadApiKeys();
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

// Authentication Management
const authManager = {
    init() {
        this.checkAuthState();
    },
    
    checkAuthState() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                this.loadUserData();
                this.updateUI();
            } else {
                // Redirect to login
                window.location.href = 'index.html';
            }
        });
    },
    
    async loadUserData() {
        try {
            const userRef = ref(database, `users/${currentUser.uid}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                userData = snapshot.val();
                this.updateUserInfo();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            utils.showNotification('خطأ في تحميل بيانات المستخدم', 'error');
        }
    },
    
    updateUserInfo() {
        if (userData) {
            elements.userName.textContent = userData.name || 'المستخدم';
            elements.userNameSmall.textContent = userData.name || 'المستخدم';
            elements.userPlan.textContent = this.getPlanName(userData.plan || 'free');
        }
    },
    
    getPlanName(plan) {
        const plans = {
            'free': 'الخطة المجانية',
            'pro': 'الخطة المتقدمة',
            'enterprise': 'الخطة المؤسسية'
        };
        return plans[plan] || 'الخطة المجانية';
    },
    
    updateUI() {
        if (currentUser) {
            elements.userName.textContent = currentUser.displayName || 'المستخدم';
            elements.userNameSmall.textContent = currentUser.displayName || 'المستخدم';
        }
    },
    
    async signOut() {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Sign out error:', error);
            utils.showNotification('خطأ في تسجيل الخروج', 'error');
        }
    }
};

// Dashboard Management
const dashboardManager = {
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        elements.newChatBtn.addEventListener('click', () => {
            navigation.showSection('chat');
            chatManager.startNewChat();
        });
        
        elements.generateApiBtn.addEventListener('click', () => {
            navigation.showSection('api-keys');
            apiKeyManager.showCreateModal();
        });
        
        elements.viewAnalyticsBtn.addEventListener('click', () => {
            navigation.showSection('analytics');
        });
        
        elements.exportDataBtn.addEventListener('click', () => {
            this.exportUserData();
        });
    },
    
    async loadDashboardData() {
        if (!currentUser) return;
        
        try {
            // Load user stats
            const statsRef = ref(database, `users/${currentUser.uid}/usage`);
            const statsSnapshot = await get(statsRef);
            
            if (statsSnapshot.exists()) {
                const stats = statsSnapshot.val();
                this.updateStats(stats);
            }
            
            // Load recent activity
            this.loadRecentActivity();
            
            // Load usage chart
            this.loadUsageChart();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            utils.showNotification('خطأ في تحميل بيانات لوحة التحكم', 'error');
        }
    },
    
    updateStats(stats) {
        elements.totalConversations.textContent = stats.conversations || 0;
        elements.totalApiCalls.textContent = stats.apiCalls || 0;
        elements.activeTime.textContent = this.calculateActiveTime(stats);
        elements.successRate.textContent = this.calculateSuccessRate(stats) + '%';
    },
    
    calculateActiveTime(stats) {
        // Simple calculation based on API calls
        const hours = Math.floor((stats.apiCalls || 0) / 10);
        return hours;
    },
    
    calculateSuccessRate(stats) {
        // Simple calculation - in real app, this would be more complex
        const successRate = Math.min(95, 80 + Math.random() * 15);
        return Math.round(successRate);
    },
    
    async loadRecentActivity() {
        try {
            const activityRef = ref(database, `users/${currentUser.uid}/activity`);
            const snapshot = await get(activityRef);
            
            if (snapshot.exists()) {
                const activities = snapshot.val();
                this.displayRecentActivity(activities);
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    },
    
    displayRecentActivity(activities) {
        const activityList = Object.values(activities).slice(-5).reverse();
        
        elements.activityList.innerHTML = activityList.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${activity.type === 'chat' ? 'comment' : 'key'}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">${utils.formatDate(new Date(activity.timestamp))}</div>
                </div>
            </div>
        `).join('');
    },
    
    loadUsageChart() {
        const ctx = elements.usageChart.getContext('2d');
        
        // Sample data - in real app, this would come from database
        const data = {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [{
                label: 'استخدام API',
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
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    },
    
    async exportUserData() {
        try {
            const userRef = ref(database, `users/${currentUser.uid}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                const dataStr = JSON.stringify(data, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `relosity-data-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                
                URL.revokeObjectURL(url);
                utils.showNotification('تم تصدير البيانات بنجاح', 'success');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            utils.showNotification('خطأ في تصدير البيانات', 'error');
        }
    }
};

// Chat Management
const chatManager = {
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        elements.newChatMainBtn.addEventListener('click', () => {
            this.startNewChat();
        });
        
        elements.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });
        
        elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    },
    
    async loadChats() {
        try {
            const chatsRef = ref(database, `users/${currentUser.uid}/chats`);
            const snapshot = await get(chatsRef);
            
            if (snapshot.exists()) {
                const chats = snapshot.val();
                this.displayChats(chats);
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    },
    
    displayChats(chats) {
        const chatList = Object.values(chats || {}).sort((a, b) => 
            new Date(b.lastMessage) - new Date(a.lastMessage)
        );
        
        elements.chatList.innerHTML = chatList.map(chat => `
            <div class="chat-item" data-chat-id="${chat.id}">
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-preview">${chat.lastMessage || 'لا توجد رسائل'}</div>
                <div class="chat-item-time">${utils.formatDate(new Date(chat.lastMessageTime))}</div>
            </div>
        `).join('');
        
        // Add click handlers
        elements.chatList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.dataset.chatId;
                this.loadChat(chatId);
            });
        });
    },
    
    startNewChat() {
        currentChat = null;
        elements.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <h3>مرحباً بك في Relosity AI</h3>
                <p>ابدأ محادثة جديدة أو اختر محادثة من القائمة</p>
            </div>
        `;
        elements.chatInput.disabled = false;
        elements.sendBtn.disabled = false;
    },
    
    async loadChat(chatId) {
        try {
            const chatRef = ref(database, `users/${currentUser.uid}/chats/${chatId}`);
            const snapshot = await get(chatRef);
            
            if (snapshot.exists()) {
                const chat = snapshot.val();
                currentChat = chat;
                this.displayChatMessages(chat.messages || []);
            }
        } catch (error) {
            console.error('Error loading chat:', error);
        }
    },
    
    displayChatMessages(messages) {
        elements.chatMessages.innerHTML = messages.map(message => `
            <div class="message ${message.sender}">
                <div class="message-avatar">
                    <i class="fas fa-${message.sender === 'user' ? 'user' : 'robot'}"></i>
                </div>
                <div class="message-content">
                    <p>${message.content}</p>
                    <div class="message-time">${utils.formatDate(new Date(message.timestamp))}</div>
                </div>
            </div>
        `).join('');
        
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    },
    
    async sendMessage() {
        const message = elements.chatInput.value.trim();
        if (!message) return;
        
        // Add user message to UI
        this.addMessageToUI(message, 'user');
        elements.chatInput.value = '';
        
        // Create chat if it doesn't exist
        if (!currentChat) {
            currentChat = await this.createNewChat();
        }
        
        // Send to AI and get response
        try {
            const response = await this.getAIResponse(message);
            this.addMessageToUI(response, 'ai');
            
            // Save messages to database
            await this.saveMessage(message, 'user');
            await this.saveMessage(response, 'ai');
            
        } catch (error) {
            console.error('Error getting AI response:', error);
            this.addMessageToUI('عذراً، حدث خطأ في معالجة رسالتك. حاول مرة أخرى.', 'ai');
        }
    },
    
    addMessageToUI(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content">
                <p>${content}</p>
                <div class="message-time">الآن</div>
            </div>
        `;
        
        elements.chatMessages.appendChild(messageDiv);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    },
    
    async createNewChat() {
        const chatId = Date.now().toString();
        const chatData = {
            id: chatId,
            title: 'محادثة جديدة',
            createdAt: new Date().toISOString(),
            lastMessage: '',
            lastMessageTime: new Date().toISOString(),
            messages: []
        };
        
        await set(ref(database, `users/${currentUser.uid}/chats/${chatId}`), chatData);
        return chatData;
    },
    
    async getAIResponse(message) {
        // This is a mock response - in real app, this would call OpenAI API
        const responses = [
            'هذا سؤال رائع! دعني أساعدك في ذلك.',
            'أفهم ما تقصده. إليك ما يمكنني اقتراحه...',
            'شكراً لك على سؤالك. هذا موضوع مهم جداً.',
            'أنا هنا لمساعدتك. هل تريد المزيد من التفاصيل؟',
            'هذا موضوع مثير للاهتمام. دعني أشرح لك...',
            'أقدر سؤالك. إليك إجابتي التفصيلية...'
        ];
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        return responses[Math.floor(Math.random() * responses.length)];
    },
    
    async saveMessage(content, sender) {
        if (!currentChat) return;
        
        const message = {
            content,
            sender,
            timestamp: new Date().toISOString()
        };
        
        // Add to chat messages
        const messagesRef = ref(database, `users/${currentUser.uid}/chats/${currentChat.id}/messages`);
        await push(messagesRef, message);
        
        // Update chat last message
        await update(ref(database, `users/${currentUser.uid}/chats/${currentChat.id}`), {
            lastMessage: content,
            lastMessageTime: new Date().toISOString()
        });
    }
};

// API Key Management
const apiKeyManager = {
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        elements.createApiKeyBtn.addEventListener('click', () => {
            this.showCreateModal();
        });
        
        elements.createApiKeyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createApiKey();
        });
        
        // Modal close handlers
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });
    },
    
    async loadApiKeys() {
        try {
            const apiKeysRef = ref(database, `apiKeys/${currentUser.uid}`);
            const snapshot = await get(apiKeysRef);
            
            if (snapshot.exists()) {
                const apiKeys = snapshot.val();
                this.displayApiKeys(apiKeys);
            }
        } catch (error) {
            console.error('Error loading API keys:', error);
        }
    },
    
    displayApiKeys(apiKeys) {
        const keysList = Object.values(apiKeys || {});
        
        elements.apiKeysList.innerHTML = keysList.map(key => `
            <div class="api-key-item">
                <div class="api-key-header">
                    <div class="api-key-name">${key.name}</div>
                    <div class="api-key-status ${key.isActive ? 'active' : 'inactive'}">
                        ${key.isActive ? 'نشط' : 'غير نشط'}
                    </div>
                </div>
                <div class="api-key-details">
                    <div class="api-key-detail">
                        <label>المفتاح:</label>
                        <span>${key.key.substring(0, 20)}...</span>
                    </div>
                    <div class="api-key-detail">
                        <label>تاريخ الإنشاء:</label>
                        <span>${utils.formatDate(new Date(key.createdAt))}</span>
                    </div>
                    <div class="api-key-detail">
                        <label>الاستخدام:</label>
                        <span>${key.usage || 0} / ${key.limit === 'unlimited' ? '∞' : key.limit}</span>
                    </div>
                </div>
                <div class="api-key-actions">
                    <button class="btn-secondary" onclick="apiKeyManager.viewKeyDetails('${key.key}')">
                        <i class="fas fa-eye"></i> عرض التفاصيل
                    </button>
                    <button class="btn-secondary" onclick="apiKeyManager.copyKey('${key.key}')">
                        <i class="fas fa-copy"></i> نسخ
                    </button>
                    <button class="btn-danger" onclick="apiKeyManager.deleteKey('${key.key}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `).join('');
    },
    
    showCreateModal() {
        elements.createApiKeyModal.classList.add('active');
    },
    
    closeModal(modal) {
        modal.classList.remove('active');
    },
    
    async createApiKey() {
        const name = document.getElementById('api-key-name').value;
        const limit = document.getElementById('api-key-limit').value;
        
        if (!name.trim()) {
            utils.showNotification('يرجى إدخال اسم المفتاح', 'error');
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
            
            await set(ref(database, `apiKeys/${currentUser.uid}/${apiKey}`), keyData);
            
            utils.showNotification('تم إنشاء مفتاح API بنجاح', 'success');
            this.closeModal(elements.createApiKeyModal);
            elements.createApiKeyForm.reset();
            this.loadApiKeys();
            
        } catch (error) {
            console.error('Error creating API key:', error);
            utils.showNotification('خطأ في إنشاء مفتاح API', 'error');
        }
    },
    
    viewKeyDetails(key) {
        // Load key details and show modal
        const keyRef = ref(database, `apiKeys/${currentUser.uid}/${key}`);
        get(keyRef).then(snapshot => {
            if (snapshot.exists()) {
                const keyData = snapshot.val();
                this.showKeyDetailsModal(keyData);
            }
        });
    },
    
    showKeyDetailsModal(keyData) {
        document.getElementById('detail-key-name').textContent = keyData.name;
        document.getElementById('detail-key-value').value = keyData.key;
        document.getElementById('detail-key-date').textContent = utils.formatDate(new Date(keyData.createdAt));
        document.getElementById('detail-key-usage').textContent = `${keyData.usage || 0} / ${keyData.limit === 'unlimited' ? '∞' : keyData.limit}`;
        document.getElementById('detail-key-status').textContent = keyData.isActive ? 'نشط' : 'غير نشط';
        
        elements.apiKeyDetailsModal.classList.add('active');
    },
    
    copyKey(key) {
        navigator.clipboard.writeText(key).then(() => {
            utils.showNotification('تم نسخ المفتاح بنجاح', 'success');
        }).catch(() => {
            utils.showNotification('خطأ في نسخ المفتاح', 'error');
        });
    },
    
    async deleteKey(key) {
        if (!confirm('هل أنت متأكد من حذف هذا المفتاح؟')) return;
        
        try {
            await remove(ref(database, `apiKeys/${currentUser.uid}/${key}`));
            utils.showNotification('تم حذف المفتاح بنجاح', 'success');
            this.loadApiKeys();
        } catch (error) {
            console.error('Error deleting API key:', error);
            utils.showNotification('خطأ في حذف المفتاح', 'error');
        }
    }
};

// Analytics Management
const analyticsManager = {
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        // Analytics-specific event handlers can be added here
    },
    
    loadAnalytics() {
        this.loadMonthlyUsageChart();
        this.loadRequestTypesChart();
        this.loadPeakHoursChart();
        this.loadResponseTimeChart();
    },
    
    loadMonthlyUsageChart() {
        const ctx = document.getElementById('monthly-usage-chart').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                datasets: [{
                    label: 'استخدام API',
                    data: [12, 19, 3, 5, 2, 3],
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: '#6366f1',
                    borderWidth: 1
                }]
            },
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
    
    loadRequestTypesChart() {
        const ctx = document.getElementById('request-types-chart').getContext('2d');
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['نص', 'صورة', 'صوت', 'أخرى'],
                datasets: [{
                    data: [40, 30, 20, 10],
                    backgroundColor: [
                        '#6366f1',
                        '#8b5cf6',
                        '#06b6d4',
                        '#10b981'
                    ]
                }]
            },
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
    
    loadPeakHoursChart() {
        const ctx = document.getElementById('peak-hours-chart').getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                datasets: [{
                    label: 'الطلبات',
                    data: [5, 2, 15, 25, 20, 12],
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    tension: 0.4
                }]
            },
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
    
    loadResponseTimeChart() {
        const ctx = document.getElementById('response-time-chart').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['< 1s', '1-2s', '2-5s', '> 5s'],
                datasets: [{
                    label: 'معدل الاستجابة',
                    data: [60, 25, 10, 5],
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#6b7280'
                    ]
                }]
            },
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
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        // Tab switching
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Form submissions
        elements.profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });
        
        elements.passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePassword();
        });
    },
    
    switchTab(tabName) {
        // Update tab buttons
        elements.tabBtns.forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        elements.tabContents.forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    },
    
    loadSettings() {
        this.loadProfileSettings();
    },
    
    loadProfileSettings() {
        if (userData) {
            document.getElementById('display-name').value = userData.name || '';
            document.getElementById('email').value = currentUser.email || '';
            document.getElementById('bio').value = userData.bio || '';
        }
    },
    
    async updateProfile() {
        const displayName = document.getElementById('display-name').value;
        const bio = document.getElementById('bio').value;
        
        try {
            // Update Firebase Auth profile
            await updateProfile(currentUser, {
                displayName: displayName
            });
            
            // Update database
            await update(ref(database, `users/${currentUser.uid}`), {
                name: displayName,
                bio: bio,
                updatedAt: new Date().toISOString()
            });
            
            utils.showNotification('تم تحديث الملف الشخصي بنجاح', 'success');
            
        } catch (error) {
            console.error('Error updating profile:', error);
            utils.showNotification('خطأ في تحديث الملف الشخصي', 'error');
        }
    },
    
    async updatePassword() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword !== confirmPassword) {
            utils.showNotification('كلمات المرور غير متطابقة', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            utils.showNotification('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
            return;
        }
        
        try {
            // Re-authenticate user
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            
            // Update password
            await updatePassword(currentUser, newPassword);
            
            utils.showNotification('تم تحديث كلمة المرور بنجاح', 'success');
            elements.passwordForm.reset();
            
        } catch (error) {
            console.error('Error updating password:', error);
            utils.showNotification('خطأ في تحديث كلمة المرور', 'error');
        }
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all managers
    themeManager.init();
    navigation.init();
    authManager.init();
    dashboardManager.init();
    chatManager.init();
    apiKeyManager.init();
    analyticsManager.init();
    settingsManager.init();
    
    // Hide loading screen
    setTimeout(() => {
        elements.loadingScreen.classList.add('hidden');
    }, 1000);
    
    console.log('Dashboard initialized successfully');
});

// Make functions globally available for onclick handlers
window.apiKeyManager = apiKeyManager;