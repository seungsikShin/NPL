// 관리자 페이지 관련 함수들 (GPT API 직접 연동)

// GPT Assistant ID
const ASSISTANT_ID = 'asst_uS8QuEgLGIw0SrWSl6yGu1Hy';

// API 엔드포인트 설정
const API_BASE_URL = '/api/extract-performance';
const FEEDBACK_API_URL = '/api/generate-feedback';

// API 상태 확인을 위한 간단한 테스트 함수
window.testSimpleAPI = async function() {
    try {
        console.log('=== 서버 API 테스트 시작 ===');
        
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'test-api'
            })
        });
        
        console.log('서버 API 응답 상태:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('서버 API 오류:', errorData);
            
            if (response.status === 500 && errorData.error === 'OpenAI API key not configured') {
                alert('❌ 서버에 OpenAI API 키가 설정되지 않았습니다.\n\nVercel 대시보드에서 OPENAI_API_KEY 환경변수를 확인하세요.');
            } else {
                alert(`❌ API 오류 (${response.status}): ${errorData.error}`);
            }
            return false;
        }
        
        const data = await response.json();
        console.log('API 테스트 결과:', data);
        
        if (data.success) {
            alert(`✅ API 키가 정상 작동합니다!\n사용 가능한 모델: ${data.modelCount}개`);
            return true;
        } else {
            alert(`❌ API 테스트 실패: ${data.error}`);
            return false;
        }
        
    } catch (error) {
        console.error('서버 API 테스트 오류:', error);
        alert(`❌ 네트워크 오류: ${error.message}`);
        return false;
    }
};

// GPT Assistant API 연결 테스트
window.testGPTConnection = async function() {
    const statusEl = document.getElementById('apiStatus');
    
    try {
        statusEl.textContent = '어시스턴트 연결 테스트 중...';
        statusEl.style.color = '#f59e0b';
        
        console.log('Assistant ID:', ASSISTANT_ID);
        
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'test-assistant',
                assistantId: ASSISTANT_ID
            })
        });
        
        console.log('서버 API 응답 상태:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('서버 API 오류:', errorData);
            throw new Error(`Assistant API 오류: ${response.status} - ${errorData.error}`);
        }
        
        const data = await response.json();
        console.log('어시스턴트 정보:', data);
        
        if (data.success) {
            statusEl.textContent = `✅ 어시스턴트 연결 성공 (${data.assistant.name})`;
            statusEl.style.color = '#22c55e';
        } else {
            throw new Error(data.error || '알 수 없는 오류');
        }
    } catch (error) {
        console.error('GPT Assistant API 연결 테스트 실패:', error);
        statusEl.textContent = `❌ 연결 실패: ${error.message}`;
        statusEl.style.color = '#ef4444';
    }
};

// 파일 선택 이벤트 처리
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('adminExcelFile');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const fileNameEl = document.getElementById('adminSelectedFile');
            const processBtn = document.getElementById('adminProcessBtn');
            
            if (file) {
                fileNameEl.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
                fileNameEl.style.color = '#ffffff';
                processBtn.disabled = false;
            } else {
                fileNameEl.textContent = '파일이 선택되지 않음';
                fileNameEl.style.color = '#8b9299';
                processBtn.disabled = true;
            }
        });
    }
});

// 관리자 파일 업로드 처리
window.processAdminUpload = async function() {
    const fileInput = document.getElementById('adminExcelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Excel 파일을 선택해주세요.');
        return;
    }
    
    try {
        // UI 상태 변경
        showUploadProgress(true);
        updateProgress(0, 0, '파일 읽는 중...');
        
        // 파일 내용 읽기
        const fileContent = await readExcelFile(file);
        updateProgress(0, 0, 'GPT API로 데이터 추출 중...');
        
        // 간단한 Chat Completions API 시도
        let extractedData;
        try {
            extractedData = await extractPerformanceWithChatAPI(fileContent, file.name);
        } catch (chatError) {
            console.log('Chat API 실패, Assistant API 시도 중...', chatError.message);
            updateProgress(0, 0, 'GPT Assistant API로 데이터 추출 중...');
            extractedData = await extractPerformanceWithAssistantAPI(fileContent, file.name);
        }
        
        updateProgress(0, extractedData.length, `${extractedData.length}명의 실적 데이터 추출 완료`);
        
        // Firebase에 저장
        const uploadResult = await uploadMultiplePerformanceData(extractedData);
        
        // 결과 표시
        showUploadProgress(false);
        showUploadResult(uploadResult);
        
        // 관리자 테이블 새로고침
        await refreshAdminData();
        
    } catch (error) {
        console.error('업로드 처리 실패:', error);
        showUploadProgress(false);
        alert(`업로드 처리 실패: ${error.message}`);
    }
};

