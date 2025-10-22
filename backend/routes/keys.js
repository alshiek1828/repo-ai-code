const express = require('express');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const db = admin.database();

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

// Generate new API key
router.post('/generate', verifyFirebaseToken, async (req, res) => {
    try {
        const { name, limit = 1000, description = '' } = req.body;
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
            description: description,
            userId: userId,
            limit: limit,
            usage: 0,
            createdAt: new Date().toISOString(),
            isActive: true,
            lastUsed: null
        });

        // Also save to user's API keys
        const userApiKeyRef = db.ref(`users/${userId}/apiKeys/${keyId}`);
        await userApiKeyRef.set({
            key: apiKey,
            name: name,
            description: description,
            limit: limit,
            usage: 0,
            createdAt: new Date().toISOString()
        });

        res.status(201).json({
            message: 'API key generated successfully',
            apiKey: {
                id: keyId,
                key: apiKey,
                name: name,
                description: description,
                limit: limit,
                usage: 0,
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('API key generation error:', error);
        res.status(500).json({ error: 'Failed to generate API key' });
    }
});

// Get user's API keys
router.get('/', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const userApiKeysRef = db.ref(`users/${userId}/apiKeys`);
        const snapshot = await userApiKeysRef.once('value');
        const apiKeys = snapshot.val() || {};

        const keysList = Object.entries(apiKeys).map(([id, key]) => ({
            id,
            ...key
        }));

        res.json({ 
            apiKeys: keysList,
            total: keysList.length
        });

    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({ error: 'Failed to retrieve API keys' });
    }
});

// Get specific API key details
router.get('/:keyId', verifyFirebaseToken, async (req, res) => {
    try {
        const { keyId } = req.params;
        const userId = req.user.uid;

        const userApiKeyRef = db.ref(`users/${userId}/apiKeys/${keyId}`);
        const snapshot = await userApiKeyRef.once('value');
        const keyData = snapshot.val();

        if (!keyData) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({
            apiKey: {
                id: keyId,
                ...keyData
            }
        });

    } catch (error) {
        console.error('Get API key error:', error);
        res.status(500).json({ error: 'Failed to retrieve API key' });
    }
});

// Update API key
router.put('/:keyId', verifyFirebaseToken, async (req, res) => {
    try {
        const { keyId } = req.params;
        const userId = req.user.uid;
        const { name, description, limit, isActive } = req.body;

        // Check if key belongs to user
        const userApiKeyRef = db.ref(`users/${userId}/apiKeys/${keyId}`);
        const snapshot = await userApiKeyRef.once('value');
        
        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'API key not found' });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (limit !== undefined) updates.limit = limit;
        if (isActive !== undefined) updates.isActive = isActive;

        // Update user's API key
        await userApiKeyRef.update(updates);

        // Update main API keys table
        const apiKeyRef = db.ref(`apiKeys/${keyId}`);
        await apiKeyRef.update(updates);

        res.json({
            message: 'API key updated successfully',
            apiKey: {
                id: keyId,
                ...updates
            }
        });

    } catch (error) {
        console.error('Update API key error:', error);
        res.status(500).json({ error: 'Failed to update API key' });
    }
});

