// 관리자 페이지 관련 함수들

// ===== 관리자 실적 업로드 기능 =====

// OpenAI Assistant API 설정
const OPENAI_API_KEY = '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';
const ASSISTANT_ID = 'asst_uS8QuEgLGIw0SrWSl6yGu1Hy';

// API 상태 확인을 위한 간단한 테스트 함수
window.testSimpleAPI = async function() {
    try {
        console.log('=== 간단한 API 테스트 시작 ===');
        
        // 1. 기본 API 키 검증
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API 응답 상태:', response.status);
        
        if (response.status === 401) {
            alert('❌ API 키가 유효하지 않거나 만료되었습니다.\n\n해결방법:\n1. OpenAI 계정에 로그인\n2. 결제 방법 추가 (최소 $5)\n3. 새 API 키 생성');
            return false;
        }
        
        if (response.status === 429) {
            alert('❌ API 사용 한도를 초과했습니다.\n\n해결방법:\n1. OpenAI 대시보드에서 사용량 확인\n2. 결제 방법 추가 또는 크레딧 충전');
            return false;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 오류:', errorText);
            alert(`❌ API 오류 (${response.status}): ${errorText}`);
            return false;
        }
        
        const data = await response.json();
        console.log('사용 가능한 모델 수:', data.data?.length || 0);
        alert(`✅ API 키가 정상 작동합니다!\n사용 가능한 모델: ${data.data?.length || 0}개`);
        return true;
        
    } catch (error) {
        console.error('API 테스트 오류:', error);
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
        
        console.log('API Key 확인:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 10)}...` : '없음');
        console.log('Assistant ID:', ASSISTANT_ID);
        
        const response = await fetch(`https://api.openai.com/v1/assistants/${ASSISTANT_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'OpenAI-Beta': 'assistants=v2'
            }
        });
        
        console.log('API 응답 상태:', response.status);
        console.log('API 응답 헤더:', response.headers);
        
        if (response.ok) {
            const assistant = await response.json();
            console.log('어시스턴트 정보:', assistant);
            statusEl.textContent = `✅ 어시스턴트 연결 성공 (${assistant.name})`;
            statusEl.style.color = '#22c55e';
        } else {
            const errorText = await response.text();
            console.error('API 오류 응답:', errorText);
            throw new Error(`Assistant API 오류: ${response.status} - ${errorText}`);
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
            extractedData = await extractPerformanceWithAssistant(fileContent, file.name);
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

// Chat Completions API로 실적 데이터 추출 (더 간단하고 저렴)
async function extractPerformanceWithChatAPI(fileContent, fileName) {
    try {
        console.log('=== Chat Completions API 실행 시작 ===');
        console.log('파일명:', fileName);
        console.log('파일 내용 길이:', fileContent.length);
        
        // CSV 파일인지 확인
        const isCSV = fileName.toLowerCase().endsWith('.csv');
        let prompt;
        
        if (isCSV) {
            // CSV 파일 처리
            const lines = fileContent.split('\n').slice(0, 10); // 처음 10줄만 보내기
            prompt = `다음 CSV 파일에서 직원 실적 데이터를 추출해주세요:

${lines.join('\n')}

다음 JSON 배열 형식으로 응답해주세요:
[
  {
    "employeeId": "사번",
    "name": "이름", 
    "call_count": 통화량,
    "dm_count": DM발송,
    "document_count": 초본발급,
    "legal_count": 법적조치,
    "visit_count": 방문횟수,
    "contact_rate": 접촉률,
    "month": "YYYY-MM"
  }
]

주의사항:
- 숫자는 반드시 숫자 타입으로
- 접촉률은 백분율에서 소수점으로 변환 (예: 88.5% → 88.5)
- JSON 형식만 응답하고 다른 설명은 제외`;
        } else {
            // Excel 파일의 경우 Base64는 너무 크므로 에러 처리
            throw new Error('Excel 파일은 Chat API로 처리할 수 없습니다. Assistant API를 사용하세요.');
        }
        
        console.log('프롬프트 길이:', prompt.length);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo', // 더 저렴한 모델 사용
                messages: [
                    {
                        role: 'system',
                        content: '당신은 데이터 추출 전문가입니다. 주어진 데이터에서 정확한 JSON 형식으로 정보를 추출합니다.'
                    },
                    {
                        role: 'user', 
                        content: prompt
                    }
                ],
                temperature: 0,
                max_tokens: 2000
            })
        });
        
        console.log('Chat API 응답 상태:', response.status);
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Chat API 오류:', errorData);
            throw new Error(`Chat API 오류: ${response.status} - ${errorData}`);
        }
        
        const data = await response.json();
        console.log('Chat API 응답:', data);
        
        const responseText = data.choices[0].message.content;
        console.log('응답 텍스트:', responseText);
        
        // JSON 추출
        const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
        if (!jsonMatch) {
            console.error('JSON을 찾을 수 없는 응답:', responseText);
            throw new Error('응답에서 JSON 데이터를 찾을 수 없습니다.');
        }
        
        const extractedData = JSON.parse(jsonMatch[0]);
        console.log('추출된 데이터:', extractedData);
        
        if (!Array.isArray(extractedData)) {
            throw new Error('추출된 데이터가 배열 형식이 아닙니다.');
        }
        
        return extractedData;
        
    } catch (error) {
        console.error('=== Chat API 오류 ===');
        console.error('오류 메시지:', error.message);
        console.error('=== 오류 종료 ===');
        throw error;
    }
}

// GPT Assistant API로 실적 데이터 추출
async function extractPerformanceWithAssistant(fileContent, fileName) {
    try {
        console.log('=== GPT Assistant API 실행 시작 ===');
        console.log('파일명:', fileName);
        console.log('파일 내용 길이:', fileContent.length);
        
        // 1. Thread 생성
        console.log('1. Thread 생성 중...');
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({})
        });
        
        console.log('Thread 응답 상태:', threadResponse.status);
        
        if (!threadResponse.ok) {
            const errorText = await threadResponse.text();
            console.error('Thread 생성 오류:', errorText);
            throw new Error(`Thread 생성 실패: ${threadResponse.status} - ${errorText}`);
        }
        
        const thread = await threadResponse.json();
        console.log('Thread 생성 성공:', thread.id);
        
        // 2. 메시지 추가
        console.log('2. 메시지 추가 중...');
        const messageContent = fileName.toLowerCase().endsWith('.csv') 
            ? `다음은 직원 실적 데이터가 포함된 CSV 파일입니다:\n\n${fileContent}`
            : `다음은 직원 실적 데이터가 포함된 Excel 파일입니다 (Base64 인코딩):\n파일명: ${fileName}\n내용: ${fileContent.substring(0, 1000)}...`;
        
        console.log('메시지 내용 길이:', messageContent.length);
        
        const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
                role: 'user',
                content: messageContent
            })
        });
        
        console.log('메시지 응답 상태:', messageResponse.status);
        
        if (!messageResponse.ok) {
            const errorText = await messageResponse.text();
            console.error('메시지 추가 오류:', errorText);
            throw new Error(`메시지 추가 실패: ${messageResponse.status} - ${errorText}`);
        }
        
        console.log('메시지 추가 성공');
        
        // 3. Run 실행
        console.log('3. Run 실행 중...');
        const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
                assistant_id: ASSISTANT_ID
            })
        });
        
        console.log('Run 응답 상태:', runResponse.status);
        
        if (!runResponse.ok) {
            const errorText = await runResponse.text();
            console.error('Run 실행 오류:', errorText);
            throw new Error(`Run 실행 실패: ${runResponse.status} - ${errorText}`);
        }
        
        const run = await runResponse.json();
        console.log('Run 실행 성공:', run.id, '상태:', run.status);
        
        // 4. Run 완료 대기
        console.log('4. Run 완료 대기 중...');
        let runStatus = run;
        let attempts = 0;
        const maxAttempts = 60; // 최대 60초 대기로 증가
        
        while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
            if (attempts >= maxAttempts) {
                console.error('Run 시간 초과, 마지막 상태:', runStatus);
                throw new Error('Assistant 응답 시간 초과');
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            });
            
            if (!statusResponse.ok) {
                console.error('Run 상태 확인 오류:', statusResponse.status);
                throw new Error(`Run 상태 확인 실패: ${statusResponse.status}`);
            }
            
            runStatus = await statusResponse.json();
            attempts++;
            
            console.log(`Run 상태 확인 (${attempts}초):`, runStatus.status);
            updateProgress(0, 0, `Assistant 처리 중... (${attempts}초) - ${runStatus.status}`);
        }
        
        console.log('Run 최종 상태:', runStatus.status);
        
        if (runStatus.status !== 'completed') {
            console.error('Run 실행 실패, 상태:', runStatus);
            if (runStatus.last_error) {
                console.error('Run 오류 정보:', runStatus.last_error);
            }
            throw new Error(`Assistant 실행 실패: ${runStatus.status} ${runStatus.last_error ? '- ' + runStatus.last_error.message : ''}`);
        }
        
        // 5. 응답 메시지 가져오기
        console.log('5. 응답 메시지 가져오기...');
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'OpenAI-Beta': 'assistants=v2'
            }
        });
        
        if (!messagesResponse.ok) {
            const errorText = await messagesResponse.text();
            console.error('메시지 가져오기 오류:', errorText);
            throw new Error(`메시지 가져오기 실패: ${messagesResponse.status}`);
        }
        
        const messages = await messagesResponse.json();
        console.log('받은 메시지 수:', messages.data?.length || 0);
        
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (!assistantMessage) {
            console.error('전체 메시지:', messages.data);
            throw new Error('Assistant 응답을 찾을 수 없습니다.');
        }
        
        const responseText = assistantMessage.content[0].text.value;
        console.log('Assistant 응답 길이:', responseText.length);
        console.log('Assistant 응답 미리보기:', responseText.substring(0, 500) + '...');
        
        // 6. JSON 데이터 추출
        console.log('6. JSON 데이터 추출 중...');
        
        // JSON 배열 찾기 - 더 유연한 패턴 사용
        const jsonMatch = responseText.match(/\[[\s\S]*?\]/) || responseText.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
            console.error('JSON 패턴을 찾을 수 없는 응답:', responseText);
            throw new Error('Assistant 응답에서 JSON 데이터를 찾을 수 없습니다. 응답 내용을 확인해주세요.');
        }
        
        console.log('추출한 JSON 문자열:', jsonMatch[0]);
        
        let extractedData;
        try {
            extractedData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error('JSON 파싱 오류:', parseError);
            console.error('파싱하려던 문자열:', jsonMatch[0]);
            throw new Error(`JSON 파싱 실패: ${parseError.message}`);
        }
        
        // 배열이 아닌 경우 배열로 변환
        if (!Array.isArray(extractedData)) {
            if (typeof extractedData === 'object' && extractedData !== null) {
                extractedData = [extractedData];
            } else {
                throw new Error('추출된 데이터가 올바른 형식이 아닙니다.');
            }
        }
        
        console.log('추출된 데이터 개수:', extractedData.length);
        console.log('추출된 데이터 샘플:', extractedData[0]);
        return extractedData;
        
    } catch (error) {
        console.error('=== GPT Assistant API 오류 ===');
        console.error('오류 메시지:', error.message);
        console.error('오류 스택:', error.stack);
        console.error('=== 오류 종료 ===');
        throw new Error(`실적 데이터 추출 실패: ${error.message}`);
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
            uploadMethod: 'admin_assistant_api',
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
    document.getElementById('adminProgressText').textContent = `${current} / ${total}`;
    document.getElementById('adminProgressDetails').textContent = message;
    
    if (total > 0) {
        const percentage = (current / total) * 100;
        document.getElementById('adminProgressBar').style.width = `${percentage}%`;
    }
}

// 업로드 결과 표시
function showUploadResult(uploadResult) {
    const resultDiv = document.getElementById('adminUploadResult');
    const contentDiv = document.getElementById('adminUploadResultContent');
    
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

// ===== 기존 코드 =====

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
        // 샘플 데이터 생성
        window.allEmployeesData = generateSampleEmployeesData();
        window.filteredEmployeesData = [...window.allEmployeesData];
        
        // 관리자 UI 업데이트
        updateAdminStats();
        updateGroupBarChart();
        updateAdvancedTable();
        
        // 현재 날짜로 필터 초기화
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        document.getElementById('startDateFilter').value = thirtyDaysAgo.toISOString().split('T')[0];
        document.getElementById('endDateFilter').value = today.toISOString().split('T')[0];

        // 이벤트 리스너 추가
        setupAdminEventListeners();

        showContent('admin');
    } catch (error) {
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
    
    if (document.getElementById('totalEmployees')) 
        document.getElementById('totalEmployees').textContent = totalEmployees.toLocaleString();
    if (document.getElementById('avgPerformance')) 
        document.getElementById('avgPerformance').textContent = avgPerformance + '점';
    if (document.getElementById('excellentEmployees')) 
        document.getElementById('excellentEmployees').textContent = excellentEmployees.toLocaleString();
    if (document.getElementById('achievementRateAdmin')) 
        document.getElementById('achievementRateAdmin').textContent = achievementRate + '%';
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
            bar.style.height = `${barHeight}px`;
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
    const startDate = document.getElementById('startDateFilter').value;
    const endDate = document.getElementById('endDateFilter').value;
    const department = document.getElementById('departmentFilter').value;
    const group = document.getElementById('groupFilter').value;
    const searchTerm = document.getElementById('employeeSearch').value.toLowerCase();
    
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
    document.getElementById('startDateFilter').value = '';
    document.getElementById('endDateFilter').value = '';
    document.getElementById('departmentFilter').value = '';
    document.getElementById('groupFilter').value = '';
    document.getElementById('employeeSearch').value = '';
    
    window.filteredEmployeesData = [...window.allEmployeesData];
    updateAdminStats();
    updateGroupBarChart();
    updateAdvancedTable();
};

// 테이블 정렬 함수
function sortTable(column, direction = null) {
    if (!direction) {
        if (window.currentSort.column === column) {
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
    alert(`직원 상세 페이지로 이동합니다.\n\n사번: ${employeeId}\n\n※ 추후 Make.com 연동 시 실제 라우팅이 구현됩니다.`);
};

window.sendIndividualFeedback = async function(employeeId) {
    const employee = window.allEmployeesData.find(emp => emp.employeeId === employeeId);
    if (!employee) return;
    
    try {
        alert(`${employee.name}(${employeeId})에게 AI 피드백을 발송했습니다.\n\n• 총 점수: ${employee.totalScore}점\n• 그룹: ${employee.group.name}\n\n※ 실제 이메일 발송은 Make.com 연동 후 구현됩니다.`);
    } catch (error) {
        alert('피드백 발송 중 오류가 발생했습니다.');
    }
};

window.viewGroupDetail = function(groupId) {
    const groupData = SAMPLE_GROUPS[groupId];
    if (groupData) {
        alert(`그룹 상세 페이지로 이동합니다.\n\n그룹: ${groupData.name}\nID: ${groupId}\n\n※ 추후 Make.com 연동 시 실제 라우팅이 구현됩니다.`);
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
        alert('주간/월간 리포트를 생성 중입니다.\n\n생성 완료 후 이메일로 발송됩니다.\n\n※ Make.com 연동 후 실제 리포트 생성이 구현됩니다.');
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
    
    const confirmMsg = `현재 필터된 ${selectedEmployees}명의 직원에게 AI 피드백을 일괄 발송하시겠습니까?`;
    
    if (confirm(confirmMsg)) {
        try {
            alert(`${selectedEmployees}명에게 AI 피드백을 일괄 발송했습니다.\n\n※ 실제 이메일 발송은 Make.com 연동 후 구현됩니다.`);
        } catch (error) {
            alert('일괄 피드백 발송 중 오류가 발생했습니다.');
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
                '2025-06': 120000,
                '2025-05': 95000,
                '2025-04': 110000
            }
        });
        console.log('관리자 계정 생성 완료');
    } catch (error) {
        console.error('관리자 계정 생성 실패:', error);
    }
};

window.createSampleData = async function() {
    const sampleEmployees = [
        { id: 'A1234567', name: '김철수', email: 'kim@company.com' },
        { id: 'B2345678', name: '이영희', email: 'lee@company.com' },
        { id: 'C3456789', name: '박민수', email: 'park@company.com' }
    ];

    for (const emp of sampleEmployees) {
        await window.firebaseSet(window.firebaseRef(window.firebaseDatabase, `employees/${emp.id}`), {
            uid: `${emp.id}-uid`,
            name: emp.name,
            email: emp.email,
            employeeId: emp.id,
            registeredAt: new Date().toISOString(),
            isAdmin: false,
            performance: {
                '2025-06': Math.floor(Math.random() * 50000) + 50000,
                '2025-05': Math.floor(Math.random() * 50000) + 50000,
                '2025-04': Math.floor(Math.random() * 50000) + 50000
            }
        });
    }
    console.log('샘플 데이터 생성 완료');
};