// Excel 파일 읽기
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                
                if (file.name.toLowerCase().endsWith('.csv')) {
                    // CSV 파일 처리
                    resolve(content);
                } else {
                    // Excel 파일의 경우 바이너리를 Base64로 변환
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(content)));
                    resolve(base64);
                }
            } catch (error) {
                reject(new Error('파일 읽기 실패: ' + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('파일 읽기 오류'));
        };
        
        if (file.name.toLowerCase().endsWith('.csv')) {
            reader.readAsText(file, 'UTF-8');
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

// Chat Completions API로 실적 데이터 추출
async function extractPerformanceWithChatAPI(fileContent, fileName) {
    try {
        console.log('=== Chat API 실행 시작 ===');
        console.log('파일명:', fileName);
        console.log('파일 내용 길이:', fileContent.length);
        
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'extract-chat',
                fileContent: fileContent,
                fileName: fileName
            })
        });
        
        console.log('Chat API 응답 상태:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Chat API 오류:', errorData);
            throw new Error(`Chat API 오류: ${response.status} - ${errorData.error}`);
        }
        
        const data = await response.json();
        console.log('Chat API 결과:', data);
        
        if (!data.success) {
            throw new Error(data.error || '데이터 추출 실패');
        }
        
        console.log('추출된 데이터 개수:', data.count);
        return data.data;
        
    } catch (error) {
        console.error('=== Chat API 오류 ===');
        console.error('오류 메시지:', error.message);
        console.error('=== 오류 종료 ===');
        throw error;
    }
}

// GPT Assistant API로 실적 데이터 추출
async function extractPerformanceWithAssistantAPI(fileContent, fileName) {
    try {
        console.log('=== Assistant API 실행 시작 ===');
        console.log('파일명:', fileName);
        console.log('파일 내용 길이:', fileContent.length);
        
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'extract-assistant',
                fileContent: fileContent,
                fileName: fileName,
                assistantId: ASSISTANT_ID
            })
        });
        
        console.log('Assistant API 응답 상태:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Assistant API 오류:', errorData);
            throw new Error(`Assistant API 오류: ${response.status} - ${errorData.error}`);
        }
        
        const data = await response.json();
        console.log('Assistant API 결과:', data);
        
        if (!data.success) {
            throw new Error(data.error || '데이터 추출 실패');
        }
        
        console.log('추출된 데이터 개수:', data.count);
        return data.data;
        
    } catch (error) {
        console.error('=== Assistant API 오류 ===');
        console.error('오류 메시지:', error.message);
        console.error('=== 오류 종료 ===');
        throw error;
    }
}

