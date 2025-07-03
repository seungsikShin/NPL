// 관리자 페이지 관련 함수들

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
