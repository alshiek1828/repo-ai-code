const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const OpenAI = require('openai');
const multer = require('multer');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const WebSocket = require('ws');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const JSZip = require('jszip');
const archiver = require('archiver');
const { VM } = require('vm2');
const axios = require('axios');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin
const serviceAccount = {
    type: "service_account",
    project_id: "gmae-fae90",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://gmae-fae90-default-rtdb.firebaseio.com",
    storageBucket: "gmae-fae90.firebasestorage.app"
});

const db = admin.database();
const storage = admin.storage();

// Initialize OpenAI (Fallback)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
});

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('frontend/dist'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Multer configuration for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const userRef = db.ref(`users/${req.user.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (!userData || userData.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('Admin verification error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

// API Key validation middleware
const validateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    try {
        // Find the API key in database
        const apiKeysRef = db.ref('apiKeys');
        const snapshot = await apiKeysRef.once('value');
        const allApiKeys = snapshot.val();

        let keyOwner = null;
        let keyData = null;

        for (const userId in allApiKeys) {
            for (const key in allApiKeys[userId]) {
                if (allApiKeys[userId][key].key === apiKey) {
                    keyOwner = userId;
                    keyData = allApiKeys[userId][key];
                    break;
                }
            }
            if (keyOwner) break;
        }

        if (!keyOwner || !keyData.isActive) {
            return res.status(403).json({ error: 'Invalid or inactive API key' });
        }

        // Check usage limits
        if (keyData.limit !== 'unlimited' && keyData.usage >= keyData.limit) {
            return res.status(429).json({ error: 'API key usage limit exceeded' });
        }

        req.apiKeyOwner = keyOwner;
        req.apiKeyData = keyData;
        next();
    } catch (error) {
        console.error('API key validation error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Code Execution endpoint
app.post('/api/execute', authenticateToken, async (req, res) => {
    try {
        const { code, language = 'javascript' } = req.body;

        if (!code || !code.trim()) {
            return res.status(400).json({ error: 'Code is required' });
        }

        let result = '';
        let error = '';

        try {
            if (language === 'javascript') {
                const vm = new VM({
                    timeout: parseInt(process.env.CODE_TIMEOUT) || 30000,
                    sandbox: {
                        console: {
                            log: (...args) => {
                                result += args.map(arg => 
                                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                                ).join(' ') + '\n';
                            }
                        }
                    }
                });

                const output = vm.run(code);
                if (output !== undefined) {
                    result += String(output);
                }
            } else {
                // For other languages, we could implement Docker containers or external services
                result = `Language ${language} execution not yet implemented. Only JavaScript is currently supported.`;
            }

        } catch (execError) {
            error = execError.message;
        }

        res.json({
            success: true,
            result: result,
            error: error,
            language: language,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Code execution error:', error);
        res.status(500).json({ error: 'Failed to execute code' });
    }
});

// File System endpoints
app.get('/api/files/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const projectPath = path.join(process.env.UPLOAD_DIR || 'uploads', req.user.uid, projectId);
        
        try {
            await fs.access(projectPath);
        } catch {
            await fs.mkdir(projectPath, { recursive: true });
        }

        const files = await getFileTree(projectPath);
        res.json({
            success: true,
            files: files
        });

    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

app.post('/api/files/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { fileName, content, path: filePath } = req.body;
        
        const projectDir = path.join(process.env.UPLOAD_DIR || 'uploads', req.user.uid, projectId);
        const fullPath = path.join(projectDir, filePath || '', fileName);
        
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content || '');

        res.json({
            success: true,
            message: 'File created successfully'
        });

    } catch (error) {
        console.error('Create file error:', error);
        res.status(500).json({ error: 'Failed to create file' });
    }
});

app.put('/api/files/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { fileName, content, path: filePath } = req.body;
        
        const projectDir = path.join(process.env.UPLOAD_DIR || 'uploads', req.user.uid, projectId);
        const fullPath = path.join(projectDir, filePath || '', fileName);
        
        await fs.writeFile(fullPath, content || '');

        res.json({
            success: true,
            message: 'File updated successfully'
        });

    } catch (error) {
        console.error('Update file error:', error);
        res.status(500).json({ error: 'Failed to update file' });
    }
});

app.delete('/api/files/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { fileName, path: filePath } = req.body;
        
        const projectDir = path.join(process.env.UPLOAD_DIR || 'uploads', req.user.uid, projectId);
        const fullPath = path.join(projectDir, filePath || '', fileName);
        
        await fs.unlink(fullPath);

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// Export project as ZIP
app.get('/api/export/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const projectDir = path.join(process.env.UPLOAD_DIR || 'uploads', req.user.uid, projectId);
        
        const zip = new JSZip();
        await addDirectoryToZip(zip, projectDir, '');
        
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${projectId}.zip"`);
        res.send(zipBuffer);

    } catch (error) {
        console.error('Export project error:', error);
        res.status(500).json({ error: 'Failed to export project' });
    }
});

