// 전역 변수 및 상태 관리
window.currentUser = null;
window.currentMonth = new Date().getMonth();
window.currentYear = new Date().getFullYear();
window.startDate = null;
window.endDate = null;
window.logoutTimer = null;
window.logoutSeconds = 600; // 10분
window.warningShown = false;
window.performanceData = null;
window.groupData = null;
window.allEmployeesData = [];
window.filteredEmployeesData = [];
window.currentSort = { column: null, direction: 'asc' };

// 실적 항목 정의
const PERFORMANCE_METRICS = [
    { key: 'call_count', name: '통화량', description: '총 통화 시도 건수' },
    { key: 'dm_count', name: 'DM 발송', description: '등기/우편 발송 건수' },
    { key: 'document_count', name: '초본 발급', description: '신분증/주소 증빙 회수' },
    { key: 'legal_count', name: '법적 조치', description: '소송 등 강제집행 건수' },
    { key: 'visit_count', name: '방문 횟수', description: '현장 방문 진행 건수' },
    { key: 'contact_rate', name: '채권별 접촉률', description: '보유 채권별 응대율' }
];

// 샘플 그룹 데이터
const SAMPLE_GROUPS = {
    1: {
        id: 1,
        name: '균형추구형',
        description: '모든 업무 영역에서 균형잡힌 성과를 보이는 그룹입니다. 통화와 방문 활동을 적절히 조합하여 안정적인 실적을 유지하고 있습니다.',
        memberCount: 12,
        avgScore: 82,
        rank: 1,
        characteristics: ['안정적 실적', '균형잡힌 활동', '꾸준한 성과']
    },
    2: {
        id: 2,
        name: '통화집중형',
        description: '전화 통화를 주력으로 하는 그룹입니다. 높은 통화량을 바탕으로 효율적인 업무 처리가 특징입니다.',
        memberCount: 8,
        avgScore: 78,
        rank: 2,
        characteristics: ['높은 통화량', '효율적 처리', '빠른 응답']
    },
    3: {
        id: 3,
        name: '현장중심형',
        description: '방문 활동을 중심으로 하는 그룹입니다. 직접 만남을 통한 높은 성과율이 특징입니다.',
        memberCount: 15,
        avgScore: 85,
        rank: 3,
        characteristics: ['높은 방문률', '직접 상담', '성과 중심']
    }
};

// Firebase 인증 상태 체크
window.onAuthStateChanged(window.firebaseAuth, (user) => {
    if (user) {
        loadUserData(user.uid);
    } else {
        showAuthSection();
        if (window.logoutTimer) {
            clearInterval(window.logoutTimer);
            window.logoutTimer = null;
        }
    }
});

// 유틸리티 함수들
function validateEmployeeId(id) {
    const regex = /^[A-Z][0-9]{7}$/;
    return regex.test(id);
}

function showAlert(elementId, message) {
    clearAlerts();
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
}

function clearAlerts() {
    document.querySelectorAll('.alert').forEach(el => {
        el.style.display = 'none';
    });
}

function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 인증 관련 함수들
window.signup = async function() {
    const id = document.getElementById('signupId').value.trim();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

    if (!validateEmployeeId(id)) {
        showAlert('signupError', '사번은 대문자 1자와 숫자 7자로 구성되어야 합니다. (예: A1234567)');
        return;
    }

    if (!name || !email || !password) {
        showAlert('signupError', '모든 필드를 입력해주세요.');
        return;
    }

    if (password !== passwordConfirm) {
        showAlert('signupError', '비밀번호가 일치하지 않습니다.');
        return;
    }

    if (password.length < 6) {
        showAlert('signupError', '비밀번호는 최소 6자 이상이어야 합니다.');
        return;
    }

    try {
        const employeeRef = window.firebaseRef(window.firebaseDatabase, `employees/${id}`);
        const snapshot = await window.firebaseGet(employeeRef);
        if (snapshot.exists()) {
            showAlert('signupError', '이미 등록된 사번입니다.');
            return;
        }

        const userCredential = await window.createUserWithEmailAndPassword(window.firebaseAuth, email, password);
        const user = userCredential.user;

        await window.firebaseSet(window.firebaseRef(window.firebaseDatabase, `employees/${id}`), {
            uid: user.uid,
            name: name,
            email: email,
            employeeId: id,
            registeredAt: new Date().toISOString(),
            isAdmin: false,
            performance: {}
        });

        showAlert('signupSuccess', '회원가입이 완료되었습니다!');
        setTimeout(() => {
            showLogin();
        }, 2000);

    } catch (error) {
        showAlert('signupError', '회원가입 중 오류가 발생했습니다: ' + error.message);
    }
};

