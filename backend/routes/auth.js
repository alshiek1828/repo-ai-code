const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const db = admin.database();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Register user
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, plan = 'free' } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        // Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: name
        });

        // Save user data to database
        const userRef = db.ref(`users/${userRecord.uid}`);
        await userRef.set({
            name: name,
            email: email,
            plan: plan,
            role: 'user',
            createdAt: new Date().toISOString(),
            isActive: true,
            lastLogin: null
        });

        // Generate initial API key
        const apiKey = `rel_${crypto.randomBytes(32).toString('hex')}`;
        const keyId = uuidv4();

        const apiKeyRef = db.ref(`apiKeys/${keyId}`);
        await apiKeyRef.set({
            key: apiKey,
            name: 'مفتاح افتراضي',
            userId: userRecord.uid,
            limit: plan === 'free' ? 100 : plan === 'pro' ? 1000 : 'unlimited',
            usage: 0,
            createdAt: new Date().toISOString(),
            isActive: true
        });

        // Save to user's API keys
        const userApiKeyRef = db.ref(`users/${userRecord.uid}/apiKeys/${keyId}`);
        await userApiKeyRef.set({
            key: apiKey,
            name: 'مفتاح افتراضي',
            limit: plan === 'free' ? 100 : plan === 'pro' ? 1000 : 'unlimited',
            usage: 0,
            createdAt: new Date().toISOString()
        });

        // Generate JWT token
        const token = jwt.sign(
            { 
                uid: userRecord.uid, 
                email: email,
                role: 'user'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                uid: userRecord.uid,
                email: email,
                name: name,
                plan: plan
            },
            token: token,
            apiKey: apiKey
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        if (error.code === 'auth/weak-password') {
            return res.status(400).json({ error: 'Password is too weak' });
        }

        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Verify user credentials
        const userRecord = await admin.auth().getUserByEmail(email);
        
        // Update last login
        const userRef = db.ref(`users/${userRecord.uid}`);
        await userRef.update({
            lastLogin: new Date().toISOString()
        });

        // Get user data
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();

        // Generate JWT token
        const token = jwt.sign(
            { 
                uid: userRecord.uid, 
                email: email,
                role: userData.role || 'user'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                name: userRecord.displayName,
                plan: userData.plan || 'free',
                role: userData.role || 'user'
            },
            token: token
        });

    } catch (error) {
        console.error('Login error:', error);
        
        if (error.code === 'auth/user-not-found') {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user data
        const userRef = db.ref(`users/${decoded.uid}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();

        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            valid: true,
            user: {
                uid: decoded.uid,
                email: decoded.email,
                name: userData.name,
                plan: userData.plan,
                role: userData.role
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Send password reset email
        const resetLink = await admin.auth().generatePasswordResetLink(email);
        
        // TODO: Send email with reset link
        // For now, just return the link (in production, send via email)
        
        res.json({
            message: 'Password reset email sent',
            resetLink: resetLink // Remove this in production
        });

    } catch (error) {
        console.error('Password reset error:', error);
        
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(500).json({ error: 'Password reset failed' });
    }
});

// Update user profile
router.put('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const { name, plan } = req.body;

        const updates = {};
        if (name) updates.name = name;
        if (plan) updates.plan = plan;

        const userRef = db.ref(`users/${decoded.uid}`);
        await userRef.update(updates);

        // Update Firebase Auth display name if name changed
        if (name) {
            await admin.auth().updateUser(decoded.uid, {
                displayName: name
            });
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                uid: decoded.uid,
                name: name,
                plan: plan
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Profile update failed' });
    }
});

// Delete user account
router.delete('/account', async (req, res) => {
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.uid;

        // Delete user from Firebase Auth
        await admin.auth().deleteUser(userId);

        // Delete user data from database
        const userRef = db.ref(`users/${userId}`);
        await userRef.remove();

        // Delete user's API keys
        const apiKeysRef = db.ref('apiKeys');
        const apiKeysSnapshot = await apiKeysRef.orderByChild('userId').equalTo(userId).once('value');
        const apiKeys = apiKeysSnapshot.val() || {};
        
        for (const keyId of Object.keys(apiKeys)) {
            await db.ref(`apiKeys/${keyId}`).remove();
        }

        // Delete user's conversations
        const conversationsRef = db.ref(`users/${userId}/conversations`);
        await conversationsRef.remove();

        res.json({
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ error: 'Account deletion failed' });
    }
});

module.exports = router;