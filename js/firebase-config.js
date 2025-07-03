// Firebase 초기화 및 설정
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getDatabase, ref, set, get, push, update } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCl-5prm0fTyPYiIFD6QBMS82TBfqKL2Ng",
    authDomain: "ai-backend-33b58.firebaseapp.com",
    databaseURL: "https://ai-backend-33b58-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "ai-backend-33b58",
    storageBucket: "ai-backend-33b58.firebasestorage.app",
    messagingSenderId: "565756816587",
    appId: "1:565756816587:web:453333b334ee154b61bf4e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Firebase 서비스들을 전역으로 노출
window.firebaseAuth = auth;
window.firebaseDatabase = database;
window.firebaseRef = ref;
window.firebaseSet = set;
window.firebaseGet = get;
window.firebasePush = push;
window.firebaseUpdate = update;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
