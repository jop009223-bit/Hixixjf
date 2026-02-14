// ==================== تهيئة Firebase ====================
const firebaseConfig = {
    apiKey: "AIzaSyDmWuAizapwFYgsFA2zEfE0umuicOQRZaQ",
    authDomain: "key-management-system-cb2da.firebaseapp.com",
    projectId: "key-management-system-cb2da",
    storageBucket: "key-management-system-cb2da.firebasestorage.app",
    messagingSenderId: "157220260122",
    appId: "1:157220260122:web:449e1923bc38af78ba84a3",
    measurementId: "G-211VB2MNGZ"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// الحصول على مرجع Firestore
const db = firebase.firestore();

console.log('✅ Firebase initialized successfully!');