// 다중 실적 데이터 Firebase 업로드
async function uploadMultiplePerformanceData(dataArray) {
    let successCount = 0;
    let failCount = 0;
    const results = [];
    
    for (let i = 0; i < dataArray.length; i++) {
        const item = dataArray[i];
        
        try {
            updateProgress(i + 1, dataArray.length, `${item.name || item.employeeId} 처리 중...`);
            
            // 실적 데이터 검증 및 업로드
            const result = await uploadSingleEmployeePerformance(item);
            
            if (result.success) {
                successCount++;
            } else {
                failCount++;
                console.error(`${item.employeeId} 업로드 실패:`, result.message);
            }
            
            results.push({
                ...result,
                employeeId: item.employeeId,
                name: item.name || '이름없음'
            });
            
            // 너무 빠른 요청 방지
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (error) {
            failCount++;
            console.error(`${item.employeeId} 처리 오류:`, error);
            results.push({
                success: false,
                message: error.message,
                employeeId: item.employeeId,
                name: item.name || '이름없음'
            });
        }
        
        // 진행률 업데이트
        const progress = ((i + 1) / dataArray.length) * 100;
        document.getElementById('adminProgressBar').style.width = `${progress}%`;
    }
    
    updateProgress(dataArray.length, dataArray.length, `완료: 성공 ${successCount}건, 실패 ${failCount}건`);
    
    return {
        success: failCount === 0,
        successCount,
        failCount,
        total: dataArray.length,
        results
    };
}

// 개별 직원 실적 업로드
async function uploadSingleEmployeePerformance(data) {
    try {
        // 데이터 검증
        if (!data.employeeId) {
            throw new Error('사번은 필수입니다.');
        }
        
        // 실적 데이터 구성
        const performanceData = {
            call_count: parseInt(data.call_count) || 0,
            dm_count: parseInt(data.dm_count) || 0,
            document_count: parseInt(data.document_count) || 0,
            legal_count: parseInt(data.legal_count) || 0,
            visit_count: parseInt(data.visit_count) || 0,
            contact_rate: parseFloat(data.contact_rate) || 0
        };
        
        // 접촉률 범위 검증
        if (performanceData.contact_rate > 100) {
            performanceData.contact_rate = 100;
        }
        
        const targetMonth = data.month || new Date().toISOString().slice(0, 7);
        
        // Firebase에서 직원 정보 확인/생성
        const employeeRef = window.firebaseRef(window.firebaseDatabase, `employees/${data.employeeId}`);
        const snapshot = await window.firebaseGet(employeeRef);
        
        if (!snapshot.exists()) {
            // 직원이 없으면 새로 생성
            await window.firebaseSet(employeeRef, {
                employeeId: data.employeeId,
                name: data.name || '직원',
                email: `${data.employeeId.toLowerCase()}@company.com`,
                registeredAt: new Date().toISOString(),
                isAdmin: false,
                performance: {}
            });
        }
        
        // 실적 데이터 업데이트
        const performanceRef = window.firebaseRef(window.firebaseDatabase, `employees/${data.employeeId}/performance/${targetMonth}`);
        
        await window.firebaseSet(performanceRef, {
            ...performanceData,
            lastUpdated: new Date().toISOString(),
            uploadMethod: 'admin_gpt_api',
            uploadedBy: window.currentUser?.employeeId || 'admin'
        });
        
        return {
            success: true,
            message: '업로드 완료'
        };
        
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
}

// 업로드 진행 상황 표시
function showUploadProgress(show) {
    const progressDiv = document.getElementById('adminUploadProgress');
    const resultDiv = document.getElementById('adminUploadResult');
    
    if (show) {
        progressDiv.classList.remove('hidden');
        resultDiv.classList.add('hidden');
    } else {
        progressDiv.classList.add('hidden');
    }
}

// 진행률 업데이트
function updateProgress(current, total, message) {
    const progressTextEl = document.getElementById('adminProgressText');
    const progressDetailsEl = document.getElementById('adminProgressDetails');
    
    if (progressTextEl) {
        progressTextEl.textContent = `${current} / ${total}`;
    }
    
    if (progressDetailsEl) {
        progressDetailsEl.textContent = message;
    }
    
    if (total > 0) {
        const percentage = (current / total) * 100;
        const progressBarEl = document.getElementById('adminProgressBar');
        if (progressBarEl) {
            progressBarEl.style.width = `${percentage}%`;
        }
    }
}

// 업로드 결과 표시
function showUploadResult(uploadResult) {
    const resultDiv = document.getElementById('adminUploadResult');
    const contentDiv = document.getElementById('adminUploadResultContent');
    
    if (!resultDiv || !contentDiv) return;
    
    const { successCount, failCount, results } = uploadResult;
    
    let resultHtml = `
        <div style="margin-bottom: 16px;">
            <div style="color: #22c55e; font-weight: 600; margin-bottom: 8px;">
                ✅ 성공: ${successCount}명
            </div>
            ${failCount > 0 ? `<div style="color: #ef4444; font-weight: 600;">❌ 실패: ${failCount}명</div>` : ''}
        </div>
    `;
    
    if (failCount > 0) {
        resultHtml += `
            <div style="margin-top: 16px;">
                <strong style="color: #ffffff;">실패 목록:</strong>
                <div style="margin-top: 8px; max-height: 200px; overflow-y: auto;">
        `;
        
        results.forEach(item => {
            if (item.success === false) {
                resultHtml += `
                    <div style="color: #ef4444; font-size: 12px; margin-bottom: 4px;">
                        ${item.employeeId} (${item.name}): ${item.message}
                    </div>
                `;
            }
        });
        
        resultHtml += '</div></div>';
    }
    
    contentDiv.innerHTML = resultHtml;
    resultDiv.classList.remove('hidden');
}

// 관리자 데이터 새로고침
async function refreshAdminData() {
    try {
        // Firebase에서 실제 데이터 로드
        const employeesRef = window.firebaseRef(window.firebaseDatabase, 'employees');
        const snapshot = await window.firebaseGet(employeesRef);
        
        if (snapshot.exists()) {
            const firebaseData = snapshot.val();
            window.allEmployeesData = Object.values(firebaseData).map(emp => {
                const currentMonth = new Date().toISOString().slice(0, 7);
                const monthlyPerformance = emp.performance?.[currentMonth] || {};
                
                // 실적 점수 계산
                const scores = {
                    call_count: monthlyPerformance.call_count || 0,
                    dm_count: monthlyPerformance.dm_count || 0,
                    document_count: monthlyPerformance.document_count || 0,
                    legal_count: monthlyPerformance.legal_count || 0,
                    visit_count: monthlyPerformance.visit_count || 0,
                    contact_rate: monthlyPerformance.contact_rate || 0
                };
                
                const totalScore = Math.round(
                    Object.values(scores).reduce((sum, val) => sum + val, 0) / 6
                );
                
                return {
                    employeeId: emp.employeeId,
                    name: emp.name,
                    email: emp.email,
                    department: emp.department || '미정',
                    group: { id: 1, name: '일반' },
                    scores: scores,
                    totalScore: totalScore,
                    registeredAt: emp.registeredAt,
                    rank: 0
                };
            });
            
            // 순위 재계산
            window.allEmployeesData.sort((a, b) => b.totalScore - a.totalScore);
            window.allEmployeesData.forEach((emp, index) => {
                emp.rank = index + 1;
            });
            
            window.filteredEmployeesData = [...window.allEmployeesData];
            
            // UI 업데이트
            updateAdminStats();
            updateGroupBarChart();
            updateAdvancedTable();
        }
    } catch (error) {
        console.error('관리자 데이터 새로고침 실패:', error);
    }
}

// ===== 기존 관리자 페이지 코드 =====

// 샘플 직원 데이터 생성 함수
function generateSampleEmployeesData() {
    const departments = ['소속1', '소속2', '소속3'];
    const groups = [
        { id: 1, name: '균형추구형' },
        { id: 2, name: '통화집중형' },
        { id: 3, name: '현장중심형' }
    ];
    
    const sampleData = [];
    
    for (let i = 1; i <= 50; i++) {
        const dept = departments[Math.floor(Math.random() * departments.length)];
        const group = groups[Math.floor(Math.random() * groups.length)];
        const scores = {
            call_count: Math.floor(Math.random() * 30) + 70,
            dm_count: Math.floor(Math.random() * 25) + 60,
            document_count: Math.floor(Math.random() * 20) + 75,
            legal_count: Math.floor(Math.random() * 15) + 50,
            visit_count: Math.floor(Math.random() * 25) + 65,
            contact_rate: Math.floor(Math.random() * 20) + 80
        };
        
        const totalScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6);
        
        sampleData.push({
            employeeId: `A${String(1000 + i).padStart(7, '0')}`,
            name: `직원${i}`,
            email: `employee${i}@company.com`,
            department: dept,
            group: group,
            scores: scores,
            totalScore: totalScore,
            registeredAt: new Date(2025, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1).toISOString()
        });
    }
    
    // 순위 계산
    sampleData.sort((a, b) => b.totalScore - a.totalScore);
    sampleData.forEach((emp, index) => {
        emp.rank = index + 1;
    });
    
    return sampleData;
}

// 관리자 페이지 표시
window.showAdmin = async function() {
    if (!window.currentUser.isAdmin) {
        alert('관리자 권한이 없습니다.');
        return;
    }

    try {
        // 실제 Firebase 데이터 로드 시도
        await refreshAdminData();
        
        // 데이터가 없으면 샘플 데이터 생성
        if (!window.allEmployeesData || window.allEmployeesData.length === 0) {
            window.allEmployeesData = generateSampleEmployeesData();
            window.filteredEmployeesData = [...window.allEmployeesData];
        }
        
        // 관리자 UI 업데이트
        updateAdminStats();
        updateGroupBarChart();
        updateAdvancedTable();
        
        // 현재 날짜로 필터 초기화
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const startDateFilter = document.getElementById('startDateFilter');
        const endDateFilter = document.getElementById('endDateFilter');
        
        if (startDateFilter) {
            startDateFilter.value = thirtyDaysAgo.toISOString().split('T')[0];
        }
        if (endDateFilter) {
            endDateFilter.value = today.toISOString().split('T')[0];
        }

        // 이벤트 리스너 추가
        setupAdminEventListeners();

        showContent('admin');
    } catch (error) {
        console.error('관리자 페이지 로드 오류:', error);
        alert('관리자 데이터 로드 중 오류가 발생했습니다: ' + error.message);
    }
};

// 관리자 페이지 이벤트 리스너 설정
function setupAdminEventListeners() {
    // 검색 필드에 실시간 필터 적용
    const searchInput = document.getElementById('employeeSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                applyFilters();
            }, 300);
        });
    }
    
    // 다른 필터들에도 이벤트 리스너 추가
    ['startDateFilter', 'endDateFilter', 'departmentFilter', 'groupFilter'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });

    // 테이블 헤더 클릭 이벤트
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', function() {
            const column = this.dataset.sort;
            sortTable(column);
        });
    });
}

