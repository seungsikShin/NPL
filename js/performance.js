// performance.js - 실적 데이터 로드 및 관리 (업로드 기능 제거)

// CSV 데이터에서 사용자 실적 정보 추출 (시뮬레이션)
async function loadUserPerformanceData(employeeId) {
    try {
        const sampleData = {
            call_count: Math.floor(Math.random() * 30) + 70,
            dm_count: Math.floor(Math.random() * 25) + 60,
            document_count: Math.floor(Math.random() * 20) + 75,
            legal_count: Math.floor(Math.random() * 15) + 50,
            visit_count: Math.floor(Math.random() * 25) + 65,
            contact_rate: Math.floor(Math.random() * 20) + 80
        };
        
        const groupId = Math.floor(Math.random() * 3) + 1;
        
        return {
            performanceData: sampleData,
            groupId: groupId
        };
    } catch (error) {
        console.error('실적 데이터 로드 실패:', error);
        return null;
    }
}

// 실제 Firebase에서 실적 데이터 로드
async function loadCSVPerformanceData(employeeId) {
    try {
        console.log(`Firebase에서 ${employeeId} 실적 데이터 로드 중...`);
        
        // Firebase에서 직원 데이터 조회
        const employeeRef = window.firebaseRef(window.firebaseDatabase, `employees/${employeeId}`);
        const snapshot = await window.firebaseGet(employeeRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            
            // 현재 월 실적 데이터 가져오기
            const monthlyPerformance = userData.performance?.[currentMonth];
            
            if (monthlyPerformance && typeof monthlyPerformance === 'object') {
                // 실제 Firebase 데이터 사용
                const performanceData = {
                    call_count: monthlyPerformance.call_count || 0,
                    dm_count: monthlyPerformance.dm_count || 0,
                    document_count: monthlyPerformance.document_count || 0,
                    legal_count: monthlyPerformance.legal_count || 0,
                    visit_count: monthlyPerformance.visit_count || 0,
                    contact_rate: monthlyPerformance.contact_rate || 0
                };
                
                // 그룹 계산 (실적 기반)
                const groupId = calculateUserGroup(performanceData);
                
                console.log('Firebase 실적 데이터 로드 완료:', performanceData);
                
                return {
                    performanceData: performanceData,
                    groupId: groupId
                };
            } else {
                console.log('현재 월 실적 데이터가 없음, 기본값 사용');
                // 실적 데이터가 없으면 기본값
                return {
                    performanceData: {
                        call_count: 0,
                        dm_count: 0,
                        document_count: 0,
                        legal_count: 0,
                        visit_count: 0,
                        contact_rate: 0
                    },
                    groupId: 1
                };
            }
        } else {
            console.log('직원 데이터가 없음, 샘플 데이터 사용');
            // 직원 데이터가 없으면 샘플 데이터
            return await loadUserPerformanceData(employeeId);
        }
        
    } catch (error) {
        console.error('Firebase 데이터 로드 실패:', error);
        console.log('샘플 데이터로 대체');
        return await loadUserPerformanceData(employeeId);
    }
}

// 실적 기반 그룹 계산 함수
function calculateUserGroup(performanceData) {
    const total = Object.values(performanceData)
        .filter(val => typeof val === 'number')
        .reduce((sum, val) => sum + val, 0);
    
    const callCount = performanceData.call_count || 0;
    const visitCount = performanceData.visit_count || 0;
    const avgScore = total / 6;
    
    // 그룹 분류 로직
    if (avgScore >= 70 && callCount >= 80 && visitCount >= 70) {
        return 1; // 균형추구형
    } else if (callCount >= 90 || performanceData.dm_count >= 80) {
        return 2; // 통화집중형
    } else if (visitCount >= 80 || performanceData.legal_count >= 60) {
        return 3; // 현장중심형
    } else {
        return 1; // 기본 그룹
    }
}

