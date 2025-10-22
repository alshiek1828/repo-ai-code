const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const { OpenAI } = require('openai');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Firebase Admin Configuration
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
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://gmae-fae90-default-rtdb.firebaseio.com",
    storageBucket: "gmae-fae90.firebasestorage.app"
});

const db = admin.database();
const storage = admin.storage();

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.openai.com", "https://gmae-fae90-default-rtdb.firebaseio.com"]
        }
    }
}));

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 AI requests per minute
    message: {
        error: 'Too many AI requests, please wait a moment.'
    }
});

app.use('/api/', limiter);
app.use('/api/ai/', aiLimiter);

// Multer configuration for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('text/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images and text files are allowed'), false);
        }
    }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Email Configuration
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware to verify API key
const verifyApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({ error: 'API key required' });
        }

        // Check if API key exists in database
        const apiKeyRef = db.ref('apiKeys');
        const snapshot = await apiKeyRef.orderByChild('key').equalTo(apiKey).once('value');
        const apiKeyData = snapshot.val();

        if (!apiKeyData) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        const keyId = Object.keys(apiKeyData)[0];
        const keyInfo = apiKeyData[keyId];

        // Check usage limits
        if (keyInfo.limit !== 'unlimited' && keyInfo.usage >= keyInfo.limit) {
            return res.status(429).json({ error: 'API key usage limit exceeded' });
        }

        req.apiKey = { id: keyId, ...keyInfo };
        next();
    } catch (error) {
        console.error('API key verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
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

// AI Chat endpoint
app.post('/api/ai/chat', verifyApiKey, async (req, res) => {
    try {
        const { message, conversationId } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Generate AI response using OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are Relosity AI, a helpful Arabic AI assistant. Respond in Arabic and be helpful, accurate, and friendly. Keep responses concise but informative."
                },
                {
                    role: "user",
                    content: message
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        });

        const aiResponse = completion.choices[0].message.content;

        // Update API key usage
        const apiKeyRef = db.ref(`apiKeys/${req.apiKey.id}`);
        await apiKeyRef.update({
            usage: (req.apiKey.usage || 0) + 1,
            lastUsed: new Date().toISOString()
        });

        // Save conversation if conversationId provided
        if (conversationId) {
            const conversationRef = db.ref(`conversations/${conversationId}`);
            await conversationRef.push({
                userMessage: message,
                aiResponse: aiResponse,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            response: aiResponse,
            conversationId: conversationId || uuidv4(),
            usage: req.apiKey.usage + 1,
            limit: req.apiKey.limit
        });

    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({ error: 'Failed to generate AI response' });
    }
});

// Generate API Key
app.post('/api/keys/generate', verifyFirebaseToken, async (req, res) => {
    try {
        const { name, limit = 1000 } = req.body;
        const userId = req.user.uid;

        if (!name) {
            return res.status(400).json({ error: 'API key name is required' });
        }

        // Generate API key
        const apiKey = `rel_${crypto.randomBytes(32).toString('hex')}`;
        const keyId = uuidv4();

        // Save to database
        const apiKeyRef = db.ref(`apiKeys/${keyId}`);
        await apiKeyRef.set({
            key: apiKey,
            name: name,
            userId: userId,
            limit: limit,
            usage: 0,
            createdAt: new Date().toISOString(),
            isActive: true
        });

        // Also save to user's API keys
        const userApiKeyRef = db.ref(`users/${userId}/apiKeys/${keyId}`);
        await userApiKeyRef.set({
            key: apiKey,
            name: name,
            limit: limit,
            usage: 0,
            createdAt: new Date().toISOString()
        });

        res.json({
            apiKey: apiKey,
            keyId: keyId,
            name: name,
            limit: limit
        });

    } catch (error) {
        console.error('API key generation error:', error);
        res.status(500).json({ error: 'Failed to generate API key' });
    }
});

// Get user's API keys
app.get('/api/keys', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const userApiKeysRef = db.ref(`users/${userId}/apiKeys`);
        const snapshot = await userApiKeysRef.once('value');
        const apiKeys = snapshot.val() || {};

        const keysList = Object.entries(apiKeys).map(([id, key]) => ({
            id,
            ...key
        }));

        res.json({ apiKeys: keysList });

    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({ error: 'Failed to retrieve API keys' });
    }
});

