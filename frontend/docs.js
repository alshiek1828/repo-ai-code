// Documentation JavaScript
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

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

// Global Variables
let isDarkMode = localStorage.getItem('theme') === 'dark';

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const themeToggle = document.getElementById('theme-toggle');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupAuthStateListener();
    setupTheme();
    setupScrollSpy();
    setupCodeCopy();
    setupAPIExplorer();
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
    
    // Sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            scrollToSection(targetId);
            updateActiveLink(link);
        });
    });
}

// Setup Auth State Listener
function setupAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
        // Update UI based on auth state if needed
    });
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

// Setup Scroll Spy
function setupScrollSpy() {
    const sections = document.querySelectorAll('.docs-section');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                const activeLink = document.querySelector(`.sidebar-link[href="#${id}"]`);
                if (activeLink) {
                    updateActiveLink(activeLink);
                }
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-100px 0px -50% 0px'
    });
    
    sections.forEach(section => {
        observer.observe(section);
    });
}

// Update Active Link
function updateActiveLink(activeLink) {
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

// Scroll to Section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const offsetTop = section.offsetTop - 100;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
}

// Setup Code Copy
function setupCodeCopy() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            copyCode(btn);
        });
    });
}

// Copy Code
function copyCode(btn) {
    const codeBlock = btn.closest('.code-block');
    const code = codeBlock.querySelector('code');
    const text = code.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        // Show success feedback
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.color = '#10b981';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.color = '';
        }, 2000);
    }).catch(() => {
        // Show error feedback
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-times"></i>';
        btn.style.color = '#ef4444';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.color = '';
        }, 2000);
    });
}

// Setup API Explorer
function setupAPIExplorer() {
    const endpointSelect = document.getElementById('explorer-endpoint');
    const dataTextarea = document.getElementById('explorer-data');
    
    // Set default data based on endpoint
    endpointSelect.addEventListener('change', () => {
        const endpoint = endpointSelect.value;
        const defaultData = getDefaultData(endpoint);
        dataTextarea.value = JSON.stringify(defaultData, null, 2);
    });
    
    // Set initial data
    const initialData = getDefaultData(endpointSelect.value);
    dataTextarea.value = JSON.stringify(initialData, null, 2);
}

// Get Default Data for Endpoint
function getDefaultData(endpoint) {
    const defaultData = {
        chat: {
            message: "مرحباً، كيف حالك؟",
            model: "gpt-3.5-turbo",
            temperature: 0.7,
            max_tokens: 1000
        },
        image: {
            prompt: "قطة لطيفة تجلس في الحديقة",
            size: "1024x1024",
            quality: "standard",
            n: 1
        },
        embeddings: {
            input: "مرحباً بك في Relosity AI"
        },
        moderate: {
            input: "النص المراد فحصه"
        }
    };
    
    return defaultData[endpoint] || {};
}

// Test API
async function testAPI() {
    const apiKey = document.getElementById('explorer-api-key').value;
    const endpoint = document.getElementById('explorer-endpoint').value;
    const dataText = document.getElementById('explorer-data').value;
    const resultElement = document.getElementById('explorer-result');
    
    if (!apiKey) {
        resultElement.textContent = 'خطأ: يرجى إدخال مفتاح API';
        return;
    }
    
    if (!dataText) {
        resultElement.textContent = 'خطأ: يرجى إدخال البيانات';
        return;
    }
    
    try {
        const data = JSON.parse(dataText);
        const endpointMap = {
            chat: '/ai/chat',
            image: '/ai/generate-image',
            embeddings: '/ai/embeddings',
            moderate: '/ai/moderate'
        };
        
        const url = `https://api.relosity-ai.com${endpointMap[endpoint]}`;
        
        resultElement.textContent = 'جاري إرسال الطلب...';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            resultElement.textContent = JSON.stringify(result, null, 2);
        } else {
            resultElement.textContent = `خطأ ${response.status}: ${JSON.stringify(result, null, 2)}`;
        }
        
    } catch (error) {
        resultElement.textContent = `خطأ: ${error.message}`;
    }
}

// Global Functions (for onclick handlers)
window.testAPI = testAPI;
window.copyCode = copyCode;

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    .sidebar-link {
        transition: all 0.15s ease;
    }
    
    .copy-btn {
        transition: all 0.15s ease;
    }
    
    .code-block {
        transition: box-shadow 0.15s ease;
    }
    
    .code-block:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    
    .api-explorer {
        transition: all 0.15s ease;
    }
    
    .status-item {
        transition: all 0.15s ease;
    }
    
    .status-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .changelog-item {
        transition: all 0.15s ease;
    }
    
    .changelog-item:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
`;
document.head.appendChild(style);