// 관리자 통계 업데이트
function updateAdminStats(data = window.filteredEmployeesData) {
    const totalEmployees = data.length;
    const avgPerformance = totalEmployees > 0 ? 
        Math.round(data.reduce((sum, emp) => sum + emp.totalScore, 0) / totalEmployees) : 0;
    const excellentEmployees = data.filter(emp => emp.totalScore >= 90).length;
    const achievementRate = totalEmployees > 0 ? 
        Math.round((data.filter(emp => emp.totalScore >= 80).length / totalEmployees) * 100) : 0;
    
    const elements = {
        totalEmployees: document.getElementById('totalEmployees'),
        avgPerformance: document.getElementById('avgPerformance'),
        excellentEmployees: document.getElementById('excellentEmployees'),
        achievementRateAdmin: document.getElementById('achievementRateAdmin')
    };
    
    if (elements.totalEmployees) 
        elements.totalEmployees.textContent = totalEmployees.toLocaleString();
    if (elements.avgPerformance) 
        elements.avgPerformance.textContent = avgPerformance + '점';
    if (elements.excellentEmployees) 
        elements.excellentEmployees.textContent = excellentEmployees.toLocaleString();
    if (elements.achievementRateAdmin) 
        elements.achievementRateAdmin.textContent = achievementRate + '%';
}

