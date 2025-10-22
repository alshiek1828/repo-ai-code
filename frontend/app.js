// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { getDatabase, ref, set, get, push, onValue, off } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

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
const messaging = getMessaging(app);

// Global Variables
let currentUser = null;
let userApiKeys = [];
let conversations = [];
let isDarkMode = localStorage.getItem('theme') === 'dark';

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const navbar = document.getElementById('navbar');
const navMenu = document.getElementById('nav-menu');
const hamburger = document.getElementById('hamburger');
const themeToggle = document.getElementById('theme-toggle');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const userMenuBtn = document.getElementById('user-menu-btn');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const contactForm = document.getElementById('contact-form');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupAuthStateListener();
    setupTheme();
    setupAnimations();
    setupParticles();
    setupFAQ();
    setupScrollEffects();
    setupCounters();
    setupDemoChat();
});

// Initialize App Function
function initializeApp() {
    // Hide loading screen after 2 seconds
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 2000);
    
    // Initialize AOS (Animate On Scroll) if available
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true,
            offset: 100
        });
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    hamburger.addEventListener('click', toggleMobileMenu);
    themeToggle.addEventListener('click', toggleTheme);
    
    // Auth Buttons
    loginBtn.addEventListener('click', () => showModal('login-modal'));
    registerBtn.addEventListener('click', () => showModal('register-modal'));
    userMenuBtn.addEventListener('click', showUserMenu);
    
    // Modal Controls
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
    
    // Forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    contactForm.addEventListener('submit', handleContact);
    
    // Navigation Links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            scrollToSection(targetId);
            closeMobileMenu();
        });
    });
    
    // CTA Buttons
    document.getElementById('get-started-btn').addEventListener('click', () => {
        showModal('register-modal');
    });
    
    document.getElementById('watch-demo-btn').addEventListener('click', () => {
        scrollToSection('features');
    });
    
    // Scroll Indicator
    document.querySelector('.scroll-arrow').addEventListener('click', () => {
        scrollToSection('features');
    });
    
    // Pricing Buttons
    document.querySelectorAll('.pricing-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentUser) {
                window.location.href = 'dashboard.html';
            } else {
                showModal('register-modal');
            }
        });
    });
}

// Setup Auth State Listener
function setupAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateUI();
        
        if (user) {
            loadUserData();
            requestNotificationPermission();
        }
    });
}

// Update UI based on auth state
function updateUI() {
    if (currentUser) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        userMenuBtn.style.display = 'block';
        
        // Update user menu button with user info
        userMenuBtn.innerHTML = `
            <i class="fas fa-user"></i>
            <span>${currentUser.displayName || 'المستخدم'}</span>
        `;
    } else {
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'block';
        userMenuBtn.style.display = 'none';
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
            userApiKeys = data ? Object.values(data) : [];
        });
        
        // Load Conversations
        const conversationsRef = ref(database, `users/${currentUser.uid}/conversations`);
        onValue(conversationsRef, (snapshot) => {
            const data = snapshot.val();
            conversations = data ? Object.values(data) : [];
        });
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('خطأ في تحميل البيانات', 'error');
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

// Setup Animations
function setupAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);
    
    // Observe elements
    document.querySelectorAll('.feature-card, .pricing-card, .faq-item').forEach(el => {
        observer.observe(el);
    });
}

// Setup Particles
function setupParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    // Create floating particles
    for (let i = 0; i < 50; i++) {
        createParticle(particlesContainer);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        pointer-events: none;
        animation: float ${Math.random() * 20 + 10}s linear infinite;
    `;
    
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 20 + 's';
    
    container.appendChild(particle);
}

// Setup FAQ
function setupFAQ() {
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Close all FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Toggle current item
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });
}

// Setup Scroll Effects
function setupScrollEffects() {
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Navbar scroll effect
        if (scrollTop > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Hide/show navbar on scroll
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });
}

// Setup Counters
function setupCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    const observerOptions = {
        threshold: 0.5
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    counters.forEach(counter => {
        observer.observe(counter);
    });
}

function animateCounter(element) {
    const target = parseFloat(element.getAttribute('data-target'));
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        if (target % 1 === 0) {
            element.textContent = Math.floor(current);
        } else {
            element.textContent = current.toFixed(1);
        }
    }, 16);
}

// Setup Demo Chat
function setupDemoChat() {
    const demoInput = document.getElementById('demo-input');
    const demoMessages = document.getElementById('demo-messages');
    const sendBtn = document.querySelector('.send-btn');
    
    if (!demoInput || !demoMessages || !sendBtn) return;
    
    const demoResponses = [
        "مرحباً! أنا Relosity AI، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟",
        "هذا رائع! يمكنني مساعدتك في العديد من المهام المختلفة.",
        "هل تريد معرفة المزيد عن مميزات منصتنا؟",
        "يمكنني الإجابة على أسئلتك وتقديم المساعدة في أي وقت.",
        "شكراً لك على استخدام Relosity AI! نحن هنا لمساعدتك دائماً."
    ];
    
    let messageCount = 0;
    
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${content}</p>
            </div>
            <div class="message-time">الآن</div>
        `;
        
        demoMessages.appendChild(messageDiv);
        demoMessages.scrollTop = demoMessages.scrollHeight;
    }
    
    function sendMessage() {
        const message = demoInput.value.trim();
        if (!message) return;
        
        addMessage(message, true);
        demoInput.value = '';
        
        // Simulate AI response
        setTimeout(() => {
            const response = demoResponses[messageCount % demoResponses.length];
            addMessage(response);
            messageCount++;
        }, 1000);
    }
    
    sendBtn.addEventListener('click', sendMessage);
    demoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Mobile Menu Functions
