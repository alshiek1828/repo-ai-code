// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { getDatabase, ref, set, get, push, onValue, off, remove } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

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
const storage = getStorage(app);

// Global Variables
let currentUser = null;
let currentSection = 'dashboard';
let apiKeys = [];
let conversations = [];
let isDarkMode = localStorage.getItem('theme') === 'dark';

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const themeToggle = document.getElementById('theme-toggle');
const userProfile = document.getElementById('user-profile');
const userName = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const logoutBtn = document.querySelector('.logout-btn');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupAuthStateListener();
    setupTheme();
    setupCharts();
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
    
    // Chat functionality
    setupChat();
    
    // API Keys functionality
    setupApiKeys();
    
    // Settings functionality
    setupSettings();
    
    // Modal functionality
    setupModals();
}

// Setup Auth State Listener
function setupAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            updateUserUI();
            loadUserData();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'index.html';
        }
    });
}

// Update User UI
function updateUserUI() {
    if (currentUser) {
        userName.textContent = currentUser.displayName || 'المستخدم';
        userAvatar.src = currentUser.photoURL || '/assets/default-avatar.png';
    }
}

// Load User Data
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        // Load API Keys
        const apiKeysRef = ref(database, `users/${currentUser.uid}/apiKeys`);
        onValue(apiKeysRef, (snapshot) => {
            const data = snapshot.val();
            apiKeys = data ? Object.entries(data).map(([id, key]) => ({ id, ...key })) : [];
            updateApiKeysUI();
            updateStats();
        });
        
        // Load Conversations
        const conversationsRef = ref(database, `users/${currentUser.uid}/conversations`);
        onValue(conversationsRef, (snapshot) => {
            const data = snapshot.val();
            conversations = data ? Object.entries(data).map(([id, conv]) => ({ id, ...conv })) : [];
            updateConversationsUI();
            updateStats();
        });
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('خطأ في تحميل البيانات', 'error');
    }
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
    if (sectionName === 'analytics') {
        loadAnalyticsData();
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

// Update Stats
function updateStats() {
    document.getElementById('total-conversations').textContent = conversations.length;
    document.getElementById('total-api-keys').textContent = apiKeys.length;
    
    // Calculate API usage
    const totalUsage = apiKeys.reduce((sum, key) => sum + (key.usage || 0), 0);
    document.getElementById('api-usage').textContent = totalUsage;
    
    // Calculate days active
    if (currentUser && currentUser.metadata && currentUser.metadata.creationTime) {
        const joinDate = new Date(currentUser.metadata.creationTime);
        const now = new Date();
        const daysActive = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
        document.getElementById('days-active').textContent = daysActive;
    }
}

// Setup Chat
function setupChat() {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const clearChatBtn = document.getElementById('clear-chat');
    const exportChatBtn = document.getElementById('export-chat');
    
    if (!messageInput || !sendBtn || !chatMessages) return;
    
    // Send message
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Add user message
        addMessage(message, 'user');
        messageInput.value = '';
        
        // Simulate AI response
        setTimeout(() => {
            const response = generateAIResponse(message);
            addMessage(response, 'ai');
            saveConversation(message, response);
        }, 1000);
    }
    
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Clear chat
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            chatMessages.innerHTML = `
                <div class="message ai-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <p>مرحباً! أنا Relosity AI، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟</p>
                        <span class="message-time">الآن</span>
                    </div>
                </div>
            `;
        });
    }
    
    // Export chat
    if (exportChatBtn) {
        exportChatBtn.addEventListener('click', exportChat);
    }
    
    // Suggestion buttons
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const suggestion = e.target.getAttribute('data-suggestion');
            messageInput.value = suggestion;
            messageInput.focus();
        });
    });
}

