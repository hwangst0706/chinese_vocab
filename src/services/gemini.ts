/**
 * @file Gemini API 서비스
 * @brief AI 예문 생성 및 Q&A 기능
 */

import { Word } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface GeneratedExample
{
    szSentence: string;      // 중국어 문장
    szPinyin: string;        // 병음
    szMeaning: string;       // 한국어 뜻
}

export interface GeminiResponse
{
    aExamples?: GeneratedExample[];
    szAnswer?: string;
    szError?: string;
}

/**
 * @brief Gemini API 호출
 * @param szApiKey API 키
 * @param szPrompt 프롬프트
 */
async function callGemini(szApiKey: string, szPrompt: string): Promise<string>
{
    const response = await fetch(`${GEMINI_API_URL}?key=${szApiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: szPrompt,
                }],
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
            },
        }),
    });

    if (!response.ok)
    {
        const szErrorText = await response.text();

        // 사용량 초과 에러 체크
        if (response.status === 429 || szErrorText.includes('quota') || szErrorText.includes('RESOURCE_EXHAUSTED'))
        {
            throw new Error('API 사용량을 초과했습니다. 잠시 후 다시 시도해주세요.');
        }

        // 인증 에러 체크
        if (response.status === 401 || response.status === 403)
        {
            throw new Error('API 키가 유효하지 않습니다. 설정에서 확인해주세요.');
        }

        throw new Error(`API 오류 (${response.status}): 잠시 후 다시 시도해주세요.`);
    }

    const data = await response.json();
    const szText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!szText)
    {
        throw new Error('응답을 받지 못했습니다. 다시 시도해주세요.');
    }

    return szText;
}

/**
 * @brief 단어를 활용한 예문 5개 생성
 * @param szApiKey Gemini API 키
 * @param stWord 학습 중인 단어
 */
export async function generateExamples(
    szApiKey: string,
    stWord: Word
): Promise<GeminiResponse>
{
    if (!szApiKey)
    {
        return { szError: 'API 키가 설정되지 않았습니다. 설정에서 Gemini API 키를 입력해주세요.' };
    }

    const szPrompt = `
당신은 중국어 학습을 돕는 선생님입니다.
다음 중국어 단어를 활용한 예문 5개를 생성해주세요.

단어: ${stWord.szHanzi}
병음: ${stWord.szPinyin}
뜻: ${stWord.szMeaning}
HSK 레벨: ${stWord.nLevel}

요구사항:
1. HSK ${stWord.nLevel}급 수준에 맞는 문장
2. 일상생활에서 자주 쓰는 실용적인 표현
3. 다양한 문맥에서의 사용법 보여주기
4. 콜로케이션(자주 같이 쓰이는 표현) 포함

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
[
  {"sentence": "중국어 문장", "pinyin": "병음", "meaning": "한국어 뜻"},
  {"sentence": "중국어 문장", "pinyin": "병음", "meaning": "한국어 뜻"},
  {"sentence": "중국어 문장", "pinyin": "병음", "meaning": "한국어 뜻"},
  {"sentence": "중국어 문장", "pinyin": "병음", "meaning": "한국어 뜻"},
  {"sentence": "중국어 문장", "pinyin": "병음", "meaning": "한국어 뜻"}
]`;

    try
    {
        const szResponse = await callGemini(szApiKey, szPrompt);

        // JSON 파싱 (마크다운 코드 블록 제거)
        const szClean = szResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const aRaw = JSON.parse(szClean);

        const aExamples: GeneratedExample[] = aRaw.map((item: any) => ({
            szSentence: item.sentence,
            szPinyin: item.pinyin,
            szMeaning: item.meaning,
        }));

        return { aExamples };
    }
    catch (error)
    {
        const szErrorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
        return { szError: szErrorMsg };
    }
}

/**
 * @brief 단어에 대한 질문 답변
 * @param szApiKey Gemini API 키
 * @param stWord 학습 중인 단어
 * @param szQuestion 사용자 질문
 * @param aHistory 대화 히스토리
 */
export async function askQuestion(
    szApiKey: string,
    stWord: Word,
    szQuestion: string,
    aHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<GeminiResponse>
{
    if (!szApiKey)
    {
        return { szError: 'API 키가 설정되지 않았습니다.' };
    }

    const szHistoryText = aHistory
        .map((h) => `${h.role === 'user' ? '학생' : '선생님'}: ${h.content}`)
        .join('\n');

    const szPrompt = `
당신은 친절한 중국어 선생님입니다.
학생이 다음 단어를 학습하고 있습니다:

단어: ${stWord.szHanzi}
병음: ${stWord.szPinyin}
뜻: ${stWord.szMeaning}
HSK 레벨: ${stWord.nLevel}
${stWord.szExample ? `예문: ${stWord.szExample} (${stWord.szExampleMeaning})` : ''}

${szHistoryText ? `이전 대화:\n${szHistoryText}\n` : ''}

학생의 질문: ${szQuestion}

요구사항:
1. 한국어로 답변하세요
2. 명확하고 이해하기 쉽게 설명하세요
3. 필요하면 추가 예문을 들어주세요
4. 비슷한 단어와의 차이점도 설명해주세요 (관련 있다면)
5. 답변은 반드시 1500자 이내로 간결하게 작성하세요
`;

    try
    {
        const szAnswer = await callGemini(szApiKey, szPrompt);
        return { szAnswer: szAnswer.trim() };
    }
    catch (error)
    {
        const szErrorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
        return { szError: szErrorMsg };
    }
}
