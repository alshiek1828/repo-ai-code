const express = require('express');
const { OpenAI } = require('openai');
const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const db = admin.database();

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
});

// Rate limiting for AI endpoints
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 AI requests per minute
    message: {
        error: 'Too many AI requests, please wait a moment.'
    }
});

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

        // Check if key is active
        if (!keyInfo.isActive) {
            return res.status(401).json({ error: 'API key is inactive' });
        }

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

// Chat endpoint
router.post('/chat', aiLimiter, verifyApiKey, async (req, res) => {
    try {
        const { message, conversationId, model = 'gpt-3.5-turbo', temperature = 0.7, maxTokens = 1000 } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Validate model
        const allowedModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'];
        if (!allowedModels.includes(model)) {
            return res.status(400).json({ error: 'Invalid model specified' });
        }

        // Generate AI response using OpenAI
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: "You are Relosity AI, a helpful Arabic AI assistant. Respond in Arabic and be helpful, accurate, and friendly. Keep responses concise but informative. If the user asks in English, respond in English."
                },
                {
                    role: "user",
                    content: message
                }
            ],
            max_tokens: maxTokens,
            temperature: temperature
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
                timestamp: new Date().toISOString(),
                model: model,
                temperature: temperature
            });
        }

        res.json({
            response: aiResponse,
            conversationId: conversationId || require('uuid').v4(),
            usage: {
                current: req.apiKey.usage + 1,
                limit: req.apiKey.limit,
                remaining: req.apiKey.limit === 'unlimited' ? 'unlimited' : req.apiKey.limit - (req.apiKey.usage + 1)
            },
            model: model,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('AI chat error:', error);
        
        if (error.code === 'insufficient_quota') {
            return res.status(429).json({ error: 'API quota exceeded' });
        }
        
        if (error.code === 'rate_limit_exceeded') {
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }

        res.status(500).json({ error: 'Failed to generate AI response' });
    }
});

// Text completion endpoint
router.post('/complete', aiLimiter, verifyApiKey, async (req, res) => {
    try {
        const { prompt, model = 'gpt-3.5-turbo', temperature = 0.7, maxTokens = 1000 } = req.body;
        
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Generate completion using OpenAI
        const completion = await openai.completions.create({
            model: model,
            prompt: prompt,
            max_tokens: maxTokens,
            temperature: temperature
        });

        const text = completion.choices[0].text;

        // Update API key usage
        const apiKeyRef = db.ref(`apiKeys/${req.apiKey.id}`);
        await apiKeyRef.update({
            usage: (req.apiKey.usage || 0) + 1,
            lastUsed: new Date().toISOString()
        });

        res.json({
            text: text,
            usage: {
                current: req.apiKey.usage + 1,
                limit: req.apiKey.limit,
                remaining: req.apiKey.limit === 'unlimited' ? 'unlimited' : req.apiKey.limit - (req.apiKey.usage + 1)
            },
            model: model,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Text completion error:', error);
        res.status(500).json({ error: 'Failed to generate text completion' });
    }
});

// Image generation endpoint
router.post('/generate-image', aiLimiter, verifyApiKey, async (req, res) => {
    try {
        const { prompt, size = '1024x1024', quality = 'standard', n = 1 } = req.body;
        
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Validate size
        const allowedSizes = ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'];
        if (!allowedSizes.includes(size)) {
            return res.status(400).json({ error: 'Invalid size specified' });
        }

        // Generate image using DALL-E
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: Math.min(n, 4), // Max 4 images
            size: size,
            quality: quality
        });

        // Update API key usage (images count as more usage)
        const apiKeyRef = db.ref(`apiKeys/${req.apiKey.id}`);
        await apiKeyRef.update({
            usage: (req.apiKey.usage || 0) + (n * 2), // Images count as 2x usage
            lastUsed: new Date().toISOString()
        });

        res.json({
            images: response.data.map(img => ({
                url: img.url,
                revised_prompt: img.revised_prompt
            })),
            usage: {
                current: req.apiKey.usage + (n * 2),
                limit: req.apiKey.limit,
                remaining: req.apiKey.limit === 'unlimited' ? 'unlimited' : req.apiKey.limit - (req.apiKey.usage + (n * 2))
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ error: 'Failed to generate image' });
    }
});

// Embeddings endpoint
router.post('/embeddings', aiLimiter, verifyApiKey, async (req, res) => {
    try {
        const { input, model = 'text-embedding-ada-002' } = req.body;
        
        if (!input) {
            return res.status(400).json({ error: 'Input is required' });
        }

        // Generate embeddings
        const response = await openai.embeddings.create({
            model: model,
            input: Array.isArray(input) ? input : [input]
        });

        // Update API key usage
        const apiKeyRef = db.ref(`apiKeys/${req.apiKey.id}`);
        await apiKeyRef.update({
            usage: (req.apiKey.usage || 0) + 1,
            lastUsed: new Date().toISOString()
        });

        res.json({
            embeddings: response.data,
            usage: {
                current: req.apiKey.usage + 1,
                limit: req.apiKey.limit,
                remaining: req.apiKey.limit === 'unlimited' ? 'unlimited' : req.apiKey.limit - (req.apiKey.usage + 1)
            },
            model: model,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Embeddings error:', error);
        res.status(500).json({ error: 'Failed to generate embeddings' });
    }
});

// Moderation endpoint
router.post('/moderate', aiLimiter, verifyApiKey, async (req, res) => {
    try {
        const { input } = req.body;
        
        if (!input || typeof input !== 'string') {
            return res.status(400).json({ error: 'Input is required' });
        }

        // Check content moderation
        const response = await openai.moderations.create({
            input: input
        });

        const moderation = response.results[0];

        res.json({
            flagged: moderation.flagged,
            categories: moderation.categories,
            category_scores: moderation.category_scores,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Moderation error:', error);
        res.status(500).json({ error: 'Failed to moderate content' });
    }
});

// Get available models
router.get('/models', verifyApiKey, async (req, res) => {
    try {
        const models = await openai.models.list();
        
        const availableModels = models.data
            .filter(model => model.id.includes('gpt') || model.id.includes('dall-e') || model.id.includes('text-embedding'))
            .map(model => ({
                id: model.id,
                object: model.object,
                created: model.created,
                owned_by: model.owned_by
            }));

        res.json({
            models: availableModels,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Get models error:', error);
        res.status(500).json({ error: 'Failed to retrieve models' });
    }
});

// Get API usage statistics
router.get('/usage', verifyApiKey, async (req, res) => {
    try {
        const apiKeyRef = db.ref(`apiKeys/${req.apiKey.id}`);
        const snapshot = await apiKeyRef.once('value');
        const keyData = snapshot.val();

        res.json({
            usage: {
                current: keyData.usage || 0,
                limit: keyData.limit,
                remaining: keyData.limit === 'unlimited' ? 'unlimited' : keyData.limit - (keyData.usage || 0)
            },
            keyInfo: {
                name: keyData.name,
                createdAt: keyData.createdAt,
                lastUsed: keyData.lastUsed,
                isActive: keyData.isActive
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Get usage error:', error);
        res.status(500).json({ error: 'Failed to retrieve usage statistics' });
    }
});

module.exports = router;