// Delete API key
app.delete('/api/keys/:keyId', verifyFirebaseToken, async (req, res) => {
    try {
        const { keyId } = req.params;
        const userId = req.user.uid;

        // Check if key belongs to user
        const userApiKeyRef = db.ref(`users/${userId}/apiKeys/${keyId}`);
        const snapshot = await userApiKeyRef.once('value');
        
        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'API key not found' });
        }

        // Delete from both locations
        await userApiKeyRef.remove();
        await db.ref(`apiKeys/${keyId}`).remove();

        res.json({ message: 'API key deleted successfully' });

    } catch (error) {
        console.error('Delete API key error:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

// Get conversations
app.get('/api/conversations', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const conversationsRef = db.ref(`users/${userId}/conversations`);
        const snapshot = await conversationsRef.once('value');
        const conversations = snapshot.val() || {};

        const conversationsList = Object.entries(conversations).map(([id, conv]) => ({
            id,
            ...conv
        }));

        res.json({ conversations: conversationsList });

    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Failed to retrieve conversations' });
    }
});

// Save conversation
app.post('/api/conversations', verifyFirebaseToken, async (req, res) => {
    try {
        const { userMessage, aiResponse, topic } = req.body;
        const userId = req.user.uid;

        if (!userMessage || !aiResponse) {
            return res.status(400).json({ error: 'User message and AI response are required' });
        }

        const conversationRef = db.ref(`users/${userId}/conversations`);
        const newConversation = await conversationRef.push({
            userMessage,
            aiResponse,
            topic: topic || 'عام',
            timestamp: new Date().toISOString()
        });

        res.json({
            conversationId: newConversation.key,
            message: 'Conversation saved successfully'
        });

    } catch (error) {
        console.error('Save conversation error:', error);
        res.status(500).json({ error: 'Failed to save conversation' });
    }
});

// Delete conversation
app.delete('/api/conversations/:conversationId', verifyFirebaseToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.uid;

        const conversationRef = db.ref(`users/${userId}/conversations/${conversationId}`);
        await conversationRef.remove();

        res.json({ message: 'Conversation deleted successfully' });

    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});

// Upload file
app.post('/api/upload', verifyFirebaseToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const userId = req.user.uid;
        const fileName = `${userId}/${Date.now()}_${req.file.originalname}`;
        const bucket = storage.bucket();
        const file = bucket.file(fileName);

        await file.save(req.file.buffer, {
            metadata: {
                contentType: req.file.mimetype,
                metadata: {
                    uploadedBy: userId,
                    originalName: req.file.originalname
                }
            }
        });

        // Make file publicly accessible
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        res.json({
            url: publicUrl,
            fileName: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype
        });

    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Contact form
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Save to database
        const contactRef = db.ref('contacts');
        await contactRef.push({
            name,
            email,
            subject,
            message,
            timestamp: new Date().toISOString(),
            status: 'new'
        });

        // Send email notification
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL || 'admin@relosity-ai.com',
            subject: `New Contact Form Submission: ${subject}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: 'Contact form submitted successfully' });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ error: 'Failed to submit contact form' });
    }
});

// Admin routes
app.get('/api/admin/stats', verifyFirebaseToken, async (req, res) => {
    try {
        // Check if user is admin
        const userRef = db.ref(`users/${req.user.uid}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();

        if (!userData || userData.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Get statistics
        const [usersSnapshot, conversationsSnapshot, apiKeysSnapshot, contactsSnapshot] = await Promise.all([
            db.ref('users').once('value'),
            db.ref('conversations').once('value'),
            db.ref('apiKeys').once('value'),
            db.ref('contacts').once('value')
        ]);

        const stats = {
            totalUsers: Object.keys(usersSnapshot.val() || {}).length,
            totalConversations: Object.keys(conversationsSnapshot.val() || {}).length,
            totalApiKeys: Object.keys(apiKeysSnapshot.val() || {}).length,
            totalContacts: Object.keys(contactsSnapshot.val() || {}).length,
            activeApiKeys: Object.values(apiKeysSnapshot.val() || {}).filter(key => key.isActive).length
        };

        res.json(stats);

    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to retrieve admin statistics' });
    }
});

// Get all users (admin only)
app.get('/api/admin/users', verifyFirebaseToken, async (req, res) => {
    try {
        // Check if user is admin
        const userRef = db.ref(`users/${req.user.uid}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();

        if (!userData || userData.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const usersRef = db.ref('users');
        const snapshot = await usersRef.once('value');
        const users = snapshot.val() || {};

        const usersList = Object.entries(users).map(([id, user]) => ({
            id,
            ...user
        }));

        res.json({ users: usersList });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});

// Update user role (admin only)
app.put('/api/admin/users/:userId/role', verifyFirebaseToken, async (req, res) => {
    try {
        // Check if user is admin
        const userRef = db.ref(`users/${req.user.uid}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();

        if (!userData || userData.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { userId } = req.params;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const targetUserRef = db.ref(`users/${userId}`);
        await targetUserRef.update({ role });

        res.json({ message: 'User role updated successfully' });

    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Relosity AI Backend Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🤖 AI Chat: http://localhost:${PORT}/api/ai/chat`);
    console.log(`🔑 API Keys: http://localhost:${PORT}/api/keys`);
});

module.exports = app;