function toggleMobileMenu() {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
}

function closeMobileMenu() {
    navMenu.classList.remove('active');
    hamburger.classList.remove('active');
}

// Modal Functions
function showModal(modalId) {
    hideAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// Scroll to Section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const offsetTop = section.offsetTop - 70;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
}

// Auth Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        hideAllModals();
        showNotification('تم تسجيل الدخول بنجاح!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showNotification(getErrorMessage(error.code), 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    
    if (password !== confirmPassword) {
        showNotification('كلمات المرور غير متطابقة', 'error');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        // Create user data in database
        await set(ref(database, `users/${userCredential.user.uid}`), {
            name: name,
            email: email,
            createdAt: new Date().toISOString(),
            plan: 'free',
            apiKeys: {},
            conversations: {}
        });
        
        // Generate initial API key
        const apiKey = generateApiKey();
        await set(ref(database, `users/${userCredential.user.uid}/apiKeys/${apiKey}`), {
            key: apiKey,
            name: 'مفتاح افتراضي',
            createdAt: new Date().toISOString(),
            usage: 0,
            limit: 100
        });
        
        hideAllModals();
        showNotification('تم إنشاء الحساب بنجاح!', 'success');
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(getErrorMessage(error.code), 'error');
    }
}

// Contact Form Handler
async function handleContact(e) {
    e.preventDefault();
    
    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const subject = document.getElementById('contact-subject').value;
    const message = document.getElementById('contact-message').value;
    
    try {
        // Save contact message to database
        const contactRef = ref(database, 'contacts');
        await push(contactRef, {
            name,
            email,
            subject,
            message,
            timestamp: new Date().toISOString(),
            status: 'new'
        });
        
        contactForm.reset();
        showNotification('تم إرسال رسالتك بنجاح!', 'success');
    } catch (error) {
        console.error('Contact form error:', error);
        showNotification('خطأ في إرسال الرسالة', 'error');
    }
}

// User Menu
function showUserMenu() {
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.innerHTML = `
        <div class="user-menu-content">
            <div class="user-info">
                <i class="fas fa-user"></i>
                <span>${currentUser.displayName || 'المستخدم'}</span>
            </div>
            <div class="user-menu-items">
                <a href="dashboard.html" class="menu-item">
                    <i class="fas fa-tachometer-alt"></i>
                    لوحة التحكم
                </a>
                <a href="dashboard.html#api-keys" class="menu-item">
                    <i class="fas fa-key"></i>
                    مفاتيح API
                </a>
                <a href="dashboard.html#conversations" class="menu-item">
                    <i class="fas fa-comments"></i>
                    المحادثات
                </a>
                <a href="dashboard.html#settings" class="menu-item">
                    <i class="fas fa-cog"></i>
                    الإعدادات
                </a>
                <hr>
                <button class="menu-item logout-btn">
                    <i class="fas fa-sign-out-alt"></i>
                    تسجيل الخروج
                </button>
            </div>
        </div>
    `;
    
    // Position menu
    const rect = userMenuBtn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = rect.bottom + 'px';
    menu.style.right = '20px';
    menu.style.zIndex = '1000';
    
    document.body.appendChild(menu);
    
    // Handle logout
    menu.querySelector('.logout-btn').addEventListener('click', async () => {
        try {
            await signOut(auth);
            showNotification('تم تسجيل الخروج بنجاح', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('خطأ في تسجيل الخروج', 'error');
        }
    });
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target !== userMenuBtn) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

// Utility Functions
function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'rel_';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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

// Request Notification Permission
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return;
    }
    
    if (Notification.permission === 'granted') {
        return;
    }
    
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted');
        }
    }
}

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
    
    .animate-fade-in {
        animation: fadeInUp 0.6s ease-out;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .user-menu {
        background: white;
        border-radius: 0.75rem;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
        min-width: 200px;
    }
    
    .user-menu-content {
        padding: 1rem;
    }
    
    .user-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        margin-bottom: 0.5rem;
        border-bottom: 1px solid #e5e7eb;
        font-weight: 600;
        color: #374151;
    }
    
    .user-menu-items {
        display: flex;
        flex-direction: column;
    }
    
    .menu-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 0.5rem;
        color: #374151;
        text-decoration: none;
        border-radius: 0.5rem;
        transition: background-color 0.15s ease;
        border: none;
        background: none;
        width: 100%;
        text-align: right;
        cursor: pointer;
    }
    
    .menu-item:hover {
        background: #f3f4f6;
    }
    
    .logout-btn {
        color: #ef4444;
    }
    
    .logout-btn:hover {
        background: #fef2f2;
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
    
    .particle {
        animation: float 20s linear infinite;
    }
    
    @keyframes float {
        0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        90% {
            opacity: 1;
        }
        100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);