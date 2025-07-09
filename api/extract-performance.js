// api/extract-performance.js
// 오류 수정 버전

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // GET 요청 처리 (테스트용)
    if (req.method === 'GET') {
        return res.status(200).json({
            success: true,
            message: 'API 엔드포인트가 정상 작동합니다',
            timestamp: new Date().toISOString()
        });
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST method.' 
        });
    }
    
    try {
        const { action } = req.body;
        
        // OpenAI API 키 확인
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'OpenAI API key not configured in environment variables' 
            });
        }
        
        // OpenAI 라이브러리 동적 임포트
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        switch (action) {
            case 'test-api':
                return await testOpenAIAPI(res, openai);
                
            case 'test-assistant':
                return await testAssistantAPI(res, openai, req.body.assistantId);
                
            case 'extract-chat':
                return await extractWithChatAPI(res, openai, req.body.fileContent, req.body.fileName);
                
            case 'extract-assistant':
                return await extractWithAssistantAPI(res, openai, req.body.fileContent, req.body.fileName, req.body.assistantId);
                
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: `Invalid action: ${action}` 
                });
        }
        
    } catch (error) {
        console.error('API 처리 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error'
        });
    }
}

// OpenAI API 테스트
async function testOpenAIAPI(res, openai) {
    try {
        const models = await openai.models.list();
        const modelCount = models.data.length;
        
        return res.status(200).json({
            success: true,
            message: 'OpenAI API 연결 성공',
            modelCount: modelCount
        });
        
    } catch (error) {
        console.error('OpenAI API 테스트 실패:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Assistant API 테스트
async function testAssistantAPI(res, openai, assistantId) {
    try {
        const ASSISTANT_ID = assistantId || 'asst_uS8QuEgLGIw0SrWSl6yGu1Hy';
        const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
        
        return res.status(200).json({
            success: true,
            message: 'Assistant 연결 성공',
            assistant: {
                id: assistant.id,
                name: assistant.name,
                description: assistant.description
            }
        });
        
    } catch (error) {
        console.error('Assistant API 테스트 실패:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Chat Completions API로 데이터 추출
async function extractWithChatAPI(res, openai, fileContent, fileName) {
    try {
        const systemPrompt = `
당신은 Excel/CSV 파일에서 직원 실적 데이터를 추출하는 전문가입니다.

파일에서 다음 정보를 찾아서 JSON 배열로 반환해주세요:
- employeeId (사번): 대문자 1자 + 숫자 7자 형태
- name (이름): 직원 이름
- call_count (통화량): 숫자
- dm_count (DM발송): 숫자  
- document_count (초본발급): 숫자
- legal_count (법적조치): 숫자
- visit_count (방문횟수): 숫자
- contact_rate (접촉률): 퍼센트 값 (0-100)
- month (월): YYYY-MM 형태 (없으면 현재 월)

응답은 반드시 다음 형식의 JSON만 반환하세요:
[
  {
    "employeeId": "A1234567",
    "name": "홍길동",
    "call_count": 85,
    "dm_count": 72,
    "document_count": 90,
    "legal_count": 15,
    "visit_count": 25,
    "contact_rate": 88.5,
    "month": "2025-01"
  }
]

데이터를 찾을 수 없으면 빈 배열 []을 반환하세요.
`;

        const userPrompt = `파일명: ${fileName}\n\n파일 내용:\n${fileContent.substring(0, 5000)}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.1,
            max_tokens: 4000
        });

        const responseText = completion.choices[0].message.content;
        
        // JSON 파싱 시도
        try {
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                
                return res.status(200).json({
                    success: true,
                    data: data,
                    count: data.length,
                    method: 'chat'
                });
            }
            
            throw new Error('JSON 배열을 찾을 수 없습니다');
            
        } catch (parseError) {
            console.error('JSON 파싱 실패:', parseError);
            console.error('GPT 응답:', responseText);
            
            return res.status(500).json({
                success: false,
                error: 'GPT 응답을 파싱할 수 없습니다: ' + parseError.message,
                rawResponse: responseText.substring(0, 500)
            });
        }
        
    } catch (error) {
        console.error('Chat API 데이터 추출 실패:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Assistant API로 데이터 추출
async function extractWithAssistantAPI(res, openai, fileContent, fileName, assistantId) {
    try {
        const ASSISTANT_ID = assistantId || 'asst_uS8QuEgLGIw0SrWSl6yGu1Hy';
        
        // 스레드 생성
        const thread = await openai.beta.threads.create();
        
        // 메시지 추가
        const prompt = `
다음 Excel/CSV 파일에서 직원 실적 데이터를 추출해주세요.

파일명: ${fileName}
파일 내용:
${fileContent.substring(0, 5000)}

추출할 데이터:
- employeeId (사번): 대문자 1자 + 숫자 7자
- name (이름)
- call_count (통화량)
- dm_count (DM발송)
- document_count (초본발급)
- legal_count (법적조치)
- visit_count (방문횟수)
- contact_rate (접촉률, 0-100)
- month (YYYY-MM 형태)

JSON 배열 형태로만 반환해주세요.
`;

        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: prompt
        });
        
        // 실행
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: ASSISTANT_ID
        });
        
        // 실행 완료 대기
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        let attempts = 0;
        const maxAttempts = 30;
        
        while (runStatus.status !== 'completed' && attempts < maxAttempts) {
            if (runStatus.status === 'failed') {
                throw new Error('Assistant 실행 실패: ' + runStatus.last_error?.message);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            attempts++;
        }
        
        if (runStatus.status !== 'completed') {
            throw new Error('Assistant 실행 시간 초과');
        }
        
        // 메시지 가져오기
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (!assistantMessage) {
            throw new Error('Assistant 응답을 찾을 수 없습니다');
        }
        
        const responseText = assistantMessage.content[0].text.value;
        
        // JSON 파싱
        try {
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                
                return res.status(200).json({
                    success: true,
                    data: data,
                    count: data.length,
                    method: 'assistant'
                });
            }
            
            throw new Error('JSON 배열을 찾을 수 없습니다');
            
        } catch (parseError) {
            console.error('JSON 파싱 실패:', parseError);
            console.error('Assistant 응답:', responseText);
            
            return res.status(500).json({
                success: false,
                error: 'Assistant 응답을 파싱할 수 없습니다: ' + parseError.message,
                rawResponse: responseText.substring(0, 500)
            });
        }
        
    } catch (error) {
        console.error('Assistant API 데이터 추출 실패:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