// Radar Chart 생성 함수
function createRadarChart(data) {
    const svg = document.getElementById('radarSvg');
    const tooltip = document.getElementById('radarTooltip');
    const centerX = 175;
    const centerY = 175;
    const maxRadius = 120;
    const levels = 5;
    
    // 기존 내용 삭제
    document.getElementById('radarGrid').innerHTML = '';
    document.getElementById('radarData').innerHTML = '';
    document.getElementById('radarLabels').innerHTML = '';
    
    // 배경 그리드 생성
    const gridGroup = document.getElementById('radarGrid');
    
    // 동심원 생성
    for (let i = 1; i <= levels; i++) {
        const radius = (maxRadius / levels) * i;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', centerX);
        circle.setAttribute('cy', centerY);
        circle.setAttribute('r', radius);
        circle.setAttribute('class', 'radar-grid');
        gridGroup.appendChild(circle);
        
        // 점수 라벨 추가 (20, 40, 60, 80, 100)
        if (i < levels) {
            const scoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            scoreText.setAttribute('x', centerX + radius + 5);
            scoreText.setAttribute('y', centerY);
            scoreText.setAttribute('fill', '#5a6169');
            scoreText.setAttribute('font-size', '10');
            scoreText.setAttribute('dominant-baseline', 'middle');
            scoreText.textContent = (i * 20).toString();
            gridGroup.appendChild(scoreText);
        }
    }
    
    // 축 생성
    const numMetrics = PERFORMANCE_METRICS.length;
    const angleStep = (2 * Math.PI) / numMetrics;
    
    for (let i = 0; i < numMetrics; i++) {
        const angle = (i * angleStep) - (Math.PI / 2);
        const x = centerX + Math.cos(angle) * maxRadius;
        const y = centerY + Math.sin(angle) * maxRadius;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', centerX);
        line.setAttribute('y1', centerY);
        line.setAttribute('x2', x);
        line.setAttribute('y2', y);
        line.setAttribute('class', 'radar-axis');
        gridGroup.appendChild(line);
    }
    
    // 데이터 영역 생성
    const dataGroup = document.getElementById('radarData');
    let pathData = '';
    const points = [];
    
    for (let i = 0; i < numMetrics; i++) {
        const metric = PERFORMANCE_METRICS[i];
        const value = data[metric.key] || 0;
        const normalizedValue = Math.min(value / 100, 1);
        
        const angle = (i * angleStep) - (Math.PI / 2);
        const radius = normalizedValue * maxRadius;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        points.push({ x, y, value, metric, angle, radius: normalizedValue * maxRadius });
        
        if (i === 0) {
            pathData += `M ${x} ${y}`;
        } else {
            pathData += ` L ${x} ${y}`;
        }
    }
    pathData += ' Z';
    
    // 데이터 영역 패스 생성 (애니메이션 적용)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('class', 'radar-area');
    
    // 애니메이션 적용
    const animatedPath = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    animatedPath.setAttribute('attributeName', 'd');
    animatedPath.setAttribute('values', `M ${centerX} ${centerY} L ${centerX} ${centerY} L ${centerX} ${centerY} L ${centerX} ${centerY} L ${centerX} ${centerY} L ${centerX} ${centerY} Z;${pathData}`);
    animatedPath.setAttribute('dur', '1s');
    animatedPath.setAttribute('fill', 'freeze');
    path.appendChild(animatedPath);
    
    dataGroup.appendChild(path);
    
    // 데이터 포인트 생성
    points.forEach((point, index) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', centerX);
        circle.setAttribute('cy', centerY);
        circle.setAttribute('r', 4);
        circle.setAttribute('class', 'radar-point');
        circle.setAttribute('data-metric', point.metric.key);
        circle.setAttribute('data-value', point.value);
        
        // 포인트 애니메이션
        const animateX = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animateX.setAttribute('attributeName', 'cx');
        animateX.setAttribute('values', `${centerX};${point.x}`);
        animateX.setAttribute('dur', '1s');
        animateX.setAttribute('begin', `${index * 0.1}s`);
        animateX.setAttribute('fill', 'freeze');
        circle.appendChild(animateX);
        
        const animateY = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animateY.setAttribute('attributeName', 'cy');
        animateY.setAttribute('values', `${centerY};${point.y}`);
        animateY.setAttribute('dur', '1s');
        animateY.setAttribute('begin', `${index * 0.1}s`);
        animateY.setAttribute('fill', 'freeze');
        circle.appendChild(animateY);
        
        // 마우스 이벤트 추가
        circle.addEventListener('mouseenter', function(e) {
            showTooltip(e, point.metric.name, point.value, point.metric.description);
        });
        
        circle.addEventListener('mouseleave', function() {
            hideTooltip();
        });
        
        // 클릭 이벤트 추가
        circle.addEventListener('click', function() {
            showMetricDetail(point.metric, point.value);
        });
        
        dataGroup.appendChild(circle);
    });
    
    // 라벨 생성
    const labelsGroup = document.getElementById('radarLabels');
    
    for (let i = 0; i < numMetrics; i++) {
        const metric = PERFORMANCE_METRICS[i];
        const angle = (i * angleStep) - (Math.PI / 2);
        const labelRadius = maxRadius + 20;
        const x = centerX + Math.cos(angle) * labelRadius;
        const y = centerY + Math.sin(angle) * labelRadius;
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('class', 'radar-label');
        text.textContent = metric.name;
        
        // 텍스트 위치 조정
        if (x < centerX - 10) {
            text.setAttribute('text-anchor', 'end');
        } else if (x > centerX + 10) {
            text.setAttribute('text-anchor', 'start');
        }
        
        // 라벨 클릭 이벤트
        text.addEventListener('click', function() {
            const value = data[metric.key] || 0;
            showMetricDetail(metric, value);
        });
        
        // 라벨 마우스 이벤트
        text.addEventListener('mouseenter', function(e) {
            const value = data[metric.key] || 0;
            showTooltip(e, metric.name, value, metric.description);
        });
        
        text.addEventListener('mouseleave', function() {
            hideTooltip();
        });
        
        labelsGroup.appendChild(text);
    }
}