window.login = async function() {
    const id = document.getElementById('loginId').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!validateEmployeeId(id)) {
        showAlert('loginError', '올바른 사번 형식을 입력해주세요. (예: A1234567)');
        return;
    }

    if (!password) {
        showAlert('loginError', '비밀번호를 입력해주세요.');
        return;
    }

    try {
        const employeeRef = window.firebaseRef(window.firebaseDatabase, `employees/${id}`);
        const snapshot = await window.firebaseGet(employeeRef);
        
        if (!snapshot.exists()) {
            showAlert('loginError', '등록되지 않은 사번입니다.');
            return;
        }

        const userData = snapshot.val();
        await window.signInWithEmailAndPassword(window.firebaseAuth, userData.email, password);
        
    } catch (error) {
        showAlert('loginError', '로그인에 실패했습니다: ' + error.message);
    }
};

window.logout = async function() {
    try {
        if (window.logoutTimer) {
            clearInterval(window.logoutTimer);
            window.logoutTimer = null;
        }
        await window.signOut(window.firebaseAuth);
        window.currentUser = null;
        document.getElementById('logoutWarningModal').classList.remove('show');
        showAuthSection();
    } catch (error) {
        console.error('로그아웃 오류:', error);
    }
};

// 타이머 관련 함수들
function startLogoutTimer() {
    window.logoutSeconds = 600;
    window.warningShown = false;
    updateTimerDisplay();
    
    window.logoutTimer = setInterval(() => {
        window.logoutSeconds--;
        updateTimerDisplay();
        
        if (window.logoutSeconds === 30 && !window.warningShown) {
            showLogoutWarning();
        }
        
        if (window.logoutSeconds <= 0) {
            clearInterval(window.logoutTimer);
            logout();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(window.logoutSeconds / 60);
    const seconds = window.logoutSeconds % 60;
    const timerDisplay = document.getElementById('timerDisplay');
    const timerElement = document.getElementById('logoutTimer');
    
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (window.logoutSeconds <= 60) {
        timerElement.className = 'logout-timer danger';
    } else if (window.logoutSeconds <= 180) {
        timerElement.className = 'logout-timer warning';
    } else {
        timerElement.className = 'logout-timer';
    }
}

function showLogoutWarning() {
    window.warningShown = true;
    document.getElementById('logoutWarningModal').classList.add('show');
}

window.extendSession = function() {
    window.logoutSeconds = 600;
    window.warningShown = false;
    document.getElementById('logoutWarningModal').classList.remove('show');
    updateTimerDisplay();
};

function resetTimerOnActivity() {
    if (window.currentUser && window.logoutTimer) {
        window.logoutSeconds = 600;
        window.warningShown = false;
        document.getElementById('logoutWarningModal').classList.remove('show');
        updateTimerDisplay();
    }
}

// 활동 감지 이벤트 리스너
document.addEventListener('mousedown', resetTimerOnActivity);
document.addEventListener('keypress', resetTimerOnActivity);
document.addEventListener('scroll', resetTimerOnActivity);
document.addEventListener('touchstart', resetTimerOnActivity);

// 사용자 데이터 로드
async function loadUserData(uid) {
    try {
        const employeesRef = window.firebaseRef(window.firebaseDatabase, 'employees');
        const snapshot = await window.firebaseGet(employeesRef);
        
        if (snapshot.exists()) {
            const employees = snapshot.val();
            for (const [employeeId, data] of Object.entries(employees)) {
                if (data.uid === uid) {
                    window.currentUser = {
                        ...data,
                        employeeId: employeeId
                    };
                    break;
                }
            }
        }

        if (window.currentUser) {
            showDashboardSection();
            updateUserInterface();
            startLogoutTimer();
        } else {
            showAlert('loginError', '사용자 정보를 찾을 수 없습니다.');
            logout();
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
        logout();
    }
}

// UI 업데이트 함수들
async function updateUserInterface() {
    document.getElementById('userName').textContent = window.currentUser.name;
    document.getElementById('userAvatar').textContent = window.currentUser.employeeId.charAt(0);
    
    if (window.currentUser.isAdmin) {
        document.getElementById('adminNavItem').style.display = 'block';
        document.getElementById('userRole').textContent = '관리자';
    }

    const performanceResult = await loadCSVPerformanceData(window.currentUser.employeeId);
    if (performanceResult) {
        window.performanceData = performanceResult.performanceData;
        
        createRadarChart(window.performanceData);
        updatePerformanceDetails(window.performanceData);
        updateGroupInfo(performanceResult.groupId);
        await loadAISuggestion();
    }

    updateDashboardStats();
    updateCalendar();
    setActiveNav('performance');
}

function updateDashboardStats() {
    const performance = window.currentUser.performance || {};
    const currentMonthKey = `${window.currentYear}-${String(window.currentMonth + 1).padStart(2, '0')}`;
    const lastMonthKey = `${window.currentYear}-${String(window.currentMonth).padStart(2, '0') || '12'}`;
    
    const currentPerformance = performance[currentMonthKey] || 0;
    const lastPerformance = performance[lastMonthKey] || 0;
    
    document.getElementById('currentPerformance').textContent = currentPerformance.toLocaleString();
    
    if (lastPerformance > 0) {
        const changeRate = ((currentPerformance - lastPerformance) / lastPerformance * 100).toFixed(1);
        const changeElement = document.getElementById('performanceChange');
        changeElement.textContent = `${changeRate >= 0 ? '+' : ''}${changeRate}%`;
        changeElement.className = `stat-change ${changeRate >= 0 ? '' : 'negative'}`;
    }

    const recentMonths = [];
    for (let i = 0; i < 3; i++) {
        const monthDate = new Date(window.currentYear, window.currentMonth - i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        const monthPerformance = performance[monthKey] || 0;
        if (monthPerformance > 0) recentMonths.push(monthPerformance);
    }
    
    const avgPerformance = recentMonths.length > 0 
        ? Math.round(recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length)
        : 0;
    document.getElementById('averagePerformance').textContent = avgPerformance.toLocaleString();

    const target = 100000;
    const achievementRate = Math.round((currentPerformance / target) * 100);
    document.getElementById('achievementRate').textContent = achievementRate;
    
    const achievementElement = document.getElementById('achievementChange');
    if (achievementRate >= 100) {
        achievementElement.textContent = '목표 달성!';
        achievementElement.className = 'stat-change';
    } else {
        achievementElement.textContent = `목표까지 ${(target - currentPerformance).toLocaleString()}`;
        achievementElement.className = 'stat-change';
    }
}

// 달력 관련 함수들
window.updateCalendar = function() {
    const calendar = document.getElementById('calendar');
    const title = document.getElementById('calendarTitle');
    
    title.textContent = `${window.currentYear}년 ${window.currentMonth + 1}월`;
    
    calendar.innerHTML = '';
    
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    weekdays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day-header';
        dayElement.textContent = day;
        calendar.appendChild(dayElement);
    });

    const firstDay = new Date(window.currentYear, window.currentMonth, 1);
    const lastDay = new Date(window.currentYear, window.currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    for (let i = 0; i < 42; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = cellDate.getDate();
        
        if (cellDate.getMonth() !== window.currentMonth) {
            dayElement.classList.add('other-month');
        } else {
            dayElement.addEventListener('click', () => selectDate(cellDate, dayElement));
            
            if (window.startDate && isSameDate(cellDate, window.startDate)) {
                dayElement.classList.add('start-date');
            }
            if (window.endDate && isSameDate(cellDate, window.endDate)) {
                dayElement.classList.add('end-date');
            }
            if (window.startDate && window.endDate && 
                cellDate > window.startDate && cellDate < window.endDate) {
                dayElement.classList.add('in-range');
            }
        }
        
        calendar.appendChild(dayElement);
    }
};

window.selectDate = function(date, element) {
    if (!window.startDate || (window.startDate && window.endDate)) {
        window.startDate = new Date(date);
        window.endDate = null;
    } else if (window.startDate && !window.endDate) {
        if (date < window.startDate) {
            window.endDate = new Date(window.startDate);
            window.startDate = new Date(date);
        } else {
            window.endDate = new Date(date);
        }
    }
    
    updateDateDisplay();
    updateCalendar();
    
    document.getElementById('feedbackBtn').disabled = !window.startDate;
};

function updateDateDisplay() {
    const startDisplay = document.getElementById('startDateDisplay');
    const endDisplay = document.getElementById('endDateDisplay');
    
    if (window.startDate) {
        startDisplay.textContent = window.startDate.toLocaleDateString('ko-KR');
    } else {
        startDisplay.textContent = '선택하세요';
    }
    
    if (window.endDate) {
        endDisplay.textContent = window.endDate.toLocaleDateString('ko-KR');
    } else {
        endDisplay.textContent = window.startDate ? '선택하세요' : '선택하세요';
    }
}

window.clearDateSelection = function() {
    window.startDate = null;
    window.endDate = null;
    updateDateDisplay();
    updateCalendar();
    document.getElementById('feedbackBtn').disabled = true;
};

window.changeMonth = function(direction) {
    window.currentMonth += direction;
    if (window.currentMonth < 0) {
        window.currentMonth = 11;
        window.currentYear--;
    } else if (window.currentMonth > 11) {
        window.currentMonth = 0;
        window.currentYear++;
    }
    updateCalendar();
    updateDashboardStats();
};

// 네비게이션 및 페이지 전환
window.showLogin = function() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    clearAlerts();
};

window.showSignup = function() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
    clearAlerts();
};

window.showPerformance = function() {
    showContent('performance');
    setActiveNav('performance');
    document.getElementById('pageTitle').textContent = '실적 관리';
    document.getElementById('pageSubtitle').textContent = '실적 현황을 확인하고 AI 분석을 요청하세요';
};

function showAuthSection() {
    document.getElementById('auth-section').classList.add('active');
    document.getElementById('dashboard-section').classList.remove('active');
}

function showDashboardSection() {
    document.getElementById('auth-section').classList.remove('active');
    document.getElementById('dashboard-section').classList.add('active');
}

function showContent(contentType) {
    document.getElementById('performance-content').classList.toggle('hidden', contentType !== 'performance');
    document.getElementById('admin-content').classList.toggle('hidden', contentType !== 'admin');
    
    if (contentType === 'admin') {
        document.getElementById('pageTitle').textContent = '관리자 페이지';
        document.getElementById('pageSubtitle').textContent = '전체 직원의 실적 현황을 관리하세요';
        setActiveNav('admin');
    }
}

function setActiveNav(activeItem) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const navMap = {
        'performance': 0,
        'admin': 1
    };
    
    const links = document.querySelectorAll('.nav-link');
    if (links[navMap[activeItem]]) {
        links[navMap[activeItem]].classList.add('active');
    }
}