// AI Chat endpoint
app.post('/api/chat', authenticateToken, async (req, res) => {
    try {
        const { message, chatId } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get AI response
        const aiResponse = await getAIResponse(message, req.user.uid);

        // Save conversation to database
        if (chatId) {
            const chatRef = db.ref(`users/${req.user.uid}/chats/${chatId}/messages`);
            await chatRef.push({
                content: message,
                sender: 'user',
                timestamp: new Date().toISOString()
            });

            await chatRef.push({
                content: aiResponse,
                sender: 'ai',
                timestamp: new Date().toISOString()
            });

            // Update chat last message
            await db.ref(`users/${req.user.uid}/chats/${chatId}`).update({
                lastMessage: aiResponse,
                lastMessageTime: new Date().toISOString()
            });
        }

        // Update user usage stats
        await updateUserUsage(req.user.uid, 'conversations');

        res.json({
            success: true,
            response: aiResponse,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});

// AI Chat endpoint for API keys
app.post('/api/v1/chat', validateApiKey, async (req, res) => {
    try {
        const { message, model = 'gpt-3.5-turbo' } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get AI response
        const aiResponse = await getAIResponse(message, req.apiKeyOwner, model);

        // Update API key usage
        await updateApiKeyUsage(req.apiKeyOwner, req.apiKeyData.key);

        res.json({
            success: true,
            response: aiResponse,
            model: model,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('API Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});

// Get user conversations
app.get('/api/conversations', authenticateToken, async (req, res) => {
    try {
        const conversationsRef = db.ref(`users/${req.user.uid}/chats`);
        const snapshot = await conversationsRef.once('value');
        const conversations = snapshot.val() || {};

        res.json({
            success: true,
            conversations: Object.values(conversations)
        });

    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get specific conversation
app.get('/api/conversations/:chatId', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const chatRef = db.ref(`users/${req.user.uid}/chats/${chatId}`);
        const snapshot = await chatRef.once('value');
        const chat = snapshot.val();

        if (!chat) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json({
            success: true,
            conversation: chat
        });

    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

// Create new conversation
app.post('/api/conversations', authenticateToken, async (req, res) => {
    try {
        const { title = 'محادثة جديدة' } = req.body;
        const chatId = Date.now().toString();

        const chatData = {
            id: chatId,
            title: title,
            createdAt: new Date().toISOString(),
            lastMessage: '',
            lastMessageTime: new Date().toISOString(),
            messages: []
        };

        await db.ref(`users/${req.user.uid}/chats/${chatId}`).set(chatData);

        res.json({
            success: true,
            conversation: chatData
        });

    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

// Get user API keys
app.get('/api/api-keys', authenticateToken, async (req, res) => {
    try {
        const apiKeysRef = db.ref(`apiKeys/${req.user.uid}`);
        const snapshot = await apiKeysRef.once('value');
        const apiKeys = snapshot.val() || {};

        res.json({
            success: true,
            apiKeys: Object.values(apiKeys)
        });

    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({ error: 'Failed to fetch API keys' });
    }
});

// Create new API key
app.post('/api/api-keys', authenticateToken, async (req, res) => {
    try {
        const { name, limit = 100 } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'API key name is required' });
        }

        const apiKey = generateApiKey();
        const keyData = {
            key: apiKey,
            name: name,
            createdAt: new Date().toISOString(),
            isActive: true,
            usage: 0,
            limit: limit
        };

        await db.ref(`apiKeys/${req.user.uid}/${apiKey}`).set(keyData);

        res.json({
            success: true,
            apiKey: keyData
        });

    } catch (error) {
        console.error('Create API key error:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

// Delete API key
app.delete('/api/api-keys/:keyId', authenticateToken, async (req, res) => {
    try {
        const { keyId } = req.params;

        await db.ref(`apiKeys/${req.user.uid}/${keyId}`).remove();

        res.json({
            success: true,
            message: 'API key deleted successfully'
        });

    } catch (error) {
        console.error('Delete API key error:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

// Get user analytics
app.get('/api/analytics', authenticateToken, async (req, res) => {
    try {
        const userRef = db.ref(`users/${req.user.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        const analytics = {
            totalConversations: userData?.usage?.conversations || 0,
            totalApiCalls: userData?.usage?.apiCalls || 0,
            plan: userData?.plan || 'free',
            createdAt: userData?.createdAt,
            lastLogin: userData?.lastLogin
        };

        res.json({
            success: true,
            analytics: analytics
        });

    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// File upload endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileName = `${Date.now()}-${req.file.originalname}`;
        const fileRef = storage.bucket().file(`uploads/${req.user.uid}/${fileName}`);

        await fileRef.save(req.file.buffer, {
            metadata: {
                contentType: req.file.mimetype,
                metadata: {
                    uploadedBy: req.user.uid,
                    originalName: req.file.originalname
                }
            }
        });

        const downloadURL = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-01-2500'
        });

        res.json({
            success: true,
            fileUrl: downloadURL[0],
            fileName: fileName
        });

    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Admin routes
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const usersRef = db.ref('users');
        const snapshot = await usersRef.once('value');
        const users = snapshot.val() || {};

        res.json({
            success: true,
            users: Object.values(users)
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.get('/api/admin/stats', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const usersRef = db.ref('users');
        const apiKeysRef = db.ref('apiKeys');
        const conversationsRef = db.ref('conversations');

        const [usersSnapshot, apiKeysSnapshot, conversationsSnapshot] = await Promise.all([
            usersRef.once('value'),
            apiKeysRef.once('value'),
            conversationsRef.once('value')
        ]);

        const users = usersSnapshot.val() || {};
        const apiKeys = apiKeysSnapshot.val() || {};
        const conversations = conversationsSnapshot.val() || {};

        const stats = {
            totalUsers: Object.keys(users).length,
            totalApiKeys: Object.keys(apiKeys).length,
            totalConversations: Object.keys(conversations).length,
            activeUsers: Object.values(users).filter(user => user.isActive).length
        };

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

// Gemini API Helper Functions
async function getGeminiResponse(message, context = '') {
    try {
        if (!GEMINI_API_KEY) {
            throw new Error('Gemini API key not configured');
        }

        const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            contents: [{
                parts: [{
                    text: `${context ? `Context: ${context}\n\n` : ''}User: ${message}\n\nAssistant:`
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        });

        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
}

// Helper functions
async function getAIResponse(message, userId, model = 'gpt-3.5-turbo') {
    try {
        // Get user's conversation history for context
        const userRef = db.ref(`users/${userId}/chats`);
        const snapshot = await userRef.limitToLast(1).once('value');
        const recentChats = snapshot.val() || {};

        // Build context from recent messages
        let context = '';
        for (const chatId in recentChats) {
            const messages = recentChats[chatId].messages || {};
            const recentMessages = Object.values(messages).slice(-5); // Last 5 messages
            context += recentMessages.map(msg => 
                `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n');
        }

        // Try Gemini first, fallback to OpenAI
        try {
            return await getGeminiResponse(message, context);
        } catch (geminiError) {
            console.log('Gemini failed, trying OpenAI fallback:', geminiError.message);
            
            const completion = await openai.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: `You are Replit AI, an advanced Arabic AI coding assistant. You help users with coding, debugging, explaining code, and programming tasks. Always respond in Arabic unless specifically asked to use another language. Be helpful, accurate, and engaging.${context ? '\n\nPrevious conversation context:\n' + context : ''}`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            });

            return completion.choices[0].message.content;
        }

    } catch (error) {
        console.error('AI API error:', error);
        
        // Fallback responses in Arabic
        const fallbackResponses = [
            'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.',
            'أعتذر، لا يمكنني معالجة طلبك في الوقت الحالي. حاول مرة أخرى لاحقاً.',
            'حدث خطأ تقني. يرجى إعادة المحاولة.',
            'أنا آسف، لكنني أواجه مشكلة تقنية. حاول مرة أخرى.'
        ];
        
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
}

// File System Helper Functions
async function getFileTree(dirPath, basePath = '') {
    const items = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
            const children = await getFileTree(fullPath, relativePath);
            items.push({
                name: entry.name,
                type: 'directory',
                path: relativePath,
                children: children
            });
        } else {
            const stats = await fs.stat(fullPath);
            items.push({
                name: entry.name,
                type: 'file',
                path: relativePath,
                size: stats.size,
                modified: stats.mtime
            });
        }
    }
    
    return items;
}

async function addDirectoryToZip(zip, dirPath, zipPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const zipFilePath = path.join(zipPath, entry.name);
        
        if (entry.isDirectory()) {
            await addDirectoryToZip(zip, fullPath, zipFilePath);
        } else {
            const content = await fs.readFile(fullPath);
            zip.file(zipFilePath, content);
        }
    }
}

function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'repl_';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function updateUserUsage(userId, type) {
    try {
        const usageRef = db.ref(`users/${userId}/usage`);
        const snapshot = await usageRef.once('value');
        const currentUsage = snapshot.val() || { conversations: 0, apiCalls: 0 };

        const updates = {
            [type]: (currentUsage[type] || 0) + 1,
            lastUsed: new Date().toISOString()
        };

        await usageRef.update(updates);
    } catch (error) {
        console.error('Update usage error:', error);
    }
}

async function updateApiKeyUsage(userId, apiKey) {
    try {
        const keyRef = db.ref(`apiKeys/${userId}/${apiKey}`);
        const snapshot = await keyRef.once('value');
        const keyData = snapshot.val();

        if (keyData) {
            await keyRef.update({
                usage: (keyData.usage || 0) + 1,
                lastUsed: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Update API key usage error:', error);
    }
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// WebSocket for real-time collaboration
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-project', (projectId) => {
        socket.join(projectId);
        console.log(`User ${socket.id} joined project ${projectId}`);
    });

    socket.on('leave-project', (projectId) => {
        socket.leave(projectId);
        console.log(`User ${socket.id} left project ${projectId}`);
    });

    socket.on('code-change', (data) => {
        socket.to(data.projectId).emit('code-change', data);
    });

    socket.on('cursor-position', (data) => {
        socket.to(data.projectId).emit('cursor-position', {
            ...data,
            userId: socket.id
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Replit AI Backend Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 WebSocket enabled for real-time collaboration`);
});

module.exports = { app, server, io };