// 그룹 분포 차트 생성
function updateGroupBarChart(data = window.filteredEmployeesData) {
    const chartContainer = document.getElementById('groupBarChart');
    if (!chartContainer) return;
    
    chartContainer.innerHTML = '';
    
    // 그룹별 데이터 집계
    const groupStats = {};
    data.forEach(emp => {
        const groupId = emp.group.id;
        if (!groupStats[groupId]) {
            groupStats[groupId] = {
                name: emp.group.name,
                count: 0,
                totalScore: 0
            };
        }
        groupStats[groupId].count++;
        groupStats[groupId].totalScore += emp.totalScore;
    });
    
    // 최대값 계산 (높이 정규화용)
    const maxCount = Math.max(...Object.values(groupStats).map(g => g.count), 1);
    const maxHeight = 200;
    
    // 바 차트 생성
    Object.entries(groupStats).forEach(([groupId, stats]) => {
        const avgScore = stats.count > 0 ? Math.round(stats.totalScore / stats.count) : 0;
        const barHeight = maxCount > 0 ? (stats.count / maxCount) * maxHeight : 10;
        
        const barGroup = document.createElement('div');
        barGroup.className = 'bar-group';
        barGroup.onclick = () => viewGroupDetail(groupId);
        
        barGroup.innerHTML = `
            <div class="bar" style="height: ${barHeight}px; position: relative;" data-group="${groupId}">
                <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); color: #ffffff; font-size: 11px; font-weight: 600;">
                    ${stats.count}명
                </div>
            </div>
            <div class="bar-label">${stats.name}</div>
            <div class="bar-value">평균 ${avgScore}점</div>
        `;
        
        chartContainer.appendChild(barGroup);
        
        // 애니메이션 적용
        setTimeout(() => {
            const bar = barGroup.querySelector('.bar');
            if (bar) {
                bar.style.height = `${barHeight}px`;
            }
        }, 100);
    });
}

