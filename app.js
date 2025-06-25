// Firebase SDK 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// Firebase 구성
const firebaseConfig = {
    apiKey: "AIzaSyCl-5prm0fTyPYiIFD6QBMS82TBfqKL2Ng",
    authDomain: "ai-backend-33b58.firebaseapp.com",
    projectId: "ai-backend-33b58",
    storageBucket: "ai-backend-33b58.firebasestorage.app",
    messagingSenderId: "565756816587",
    appId: "1:565756816587:web:453333b334ee154b61bf4e"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// DOM 요소들
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const userWelcome = document.getElementById('userWelcome');
const loginFormElement = document.getElementById('loginFormElement');
const registerFormElement = document.getElementById('registerFormElement');
const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');

// 에러 메시지 처리 함수
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    successElement.textContent = message;
    successElement.style.display = 'block';
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 3000);
}

function handleAuthError(error) {
    switch (error.code) {
        case 'auth/user-not-found':
            return '등록되지 않은 이메일입니다.';
        case 'auth/wrong-password':
            return '비밀번호가 잘못되었습니다.';
        case 'auth/email-already-in-use':
            return '이미 사용 중인 이메일입니다.';
        case 'auth/weak-password':
            return '비밀번호는 6자 이상이어야 합니다.';
        case 'auth/invalid-email':
            return '유효하지 않은 이메일 형식입니다.';
        case 'auth/too-many-requests':
            return '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
        default:
            return '오류가 발생했습니다: ' + error.message;
    }
}

// 폼 전환 이벤트
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// 로그인 처리
loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');

    loginBtn.classList.add('loading');
    loginBtn.textContent = '';

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('로그인 성공:', userCredential.user);
    } catch (error) {
        console.error('로그인 실패:', error);
        showError('loginError', handleAuthError(error));
    } finally {
        loginBtn.classList.remove('loading');
        loginBtn.textContent = '로그인';
    }
});

// 회원가입 처리
registerFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const registerBtn = document.getElementById('registerBtn');

    // 비밀번호 확인
    if (password !== passwordConfirm) {
        showError('registerError', '비밀번호가 일치하지 않습니다.');
        return;
    }

    registerBtn.classList.add('loading');
    registerBtn.textContent = '';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // 사용자 프로필에 이름 설정
        await updateProfile(userCredential.user, {
            displayName: name
        });

        console.log('회원가입 성공:', userCredential.user);
        showSuccess('registerSuccess', '회원가입이 완료되었습니다!');
        
        // 2초 후 로그인 폼으로 전환
        setTimeout(() => {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        }, 2000);
        
    } catch (error) {
        console.error('회원가입 실패:', error);
        showError('registerError', handleAuthError(error));
    } finally {
        registerBtn.classList.remove('loading');
        registerBtn.textContent = '회원가입';
    }
});

// Google 로그인
googleLoginBtn.addEventListener('click', async () => {
    googleLoginBtn.classList.add('loading');
    googleLoginBtn.textContent = '';

    try {
        const result = await signInWithPopup(auth, provider);
        console.log('Google 로그인 성공:', result.user);
    } catch (error) {
        console.error('Google 로그인 실패:', error);
        showError('loginError', 'Google 로그인에 실패했습니다.');
    } finally {
        googleLoginBtn.classList.remove('loading');
        googleLoginBtn.textContent = 'Google로 로그인';
    }
});

// 로그아웃
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log('로그아웃 성공');
    } catch (error) {
        console.error('로그아웃 실패:', error);
    }
});

// 인증 상태 확인
onAuthStateChanged(auth, (user) => {
    if (user) {
        // 로그인됨
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        userWelcome.classList.remove('hidden');
        
        const userName = user.displayName || user.email.split('@')[0];
        document.getElementById('welcomeMessage').textContent = `${userName}님, 성공적으로 로그인되었습니다.`;
        
        console.log('사용자 로그인됨:', user);
    } else {
        // 로그아웃됨
        userWelcome.classList.add('hidden');
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        
        // 폼 초기화
        loginFormElement.reset();
        registerFormElement.reset();
        
        console.log('사용자 로그아웃됨');
    }
});