// api/generate-feedback.js
// AI 피드백 생성을 위한 GPT API 연동

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { action, employeeId, name, performanceData, groupData, startDate, endDate, email } = req.body;
        
        // OpenAI API 키 확인
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'OpenAI API key not configured' 
            });
        }
        
        switch (action) {
            case 'personal-suggestion':
                return await generatePersonalSuggestion(res, employeeId, name, performanceData, groupData);
                
            case 'period-analysis':
                return await generatePeriodAnalysis(res, employeeId, name, performanceData, groupData, startDate, endDate);
                
            case 'bulk-feedback':
                return await generateBulkFeedback(res, req.body.employeeList);
                
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid action' 
                });
        }
        
    } catch (error) {
        console.error('AI 피드백 생성 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

// 개인 맞춤 제안 생성
async function generatePersonalSuggestion(res, employeeId, name, performanceData, groupData) {
    try {
        const systemPrompt = `
당신은 채권 관리 업무의 전문가이며, 직원의 실적 데이터를 분석하여 개인 맞춤 개선 제안을 제공하는 AI 어시스턴트입니다.

직원의 실적 데이터를 분석하여 다음 사항을 포함한 개인 맞춤 제안을 작성해주세요:

1. 현재 강점 분석
2. 개선이 필요한 영역 식별
3. 구체적이고 실행 가능한 개선 방안
4. 예상 성과 향상 효과

제안은 격려하는 톤으로 작성하되, 구체적인 수치와 실행 방안을 포함해야 합니다.
200-300자 내외로 작성해주세요.
`;

        const userPrompt = `
직원 정보:
- 사번: ${employeeId}
- 이름: ${name}
- 소속 그룹: ${groupData?.name || '일반'}

실적 데이터:
- 통화량: ${performanceData?.call_count || 0}점
- DM 발송: ${performanceData?.dm_count || 0}점
- 초본 발급: ${performanceData?.document_count || 0}점
- 법적 조치: ${performanceData?.legal_count || 0}점
- 방문 횟수: ${performanceData?.visit_count || 0}점
- 접촉률: ${performanceData?.contact_rate || 0}%

그룹 특성: ${groupData?.description || '균형잡힌 업무 처리'}

위 데이터를 바탕으로 개인 맞춤 개선 제안을 작성해주세요.
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const suggestion = completion.choices[0].message.content;

        return res.status(200).json({
            success: true,
            suggestion: suggestion,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('개인 맞춤 제안 생성 실패:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// 기간별 분석 생성
async function generatePeriodAnalysis(res, employeeId, name, performanceData, groupData, startDate, endDate) {
    try {
        const systemPrompt = `
당신은 채권 관리 업무의 전문가이며, 직원의 특정 기간 실적을 분석하여 상세한 분석 결과를 제공하는 AI 어시스턴트입니다.

기간별 실적 분석에는 다음 내용이 포함되어야 합니다:

1. 기간 내 전반적 성과 평가
2. 각 업무 영역별 상세 분석
3. 동일 그룹 내 상대적 위치
4. 개선 권장사항
5. 다음 기간 목표 설정 제안

분석은 데이터 기반으로 객관적이고 건설적인 톤으로 작성해주세요.
400-500자 내외로 작성해주세요.
`;

        const startDateStr = startDate ? new Date(startDate).toLocaleDateString('ko-KR') : '미지정';
        const endDateStr = endDate ? new Date(endDate).toLocaleDateString('ko-KR') : '미지정';

        const userPrompt = `
직원 정보:
- 사번: ${employeeId}
- 이름: ${name}
- 소속 그룹: ${groupData?.name || '일반'}

분석 기간: ${startDateStr} ~ ${endDateStr}

현재 실적 데이터:
- 통화량: ${performanceData?.call_count || 0}점
- DM 발송: ${performanceData?.dm_count || 0}점
- 초본 발급: ${performanceData?.document_count || 0}점
- 법적 조치: ${performanceData?.legal_count || 0}점
- 방문 횟수: ${performanceData?.visit_count || 0}점
- 접촉률: ${performanceData?.contact_rate || 0}%

그룹 평균 점수: ${groupData?.avgScore || 75}점
그룹 특성: ${groupData?.description || '균형잡힌 업무 처리'}

위 데이터를 바탕으로 해당 기간의 상세한 성과 분석을 작성해주세요.
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.6,
            max_tokens: 800
        });

        const analysis = completion.choices[0].message.content;

        return res.status(200).json({
            success: true,
            analysis: analysis,
            period: {
                start: startDateStr,
                end: endDateStr
            },
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('기간별 분석 생성 실패:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// 일괄 피드백 생성 (관리자용)
async function generateBulkFeedback(res, employeeList) {
    try {
        const systemPrompt = `
당신은 채권 관리 업무의 전문가이며, 여러 직원의 실적 데이터를 분석하여 각각에게 맞춤형 피드백을 제공하는 AI 어시스턴트입니다.

각 직원에 대해 다음 내용을 포함한 간결한 피드백을 작성해주세요:

1. 현재 강점과 개선점
2. 구체적인 실행 방안 1-2가지
3. 격려 메시지

각 피드백은 150-200자 내외로 작성해주세요.
`;

        const feedbackResults = [];

        for (const employee of employeeList) {
            const userPrompt = `
직원: ${employee.name} (${employee.employeeId})
그룹: ${employee.group?.name || '일반'}
실적 점수: ${employee.totalScore || 0}점
순위: ${employee.rank || 0}위

실적 세부사항:
- 통화량: ${employee.scores?.call_count || 0}점
- DM 발송: ${employee.scores?.dm_count || 0}점
- 초본 발급: ${employee.scores?.document_count || 0}점
- 법적 조치: ${employee.scores?.legal_count || 0}점
- 방문 횟수: ${employee.scores?.visit_count || 0}점
- 접촉률: ${employee.scores?.contact_rate || 0}%

위 데이터를 바탕으로 개인 맞춤 피드백을 작성해주세요.
`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 400
            });

            const feedback = completion.choices[0].message.content;

            feedbackResults.push({
                employeeId: employee.employeeId,
                name: employee.name,
                feedback: feedback,
                generatedAt: new Date().toISOString()
            });

            // API 호출 간격 조절 (너무 빠른 연속 호출 방지)
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return res.status(200).json({
            success: true,
            feedbacks: feedbackResults,
            totalCount: feedbackResults.length,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('일괄 피드백 생성 실패:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// 실적 등급 계산 함수
function calculatePerformanceGrade(score) {
    if (score >= 90) return { grade: 'A', text: '우수' };
    if (score >= 80) return { grade: 'B', text: '양호' };
    if (score >= 70) return { grade: 'C', text: '보통' };
    if (score >= 60) return { grade: 'D', text: '개선필요' };
    return { grade: 'F', text: '미흡' };
}

// 그룹별 개선 제안 템플릿
const GROUP_SUGGESTIONS = {
    1: { // 균형추구형
        focus: '전 영역 균형 유지',
        tips: ['꾸준한 실적 관리', '안정적 성과 유지', '효율성 개선']
    },
    2: { // 통화집중형
        focus: '통화 업무 최적화',
        tips: ['통화 품질 향상', '응답률 개선', '효과적 커뮤니케이션']
    },
    3: { // 현장중심형
        focus: '현장 활동 강화',
        tips: ['방문 효율성 증대', '현장 대응력 향상', '실질적 해결책 제시']
    }
};