// Delete API key
router.delete('/:keyId', verifyFirebaseToken, async (req, res) => {
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

        res.json({ 
            message: 'API key deleted successfully' 
        });

    } catch (error) {
        console.error('Delete API key error:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

// Regenerate API key
router.post('/:keyId/regenerate', verifyFirebaseToken, async (req, res) => {
    try {
        const { keyId } = req.params;
        const userId = req.user.uid;

        // Check if key belongs to user
        const userApiKeyRef = db.ref(`users/${userId}/apiKeys/${keyId}`);
        const snapshot = await userApiKeyRef.once('value');
        
        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'API key not found' });
        }

        const keyData = snapshot.val();

        // Generate new API key
        const newApiKey = `rel_${crypto.randomBytes(32).toString('hex')}`;

        // Update both locations
        await userApiKeyRef.update({
            key: newApiKey,
            regeneratedAt: new Date().toISOString()
        });

        await db.ref(`apiKeys/${keyId}`).update({
            key: newApiKey,
            regeneratedAt: new Date().toISOString()
        });

        res.json({
            message: 'API key regenerated successfully',
            apiKey: {
                id: keyId,
                key: newApiKey,
                name: keyData.name,
                description: keyData.description,
                limit: keyData.limit,
                usage: keyData.usage,
                createdAt: keyData.createdAt,
                regeneratedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Regenerate API key error:', error);
        res.status(500).json({ error: 'Failed to regenerate API key' });
    }
});

// Reset API key usage
router.post('/:keyId/reset-usage', verifyFirebaseToken, async (req, res) => {
    try {
        const { keyId } = req.params;
        const userId = req.user.uid;

        // Check if key belongs to user
        const userApiKeyRef = db.ref(`users/${userId}/apiKeys/${keyId}`);
        const snapshot = await userApiKeyRef.once('value');
        
        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'API key not found' });
        }

        // Reset usage to 0
        await userApiKeyRef.update({
            usage: 0,
            resetAt: new Date().toISOString()
        });

        await db.ref(`apiKeys/${keyId}`).update({
            usage: 0,
            resetAt: new Date().toISOString()
        });

        res.json({
            message: 'API key usage reset successfully',
            usage: 0
        });

    } catch (error) {
        console.error('Reset usage error:', error);
        res.status(500).json({ error: 'Failed to reset API key usage' });
    }
});

// Get API key usage statistics
router.get('/:keyId/usage', verifyFirebaseToken, async (req, res) => {
    try {
        const { keyId } = req.params;
        const userId = req.user.uid;
        const { period = '30d' } = req.query;

        // Check if key belongs to user
        const userApiKeyRef = db.ref(`users/${userId}/apiKeys/${keyId}`);
        const snapshot = await userApiKeyRef.once('value');
        
        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'API key not found' });
        }

        const keyData = snapshot.val();

        // Calculate period in days
        const periodDays = parseInt(period.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Get usage logs (if implemented)
        // For now, return basic usage info
        res.json({
            usage: {
                current: keyData.usage || 0,
                limit: keyData.limit,
                remaining: keyData.limit === 'unlimited' ? 'unlimited' : keyData.limit - (keyData.usage || 0),
                percentage: keyData.limit === 'unlimited' ? 0 : Math.round(((keyData.usage || 0) / keyData.limit) * 100)
            },
            period: period,
            keyInfo: {
                name: keyData.name,
                createdAt: keyData.createdAt,
                lastUsed: keyData.lastUsed
            }
        });

    } catch (error) {
        console.error('Get usage statistics error:', error);
        res.status(500).json({ error: 'Failed to retrieve usage statistics' });
    }
});

// Bulk operations
router.post('/bulk/delete', verifyFirebaseToken, async (req, res) => {
    try {
        const { keyIds } = req.body;
        const userId = req.user.uid;

        if (!Array.isArray(keyIds) || keyIds.length === 0) {
            return res.status(400).json({ error: 'Key IDs array is required' });
        }

        const results = [];

        for (const keyId of keyIds) {
            try {
                // Check if key belongs to user
                const userApiKeyRef = db.ref(`users/${userId}/apiKeys/${keyId}`);
                const snapshot = await userApiKeyRef.once('value');
                
                if (snapshot.exists()) {
                    // Delete from both locations
                    await userApiKeyRef.remove();
                    await db.ref(`apiKeys/${keyId}`).remove();
                    results.push({ keyId, status: 'deleted' });
                } else {
                    results.push({ keyId, status: 'not_found' });
                }
            } catch (error) {
                results.push({ keyId, status: 'error', error: error.message });
            }
        }

        res.json({
            message: 'Bulk delete operation completed',
            results: results,
            total: keyIds.length,
            deleted: results.filter(r => r.status === 'deleted').length
        });

    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Failed to perform bulk delete' });
    }
});

// Export API keys
router.get('/export/json', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const userApiKeysRef = db.ref(`users/${userId}/apiKeys`);
        const snapshot = await userApiKeysRef.once('value');
        const apiKeys = snapshot.val() || {};

        const keysList = Object.entries(apiKeys).map(([id, key]) => ({
            id,
            ...key
        }));

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="api-keys.json"');
        res.json({ apiKeys: keysList });

    } catch (error) {
        console.error('Export API keys error:', error);
        res.status(500).json({ error: 'Failed to export API keys' });
    }
});

module.exports = router;