// Add Message to Chat
function addMessage(content, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatar = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
    const time = new Date().toLocaleTimeString('ar-SA', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="${avatar}"></i>
        </div>
        <div class="message-content">
            <p>${content}</p>
            <span class="message-time">${time}</span>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Generate AI Response
function generateAIResponse(userMessage) {
    const responses = [
        "هذا سؤال ممتاز! دعني أساعدك في ذلك.",
        "أفهم ما تقصده. إليك ما يمكنني إخبارك به:",
        "هذا موضوع مهم جداً. بناءً على خبرتي، يمكنني القول أن:",
        "شكراً لك على سؤالك. إليك الإجابة التفصيلية:",
        "هذا سؤال متقدم! دعني أشرح لك بالتفصيل:"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    return `${randomResponse} ${userMessage} هو موضوع مهم ويستحق الدراسة المتأنية.`;
}

// Save Conversation
async function saveConversation(userMessage, aiResponse) {
    if (!currentUser) return;
    
    try {
        const conversationRef = ref(database, `users/${currentUser.uid}/conversations`);
        await push(conversationRef, {
            userMessage,
            aiResponse,
            timestamp: new Date().toISOString(),
            topic: extractTopic(userMessage)
        });
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

// Extract Topic from Message
function extractTopic(message) {
    const topics = {
        'ذكاء اصطناعي': ['ذكاء', 'اصطناعي', 'ai', 'artificial', 'intelligence'],
        'برمجة': ['برمجة', 'كود', 'تطوير', 'programming', 'code'],
        'تقنية': ['تقنية', 'تكنولوجيا', 'technology', 'tech'],
        'تعلم': ['تعلم', 'دراسة', 'تعليم', 'learn', 'study'],
        'أعمال': ['أعمال', 'عمل', 'تجارة', 'business', 'work']
    };
    
    for (const [topic, keywords] of Object.entries(topics)) {
        if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
            return topic;
        }
    }
    
    return 'عام';
}

// Export Chat
function exportChat() {
    const messages = document.querySelectorAll('.message');
    let chatText = 'محادثة Relosity AI\n';
    chatText += '='.repeat(50) + '\n\n';
    
    messages.forEach(message => {
        const content = message.querySelector('p').textContent;
        const time = message.querySelector('.message-time').textContent;
        const sender = message.classList.contains('user-message') ? 'المستخدم' : 'Relosity AI';
        
        chatText += `[${time}] ${sender}: ${content}\n\n`;
    });
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relosity-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Setup API Keys
function setupApiKeys() {
    const createApiKeyBtn = document.getElementById('create-api-key-btn');
    const createApiKeyForm = document.getElementById('create-api-key-form');
    
    if (createApiKeyBtn) {
        createApiKeyBtn.addEventListener('click', () => {
            showModal('create-api-key-modal');
        });
    }
    
    if (createApiKeyForm) {
        createApiKeyForm.addEventListener('submit', handleCreateApiKey);
    }
}

// Update API Keys UI
function updateApiKeysUI() {
    const apiKeysList = document.getElementById('api-keys-list');
    if (!apiKeysList) return;
    
    if (apiKeys.length === 0) {
        apiKeysList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-key"></i>
                <h3>لا توجد مفاتيح API</h3>
                <p>قم بإنشاء مفتاح API أولاً لبدء الاستخدام</p>
                <button class="btn-primary" onclick="showModal('create-api-key-modal')">
                    <i class="fas fa-plus"></i>
                    إنشاء مفتاح جديد
                </button>
            </div>
        `;
        return;
    }
    
    apiKeysList.innerHTML = apiKeys.map(key => `
        <div class="api-key-item">
            <div class="api-key-info">
                <div class="api-key-name">${key.name}</div>
                <div class="api-key-value">${key.key}</div>
                <div class="api-key-usage">
                    الاستخدام: ${key.usage || 0} / ${key.limit === 'unlimited' ? '∞' : key.limit}
                </div>
            </div>
            <div class="api-key-actions">
                <button class="api-key-btn btn-copy" onclick="copyApiKey('${key.key}')">
                    <i class="fas fa-copy"></i>
                    نسخ
                </button>
                <button class="api-key-btn btn-details" onclick="showApiKeyDetails('${key.id}')">
                    <i class="fas fa-info"></i>
                    تفاصيل
                </button>
                <button class="api-key-btn btn-delete" onclick="deleteApiKey('${key.id}')">
                    <i class="fas fa-trash"></i>
                    حذف
                </button>
            </div>
        </div>
    `).join('');
}

// Handle Create API Key
async function handleCreateApiKey(e) {
    e.preventDefault();
    
    const name = document.getElementById('api-key-name').value;
    const limit = document.getElementById('api-key-limit').value;
    const apiKey = generateApiKey();
    
    try {
        const apiKeyRef = ref(database, `users/${currentUser.uid}/apiKeys/${apiKey}`);
        await set(apiKeyRef, {
            key: apiKey,
            name: name,
            createdAt: new Date().toISOString(),
            usage: 0,
            limit: limit
        });
        
        hideModal('create-api-key-modal');
        showNotification('تم إنشاء مفتاح API بنجاح!', 'success');
        document.getElementById('create-api-key-form').reset();
    } catch (error) {
        console.error('Error creating API key:', error);
        showNotification('خطأ في إنشاء مفتاح API', 'error');
    }
}

// Generate API Key
function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'rel_';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Copy API Key
function copyApiKey(key) {
    navigator.clipboard.writeText(key).then(() => {
        showNotification('تم نسخ مفتاح API', 'success');
    }).catch(() => {
        showNotification('خطأ في نسخ مفتاح API', 'error');
    });
}

// Show API Key Details
function showApiKeyDetails(keyId) {
    const key = apiKeys.find(k => k.id === keyId);
    if (!key) return;
    
    document.getElementById('details-key-name').value = key.name;
    document.getElementById('details-api-key').value = key.key;
    document.getElementById('details-created-at').value = new Date(key.createdAt).toLocaleDateString('ar-SA');
    
    const usage = key.usage || 0;
    const limit = key.limit === 'unlimited' ? 1000 : parseInt(key.limit);
    const percentage = Math.min((usage / limit) * 100, 100);
    
    document.getElementById('usage-progress').style.width = `${percentage}%`;
    document.getElementById('usage-text').textContent = `${usage} / ${key.limit === 'unlimited' ? '∞' : key.limit}`;
    
    showModal('api-key-details-modal');
}

// Delete API Key
async function deleteApiKey(keyId) {
    if (!confirm('هل أنت متأكد من حذف هذا المفتاح؟')) return;
    
    try {
        const apiKeyRef = ref(database, `users/${currentUser.uid}/apiKeys/${keyId}`);
        await remove(apiKeyRef);
        showNotification('تم حذف مفتاح API', 'success');
    } catch (error) {
        console.error('Error deleting API key:', error);
        showNotification('خطأ في حذف مفتاح API', 'error');
    }
}

// Update Conversations UI
function updateConversationsUI() {
    const conversationsList = document.getElementById('conversations-list');
    if (!conversationsList) return;
    
    if (conversations.length === 0) {
        conversationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h3>لا توجد محادثات</h3>
                <p>ابدأ محادثة جديدة مع Relosity AI</p>
            </div>
        `;
        return;
    }
    
    conversationsList.innerHTML = conversations
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(conv => `
            <div class="conversation-item" onclick="loadConversation('${conv.id}')">
                <div class="conversation-info">
                    <div class="conversation-title">${conv.topic || 'محادثة عامة'}</div>
                    <div class="conversation-preview">${conv.userMessage.substring(0, 100)}...</div>
                    <div class="conversation-meta">
                        <span>${new Date(conv.timestamp).toLocaleDateString('ar-SA')}</span>
                        <span>${new Date(conv.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
                <div class="conversation-actions">
                    <button class="api-key-btn btn-details" onclick="event.stopPropagation(); loadConversation('${conv.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="api-key-btn btn-delete" onclick="event.stopPropagation(); deleteConversation('${conv.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
}

// Load Conversation
function loadConversation(conversationId) {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    
    // Switch to chat section
    switchSection('chat');
    
    // Clear current chat
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    
    // Add conversation messages
    addMessage(conversation.userMessage, 'user');
    addMessage(conversation.aiResponse, 'ai');
}

// Delete Conversation
async function deleteConversation(conversationId) {
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة؟')) return;
    
    try {
        const conversationRef = ref(database, `users/${currentUser.uid}/conversations/${conversationId}`);
        await remove(conversationRef);
        showNotification('تم حذف المحادثة', 'success');
    } catch (error) {
        console.error('Error deleting conversation:', error);
        showNotification('خطأ في حذف المحادثة', 'error');
    }
}

// Setup Settings
function setupSettings() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchSettingsTab(tab);
        });
    });
    
    // Update profile
    const updateProfileBtn = document.getElementById('update-profile-btn');
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', handleUpdateProfile);
    }
    
    // Load user settings
    loadUserSettings();
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

// Load User Settings
function loadUserSettings() {
    if (!currentUser) return;
    
    // Load profile data
    document.getElementById('profile-name').value = currentUser.displayName || '';
    document.getElementById('profile-email').value = currentUser.email || '';
    
    if (currentUser.metadata && currentUser.metadata.creationTime) {
        const joinDate = new Date(currentUser.metadata.creationTime).toLocaleDateString('ar-SA');
        document.getElementById('profile-join-date').value = joinDate;
    }
}

// Handle Update Profile
async function handleUpdateProfile() {
    const name = document.getElementById('profile-name').value;
    
    try {
        await updateProfile(currentUser, { displayName: name });
        showNotification('تم تحديث الملف الشخصي', 'success');
        updateUserUI();
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('خطأ في تحديث الملف الشخصي', 'error');
    }
}

// Setup Charts
function setupCharts() {
    // This will be called when analytics section is loaded
}

// Load Analytics Data
function loadAnalyticsData() {
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
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
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
    
    // Conversations Chart
    const conversationsCtx = document.getElementById('conversations-chart');
    if (conversationsCtx) {
        new Chart(conversationsCtx, {
            type: 'bar',
            data: {
                labels: generateLast7Days(),
                datasets: [{
                    label: 'المحادثات',
                    data: generateRandomData(7, 0, 50),
                    backgroundColor: '#8b5cf6',
                    borderColor: '#7c3aed',
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
    
    // Topics List
    updateTopicsList();
}

// Generate Last 7 Days
function generateLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toLocaleDateString('ar-SA', { weekday: 'short' }));
    }
    return days;
}

// Generate Random Data
function generateRandomData(count, min, max) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return data;
}

// Update Topics List
function updateTopicsList() {
    const topicsList = document.getElementById('topics-list');
    if (!topicsList) return;
    
    const topics = {};
    conversations.forEach(conv => {
        const topic = conv.topic || 'عام';
        topics[topic] = (topics[topic] || 0) + 1;
    });
    
    const sortedTopics = Object.entries(topics)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    topicsList.innerHTML = sortedTopics.map(([topic, count]) => `
        <div class="topic-item">
            <span class="topic-name">${topic}</span>
            <span class="topic-count">${count}</span>
        </div>
    `).join('');
}

// Setup Modals
function setupModals() {
    // Close modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            hideModal(modal.id);
        });
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id);
            }
        });
    });
}

// Show Modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Hide Modal
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Handle Logout
async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('خطأ في تسجيل الخروج', 'error');
    }
}

// Utility Functions
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

// Global Functions (for onclick handlers)
window.switchSection = switchSection;
window.showModal = showModal;
window.hideModal = hideModal;
window.copyApiKey = copyApiKey;
window.showApiKeyDetails = showApiKeyDetails;
window.deleteApiKey = deleteApiKey;
window.loadConversation = loadConversation;
window.deleteConversation = deleteConversation;

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
    
    .empty-state {
        text-align: center;
        padding: 3rem 2rem;
        color: var(--gray-500);
    }
    
    .empty-state i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: var(--gray-400);
    }
    
    .empty-state h3 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: var(--gray-700);
    }
    
    .empty-state p {
        margin-bottom: 2rem;
    }
`;
document.head.appendChild(style);