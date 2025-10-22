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
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
            console.log('Service Worker registered successfully');
        })
        .catch((error) => {
            console.log('Service Worker registration failed');
        });
}

// Request notification permission
export const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        const token = await getToken(messaging, {
            vapidKey: 'YOUR_VAPID_KEY_HERE'
        });
        return token;
    }
    return null;
};

// Listen for background messages
onMessage(messaging, (payload) => {
    console.log('Message received:', payload);
    // Handle background message
});

export default app;