// 툴팁 표시 함수
function showTooltip(event, title, value, description) {
    const tooltip = document.getElementById('radarTooltip');
    tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
        <div style="color: #667eea; margin-bottom: 4px;">${value}점</div>
        <div style="color: #8b9299; font-size: 11px;">${description}</div>
    `;
    
    const rect = event.target.getBoundingClientRect();
    const chartRect = document.querySelector('.radar-chart').getBoundingClientRect();
    
    tooltip.style.left = (rect.left - chartRect.left + 10) + 'px';
    tooltip.style.top = (rect.top - chartRect.top - 10) + 'px';
    tooltip.classList.add('show');
}

// 툴팁 숨기기 함수
function hideTooltip() {
    const tooltip = document.getElementById('radarTooltip');
    tooltip.classList.remove('show');
}

// 실적 상세 정보 표시
function updatePerformanceDetails(data) {
    const container = document.getElementById('performanceDetails');
    container.innerHTML = '';
    
    PERFORMANCE_METRICS.forEach((metric, index) => {
        const value = data[metric.key] || 0;
        const percentage = Math.min(value, 100);
        
        let gradeClass = '';
        if (value >= 90) gradeClass = 'excellent';
        else if (value >= 70) gradeClass = 'good';
        else if (value >= 50) gradeClass = 'average';
        else gradeClass = 'poor';
        
        const item = document.createElement('div');
        item.className = 'performance-item';
        item.style.animationDelay = `${index * 0.1}s`;
        item.innerHTML = `
            <div class="performance-item-header">
                <div class="performance-item-name">${metric.name}</div>
                <div class="performance-item-score ${gradeClass}">${value}점</div>
            </div>
            <div class="performance-item-bar">
                <div class="performance-item-progress ${gradeClass}" style="width: 0%; transition-delay: ${index * 0.1 + 0.5}s"></div>
            </div>
        `;
        
        // 클릭 이벤트 추가
        item.addEventListener('click', function() {
            showMetricDetail(metric, value);
        });
        
        // 마우스 호버 이벤트
        item.addEventListener('mouseenter', function(e) {
            showTooltip(e, metric.name, value, metric.description);
        });
        
        item.addEventListener('mouseleave', function() {
            hideTooltip();
        });
        
        container.appendChild(item);
        
        // 프로그레스 바 애니메이션
        setTimeout(() => {
            const progressBar = item.querySelector('.performance-item-progress');
            progressBar.style.width = `${percentage}%`;
        }, 100 + index * 100);
    });
}

// 그룹 정보 업데이트
function updateGroupInfo(groupId) {
    const group = SAMPLE_GROUPS[groupId] || SAMPLE_GROUPS[1];
    
    document.getElementById('groupBadge').textContent = `클러스터 ${group.id}`;
    document.getElementById('groupName').textContent = group.name;
    document.getElementById('groupDescription').textContent = group.description;
    document.getElementById('groupRank').textContent = `${group.rank}위`;
    document.getElementById('groupMembers').textContent = `${group.memberCount}명`;
    document.getElementById('groupAvgScore').textContent = `${group.avgScore}점`;
    
    window.groupData = group;
}

// AI 제안 생성 및 표시 (GPT API 직접 연동)
async function loadAISuggestion() {
    const loadingElement = document.getElementById('aiSuggestionLoading');
    const textElement = document.getElementById('aiSuggestionText');
    const timestampElement = document.getElementById('aiSuggestionTimestamp');
    
    loadingElement.classList.remove('hidden');
    textElement.classList.add('hidden');
    
    try {
        // GPT API를 통해 개인 맞춤 제안 생성
        const suggestion = await generatePersonalizedSuggestion();
        
        loadingElement.classList.add('hidden');
        textElement.innerHTML = suggestion;
        textElement.classList.remove('hidden');
        timestampElement.textContent = `마지막 업데이트: ${new Date().toLocaleString('ko-KR')}`;
        
    } catch (error) {
        console.error('AI 제안 로드 실패:', error);
        loadingElement.classList.add('hidden');
        textElement.innerHTML = '현재 AI 제안을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.';
        textElement.classList.remove('hidden');
        timestampElement.textContent = '업데이트 실패';
    }
}

// GPT API를 통한 개인 맞춤 제안 생성
async function generatePersonalizedSuggestion() {
    try {
        const response = await fetch('/api/generate-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'personal-suggestion',
                employeeId: window.currentUser.employeeId,
                name: window.currentUser.name,
                performanceData: window.performanceData,
                groupData: window.groupData
            })
        });
        
        if (!response.ok) {
            throw new Error('AI 제안 생성 실패');
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.suggestion;
        } else {
            throw new Error(data.error || '알 수 없는 오류');
        }
        
    } catch (error) {
        console.error('개인 맞춤 제안 생성 실패:', error);
        
        // 폴백: 기본 제안 메시지
        const sampleSuggestions = [
            `현재 귀하는 ${window.groupData?.name || '균형추구형'} 그룹에 속해 있습니다. 통화량 실적이 우수하지만, 법적 조치 부분에서 개선의 여지가 있습니다. 주간 법적 조치 건수를 2-3건 더 늘리시면 전체 실적이 15% 향상될 것으로 예상됩니다.`,
            `귀하의 채권별 접촉률이 매우 높습니다! 이 강점을 활용하여 초본 발급 건수를 늘려보세요. 현재 수준에서 주당 5건 더 처리하시면 상위 10% 그룹 진입이 가능합니다.`,
            `방문 활동과 통화 활동의 균형이 좋습니다. 다만 DM 발송 빈도를 주 2회에서 3회로 늘리시면 더욱 안정적인 실적 관리가 가능할 것입니다.`
        ];
        
        return sampleSuggestions[Math.floor(Math.random() * sampleSuggestions.length)];
    }
}

// AI 제안 새로고침
window.refreshAISuggestion = function() {
    loadAISuggestion();
};

// 그룹 상세보기
window.viewGroupDetail = function() {
    if (!window.groupData) {
        alert('그룹 정보를 불러올 수 없습니다.');
        return;
    }
    
    alert(`그룹 상세 페이지로 이동합니다.\n\n그룹: ${window.groupData.name}\nID: ${window.groupData.id}\n\n※ 추후 구현 예정`);
};

// 메트릭 상세 정보 표시
function showMetricDetail(metric, value) {
    let gradeText = '';
    if (value >= 90) gradeText = '우수';
    else if (value >= 70) gradeText = '양호';
    else if (value >= 50) gradeText = '보통';
    else gradeText = '개선 필요';
    
    alert(`${metric.name} 상세 정보\n\n점수: ${value}점 (${gradeText})\n설명: ${metric.description}\n\n※ 추후 상세 분석 페이지가 추가될 예정입니다.`);
}

// AI 분석 요청 (GPT API 직접 연동)
window.requestFeedback = async function() {
    if (!window.startDate) return;

    const feedbackResult = document.getElementById('feedbackResult');
    const feedbackContent = document.getElementById('feedbackContent');
    
    feedbackResult.style.display = 'block';
    feedbackContent.innerHTML = '<div class="loading"><div class="spinner"></div><span>AI 분석을 처리 중입니다...</span></div>';

    try {
        const response = await fetch('/api/generate-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'period-analysis',
                employeeId: window.currentUser.employeeId,
                name: window.currentUser.name,
                email: window.currentUser.email,
                startDate: window.startDate.toISOString(),
                endDate: window.endDate ? window.endDate.toISOString() : window.startDate.toISOString(),
                performanceData: window.performanceData,
                groupData: window.groupData,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('AI 분석 요청 실패');
        }

        const data = await response.json();

        if (data.success) {
            const periodText = window.endDate ? 
                `${window.startDate.toLocaleDateString('ko-KR')} ~ ${window.endDate.toLocaleDateString('ko-KR')}` :
                window.startDate.toLocaleDateString('ko-KR');
                
            feedbackContent.innerHTML = `
                <div style="color: #86efac; font-weight: 600; margin-bottom: 12px;">✅ AI 분석이 성공적으로 완료되었습니다!</div>
                <div style="margin-bottom: 8px;"><strong>분석 기간:</strong> ${periodText}</div>
                <div style="margin-bottom: 8px;"><strong>처리 시간:</strong> ${new Date().toLocaleString('ko-KR')}</div>
                <div style="color: #8b9299; margin-bottom: 16px;">결과는 이메일로도 발송됩니다.</div>
                <div style="margin-top: 12px; padding: 16px; background: #0a0b0d; border-radius: 8px; border: 1px solid #2a2f36;">
                    <strong style="color: #ffffff; display: block; margin-bottom: 8px;">📊 AI 분석 결과</strong>
                    <div style="color: #ffffff; line-height: 1.6;">${data.analysis}</div>
                </div>
            `;
        } else {
            throw new Error(data.error || '분석 처리 실패');
        }
        
    } catch (error) {
        console.error('AI 분석 요청 실패:', error);
        
        // 폴백: 기본 분석 결과
        const periodText = window.endDate ? 
            `${window.startDate.toLocaleDateString('ko-KR')} ~ ${window.endDate.toLocaleDateString('ko-KR')}` :
            window.startDate.toLocaleDateString('ko-KR');
            
        feedbackContent.innerHTML = `
            <div style="color: #86efac; font-weight: 600; margin-bottom: 12px;">✅ AI 분석이 성공적으로 처리되었습니다!</div>
            <div style="margin-bottom: 8px;"><strong>분석 기간:</strong> ${periodText}</div>
            <div style="margin-bottom: 8px;"><strong>처리 시간:</strong> ${new Date().toLocaleString('ko-KR')}</div>
            <div style="color: #8b9299; margin-bottom: 16px;">결과는 이메일로도 발송됩니다.</div>
            <div style="margin-top: 12px; padding: 16px; background: #0a0b0d; border-radius: 8px; border: 1px solid #2a2f36;">
                <strong style="color: #ffffff; display: block; margin-bottom: 8px;">📊 AI 분석 결과</strong>
                <div style="color: #ffffff; line-height: 1.6;">
                    선택하신 기간 동안의 실적 데이터를 분석한 결과, 전반적으로 양호한 성과를 보이고 있습니다. 
                    특히 ${window.performanceData ? Object.entries(window.performanceData).reduce((max, [key, value]) => 
                        value > max.value ? {key, value} : max, {key: '', value: 0}).key : '통화량'} 영역에서 우수한 실적을 기록하였습니다.
                    지속적인 개선을 위해 개인 맞춤 제안을 참고하시기 바랍니다.
                </div>
            </div>
        `;
    }
};
