// api/extract-performance.js
// 단순 테스트 버전

export default function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // 모든 요청에 대해 기본 응답
    return res.status(200).json({
        success: true,
        message: '테스트 API가 정상 작동합니다',
        method: req.method,
        timestamp: new Date().toISOString(),
        url: req.url
    });
}