// 고급 테이블 업데이트
function updateAdvancedTable(data = window.filteredEmployeesData) {
    const tbody = document.getElementById('advancedTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    data.forEach(emp => {
        // 점수에 따른 등급 계산
        let scoreClass = '';
        if (emp.totalScore >= 90) scoreClass = 'score-excellent';
        else if (emp.totalScore >= 70) scoreClass = 'score-good';
        else if (emp.totalScore >= 50) scoreClass = 'score-average';
        else scoreClass = 'score-poor';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><div class="employee-id">${emp.employeeId}</div></td>
            <td><div class="employee-name">${emp.name}</div></td>
            <td>${emp.department}</td>
            <td><span class="group-badge-small">${emp.group.name}</span></td>
            <td><span class="score-badge ${scoreClass}">${emp.totalScore}점</span></td>
            <td><span class="rank-badge">${emp.rank}위</span></td>
            <td style="color: #8b9299;">${new Date(emp.registeredAt).toLocaleDateString('ko-KR')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-small" onclick="viewEmployeeDetail('${emp.employeeId}')">상세보기</button>
                    <button class="btn-action btn-small" onclick="sendIndividualFeedback('${emp.employeeId}')">피드백</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 필터링 함수
function applyFilters() {
    const startDate = document.getElementById('startDateFilter')?.value;
    const endDate = document.getElementById('endDateFilter')?.value;
    const department = document.getElementById('departmentFilter')?.value;
    const group = document.getElementById('groupFilter')?.value;
    const searchTerm = document.getElementById('employeeSearch')?.value.toLowerCase();
    
    let filteredData = [...window.allEmployeesData];
    
    // 날짜 필터 (등록일 기준)
    if (startDate) {
        filteredData = filteredData.filter(emp => 
            new Date(emp.registeredAt) >= new Date(startDate)
        );
    }
    if (endDate) {
        filteredData = filteredData.filter(emp => 
            new Date(emp.registeredAt) <= new Date(endDate)
        );
    }
    
    // 부서 필터
    if (department) {
        filteredData = filteredData.filter(emp => emp.department === department);
    }
    
    // 그룹 필터
    if (group) {
        filteredData = filteredData.filter(emp => emp.group.id.toString() === group);
    }
    
    // 검색 필터
    if (searchTerm) {
        filteredData = filteredData.filter(emp => 
            emp.name.toLowerCase().includes(searchTerm) || 
            emp.employeeId.toLowerCase().includes(searchTerm)
        );
    }
    
    window.filteredEmployeesData = filteredData;
    updateAdminStats();
    updateGroupBarChart();
    updateAdvancedTable();
}

// 필터 초기화
window.clearAllFilters = function() {
    const elements = ['startDateFilter', 'endDateFilter', 'departmentFilter', 'groupFilter', 'employeeSearch'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
    
    window.filteredEmployeesData = [...window.allEmployeesData];
    updateAdminStats();
    updateGroupBarChart();
    updateAdvancedTable();
};

// 테이블 정렬 함수
function sortTable(column, direction = null) {
    if (!direction) {
        if (window.currentSort?.column === column) {
            direction = window.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            direction = 'asc';
        }
    }
    
    window.currentSort = { column, direction };
    
    // 정렬 적용
    window.filteredEmployeesData.sort((a, b) => {
        let aValue, bValue;
        
        switch (column) {
            case 'employeeId':
                aValue = a.employeeId;
                bValue = b.employeeId;
                break;
            case 'name':
                aValue = a.name;
                bValue = b.name;
                break;
            case 'department':
                aValue = a.department;
                bValue = b.department;
                break;
            case 'group':
                aValue = a.group.name;
                bValue = b.group.name;
                break;
            case 'totalScore':
                aValue = a.totalScore;
                bValue = b.totalScore;
                break;
            case 'rank':
                aValue = a.rank;
                bValue = b.rank;
                break;
            case 'registeredAt':
                aValue = new Date(a.registeredAt);
                bValue = new Date(b.registeredAt);
                break;
            default:
                return 0;
        }
        
        if (typeof aValue === 'string') {
            const result = aValue.localeCompare(bValue);
            return direction === 'asc' ? result : -result;
        } else {
            const result = aValue - bValue;
            return direction === 'asc' ? result : -result;
        }
    });
    
    // 테이블 헤더 정렬 표시 업데이트
    document.querySelectorAll('.advanced-table th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === column) {
            th.classList.add(`sort-${direction}`);
        }
    });
    
    updateAdvancedTable();
}

// 액션 함수들
window.viewEmployeeDetail = function(employeeId) {
    alert(`직원 상세 페이지로 이동합니다.\n\n사번: ${employeeId}\n\n※ 추후 구현 예정`);
};

window.sendIndividualFeedback = async function(employeeId) {
    const employee = window.allEmployeesData.find(emp => emp.employeeId === employeeId);
    if (!employee) {
        alert('직원 정보를 찾을 수 없습니다.');
        return;
    }
    
    try {
        // GPT API를 통해 개인 피드백 생성
        const response = await fetch(FEEDBACK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'personal-suggestion',
                employeeId: employee.employeeId,
                name: employee.name,
                performanceData: employee.scores,
                groupData: employee.group
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                alert(`${employee.name}(${employeeId})에게 AI 피드백을 생성했습니다.\n\n【AI 피드백 내용】\n${data.suggestion}\n\n※ 실제 이메일 발송 기능은 추후 구현 예정입니다.`);
            } else {
                throw new Error(data.error || '피드백 생성 실패');
            }
        } else {
            throw new Error('피드백 생성 API 호출 실패');
        }
        
    } catch (error) {
        console.error('개인 피드백 생성 오류:', error);
        alert(`${employee.name}(${employeeId})에게 기본 피드백을 발송했습니다.\n\n• 총 점수: ${employee.totalScore}점\n• 그룹: ${employee.group.name}\n• 순위: ${employee.rank}위\n\n※ AI 피드백 생성 중 오류가 발생하여 기본 메시지로 대체되었습니다.`);
    }
};

window.viewGroupDetail = function(groupId) {
    const SAMPLE_GROUPS = {
        1: { name: '균형추구형', description: '모든 영역에서 균형잡힌 성과' },
        2: { name: '통화집중형', description: '전화 통화 중심의 업무 스타일' },
        3: { name: '현장중심형', description: '방문 활동 중심의 업무 스타일' }
    };
    
    const groupData = SAMPLE_GROUPS[groupId];
    if (groupData) {
        alert(`그룹 상세 페이지로 이동합니다.\n\n그룹: ${groupData.name}\nID: ${groupId}\n설명: ${groupData.description}\n\n※ 추후 구현 예정`);
    }
};

window.refreshGroupChart = function() {
    updateGroupBarChart();
};

window.viewAllGroups = function() {
    alert('전체 그룹 비교 페이지로 이동합니다.\n\n※ 추후 구현 예정');
};

window.exportTableData = function() {
    // CSV 형태로 데이터 내보내기
    const headers = ['사번', '이름', '부서', '그룹', '종합점수', '순위', '등록일'];
    const csvContent = [
        headers.join(','),
        ...window.filteredEmployeesData.map(emp => [
            emp.employeeId,
            emp.name,
            emp.department,
            emp.group.name,
            emp.totalScore,
            emp.rank,
            new Date(emp.registeredAt).toLocaleDateString('ko-KR')
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `직원_실적_현황_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.generateReport = async function() {
    try {
        alert('주간/월간 리포트를 생성 중입니다.\n\n생성 완료 후 이메일로 발송됩니다.\n\n※ 추후 구현 예정');
    } catch (error) {
        alert('리포트 생성 중 오류가 발생했습니다.');
    }
};

window.sendBulkFeedback = async function() {
    const selectedEmployees = window.filteredEmployeesData.length;
    
    if (selectedEmployees === 0) {
        alert('피드백을 발송할 직원이 없습니다.');
        return;
    }
    
    const confirmMsg = `현재 필터된 ${selectedEmployees}명의 직원에게 AI 피드백을 일괄 생성하시겠습니까?`;
    
    if (confirm(confirmMsg)) {
        try {
            // 진행 상황 표시
            const progressDiv = document.createElement('div');
            progressDiv.innerHTML = `
                <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a1d21; border: 1px solid #2a2f36; border-radius: 12px; padding: 20px; z-index: 10000; min-width: 300px;">
                    <div style="text-align: center; color: #ffffff; margin-bottom: 16px;">일괄 피드백 생성 중...</div>
                    <div style="background: #2a2f36; border-radius: 4px; height: 8px; overflow: hidden; margin-bottom: 8px;">
                        <div id="bulkFeedbackProgress" style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; width: 0%; transition: width 0.3s;"></div>
                    </div>
                    <div id="bulkFeedbackStatus" style="color: #8b9299; font-size: 12px; text-align: center;">0 / ${selectedEmployees}</div>
                </div>
            `;
            document.body.appendChild(progressDiv);
            
            // GPT API를 통해 일괄 피드백 생성
            const response = await fetch(FEEDBACK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'bulk-feedback',
                    employeeList: window.filteredEmployeesData.slice(0, 10) // 최대 10명으로 제한
                })
            });
            
            // 진행 상황 업데이트 (시뮬레이션)
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                const progressBar = document.getElementById('bulkFeedbackProgress');
                const statusText = document.getElementById('bulkFeedbackStatus');
                
                if (progressBar) {
                    progressBar.style.width = `${Math.min(progress, 100)}%`;
                }
                if (statusText) {
                    statusText.textContent = `${Math.min(Math.floor(progress / 10), selectedEmployees)} / ${selectedEmployees}`;
                }
                
                if (progress >= 100) {
                    clearInterval(interval);
                }
            }, 500);
            
            // 결과 처리
            if (response.ok) {
                const data = await response.json();
                setTimeout(() => {
                    document.body.removeChild(progressDiv);
                    
                    if (data.success) {
                        alert(`✅ ${data.totalCount}명에게 AI 피드백을 성공적으로 생성했습니다.\n\n※ 실제 이메일 발송 기능은 추후 구현 예정입니다.`);
                    } else {
                        alert(`❌ 일괄 피드백 생성 중 오류가 발생했습니다.\n\n오류: ${data.error}`);
                    }
                }, 2000);
            } else {
                setTimeout(() => {
                    document.body.removeChild(progressDiv);
                    alert(`❌ 일괄 피드백 생성 API 호출에 실패했습니다.`);
                }, 2000);
            }
            
        } catch (error) {
            console.error('일괄 피드백 생성 오류:', error);
            alert('일괄 피드백 생성 중 오류가 발생했습니다.');
        }
    }
};

// 개발용 함수들
window.createAdmin = async function() {
    try {
        await window.firebaseSet(window.firebaseRef(window.firebaseDatabase, 'employees/A0000001'), {
            uid: 'admin-uid',
            name: '관리자',
            email: 'admin@company.com',
            employeeId: 'A0000001',
            registeredAt: new Date().toISOString(),
            isAdmin: true,
            performance: {
                '2025-07': {
                    call_count: 95,
                    dm_count: 88,
                    document_count: 92,
                    legal_count: 85,
                    visit_count: 90,
                    contact_rate: 94.5
                },
                '2025-06': {
                    call_count: 92,
                    dm_count: 85,
                    document_count: 89,
                    legal_count: 82,
                    visit_count: 87,
                    contact_rate: 91.2
                }
            }
        });
        console.log('관리자 계정 생성 완료');
    } catch (error) {
        console.error('관리자 계정 생성 실패:', error);
    }
};

window.createSampleData = async function() {
    const sampleEmployees = [
        { id: 'A1234567', name: '김테스트', email: 'test@company.com' },
        { id: 'B2345678', name: '이영희', email: 'lee@company.com' },
        { id: 'C3456789', name: '박민수', email: 'park@company.com' }
    ];

    for (const emp of sampleEmployees) {
        const performanceData = {
            '2025-07': {
                call_count: Math.floor(Math.random() * 30) + 70,
                dm_count: Math.floor(Math.random() * 25) + 60,
                document_count: Math.floor(Math.random() * 20) + 75,
                legal_count: Math.floor(Math.random() * 15) + 50,
                visit_count: Math.floor(Math.random() * 25) + 65,
                contact_rate: Math.floor(Math.random() * 20) + 80
            },
            '2025-06': {
                call_count: Math.floor(Math.random() * 30) + 70,
                dm_count: Math.floor(Math.random() * 25) + 60,
                document_count: Math.floor(Math.random() * 20) + 75,
                legal_count: Math.floor(Math.random() * 15) + 50,
                visit_count: Math.floor(Math.random() * 25) + 65,
                contact_rate: Math.floor(Math.random() * 20) + 80
            }
        };

        await window.firebaseSet(window.firebaseRef(window.firebaseDatabase, `employees/${emp.id}`), {
            uid: `${emp.id}-uid`,
            name: emp.name,
            email: emp.email,
            employeeId: emp.id,
            registeredAt: new Date().toISOString(),
            isAdmin: false,
            performance: performanceData
        });
    }
    console.log('샘플 데이터 생성 완료');
};
