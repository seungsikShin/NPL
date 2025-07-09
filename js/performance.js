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
        
        item.addEventListener('mouseleave',
