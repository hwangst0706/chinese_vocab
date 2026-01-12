/**
 * @file 퀴즈 유틸리티
 * @brief 퀴즈 문제 생성 로직
 */

import { Word, QuizQuestion, QuizType, ReviewQuizQuestion, ReviewQuizType } from '../types';
import { allWords, getWordById } from '../data';

/**
 * @brief 랜덤 선택지 생성
 * @param stCorrectWord 정답 단어
 * @param szField 선택지로 사용할 필드
 * @param nCount 선택지 개수
 */
function generateOptions(
    stCorrectWord: Word,
    szField: 'szMeaning' | 'szHanzi' | 'szPinyin',
    nCount: number = 4
): { aOptions: string[]; nCorrectIndex: number }
{
    const szCorrectValue = stCorrectWord[szField];
    const nCharCount = stCorrectWord.szHanzi.length;

    // 한자 또는 병음 선택지일 경우 글자수(음절수)가 같은 단어만 필터링
    const bFilterByCharCount = szField === 'szHanzi' || szField === 'szPinyin';

    // 같은 레벨 + 같은 글자수 단어에서 오답 선택지 추출
    const aSameLevelWords = allWords.filter(
        (w) =>
            w.nLevel === stCorrectWord.nLevel &&
            w.szId !== stCorrectWord.szId &&
            (!bFilterByCharCount || w.szHanzi.length === nCharCount)
    );

    // 다른 레벨 + 같은 글자수 단어 (부족할 경우 대비)
    const aOtherWords = allWords.filter(
        (w) =>
            w.nLevel !== stCorrectWord.nLevel &&
            w.szId !== stCorrectWord.szId &&
            (!bFilterByCharCount || w.szHanzi.length === nCharCount)
    );

    // 오답 후보 셔플
    let aWrongCandidates = [...aSameLevelWords, ...aOtherWords]
        .sort(() => Math.random() - 0.5)
        .filter((w) => w[szField] !== szCorrectValue)
        .slice(0, nCount - 1)
        .map((w) => w[szField]);

    // 같은 글자수 단어가 부족할 경우 다른 글자수도 허용
    if (bFilterByCharCount && aWrongCandidates.length < nCount - 1)
    {
        const aFallbackWords = allWords
            .filter(
                (w) =>
                    w.szId !== stCorrectWord.szId &&
                    w[szField] !== szCorrectValue &&
                    !aWrongCandidates.includes(w[szField])
            )
            .sort(() => Math.random() - 0.5)
            .slice(0, nCount - 1 - aWrongCandidates.length)
            .map((w) => w[szField]);

        aWrongCandidates = [...aWrongCandidates, ...aFallbackWords];
    }

    // 선택지 배열 생성 및 셔플
    const aOptions = [szCorrectValue, ...aWrongCandidates].sort(
        () => Math.random() - 0.5
    );

    const nCorrectIndex = aOptions.indexOf(szCorrectValue);

    return { aOptions, nCorrectIndex };
}

/**
 * @brief 퀴즈 문제 생성
 * @param szWordId 단어 ID
 * @param type 퀴즈 타입
 */
export function generateQuizQuestion(
    szWordId: string,
    type: QuizType
): QuizQuestion | null
{
    const stWord = getWordById(szWordId);
    if (!stWord) return null;

    // 타이핑 퀴즈 (인출형)
    if (type === 'meaning_to_pinyin')
    {
        return {
            stWord,
            type,
            szCorrectAnswer: stWord.szPinyin,
        };
    }

    // 선택형 퀴즈
    let szField: 'szMeaning' | 'szHanzi' | 'szPinyin';

    switch (type)
    {
        case 'hanzi_to_meaning':
            szField = 'szMeaning';
            break;
        case 'meaning_to_hanzi':
            szField = 'szHanzi';
            break;
        case 'hanzi_to_pinyin':
            szField = 'szPinyin';
            break;
        default:
            szField = 'szMeaning';
    }

    const { aOptions, nCorrectIndex } = generateOptions(stWord, szField);

    return {
        stWord,
        type,
        aOptions,
        nCorrectIndex,
    };
}

/**
 * @brief 여러 퀴즈 문제 생성 (인출 중심 학습)
 * @param aWordIds 단어 ID 배열
 * @return 단어 수 × 3 (퀴즈 유형) 개의 문제 배열
 *
 * 퀴즈 비중 (인출 70% 이상 목표):
 * - meaning_to_pinyin (뜻→병음 타이핑): 인출형, 가장 어려움
 * - meaning_to_hanzi (뜻→한자 선택): 반인출형
 * - hanzi_to_meaning (한자→뜻 선택): 재인형
 */
export function generateQuizQuestions(aWordIds: string[]): QuizQuestion[]
{
    // 각 단어당 3문제: 인출형 2개 + 재인형 1개
    // - meaning_to_pinyin (타이핑): 인출
    // - meaning_to_hanzi (선택): 반인출
    // - hanzi_to_meaning (선택): 재인
    const aQuizTypesPerWord: QuizType[] = [
        'meaning_to_pinyin',   // 인출: 뜻 보고 병음 타이핑
        'meaning_to_hanzi',    // 반인출: 뜻 보고 한자 선택
        'hanzi_to_meaning',    // 재인: 한자 보고 뜻 선택
    ];

    const aAllQuestions: QuizQuestion[] = [];

    // 각 단어에 대해 3가지 퀴즈 유형 생성
    aWordIds.forEach((szWordId) =>
    {
        aQuizTypesPerWord.forEach((type) =>
        {
            const stQuestion = generateQuizQuestion(szWordId, type);
            if (stQuestion)
            {
                aAllQuestions.push(stQuestion);
            }
        });
    });

    // 전체 문제 셔플 (같은 단어가 연속으로 나오지 않도록)
    return aAllQuestions.sort(() => Math.random() - 0.5);
}

/**
 * @brief 퀴즈 타입 한글 이름
 */
export function getQuizTypeName(type: QuizType): string
{
    switch (type)
    {
        case 'hanzi_to_meaning':
            return '한자 → 뜻';
        case 'meaning_to_hanzi':
            return '뜻 → 한자';
        case 'hanzi_to_pinyin':
            return '한자 → 병음';
        case 'meaning_to_pinyin':
            return '뜻 → 병음 (타이핑)';
        default:
            return '퀴즈';
    }
}

/**
 * @brief 퀴즈 질문 텍스트 생성
 */
export function getQuestionText(stQuestion: QuizQuestion): string
{
    switch (stQuestion.type)
    {
        case 'hanzi_to_meaning':
            return `"${stQuestion.stWord.szHanzi}"의 뜻은?`;
        case 'meaning_to_hanzi':
            return `"${stQuestion.stWord.szMeaning}"에 해당하는 한자는?`;
        case 'hanzi_to_pinyin':
            return `"${stQuestion.stWord.szHanzi}"의 병음은?`;
        case 'meaning_to_pinyin':
            return `"${stQuestion.stWord.szMeaning}"의 병음을 입력하세요`;
        default:
            return '';
    }
}

/**
 * @brief 퀴즈 힌트 텍스트 (단어 표시용)
 */
export function getQuestionDisplay(stQuestion: QuizQuestion): string
{
    switch (stQuestion.type)
    {
        case 'hanzi_to_meaning':
        case 'hanzi_to_pinyin':
            return stQuestion.stWord.szHanzi;
        case 'meaning_to_hanzi':
        case 'meaning_to_pinyin':
            return stQuestion.stWord.szMeaning;
        default:
            return '';
    }
}

/**
 * @brief 타이핑 퀴즈 여부 확인
 */
export function isTypingQuiz(type: QuizType): boolean
{
    return type === 'meaning_to_pinyin';
}

// ============================================================
// 복습 테스트 퀴즈 생성 함수
// ============================================================

/**
 * @brief 빈칸 채우기 문제 생성
 * @param stWord 정답 단어 (예문 필수)
 * @return ReviewQuizQuestion 또는 null (예문 없으면)
 */
export function generateFillBlankQuestion(stWord: Word): ReviewQuizQuestion | null
{
    if (!stWord.szExample || !stWord.szHanzi)
    {
        return null;
    }

    // 예문에서 단어를 빈칸으로 치환
    const szQuestionText = stWord.szExample.replace(stWord.szHanzi, '______');

    // 만약 단어가 예문에 없으면 null 반환
    if (szQuestionText === stWord.szExample)
    {
        return null;
    }

    // 오답 선택지 생성 (같은 레벨, 비슷한 글자수)
    const { aOptions, nCorrectIndex } = generateOptions(stWord, 'szHanzi', 4);

    return {
        stWord,
        type: 'fill_blank',
        szQuestionText,
        aOptions,
        nCorrectIndex,
    };
}

/**
 * @brief 듣기 퀴즈 문제 생성 (발음 듣고 한자 선택)
 * @param stWord 정답 단어
 */
export function generateListeningQuestion(stWord: Word): ReviewQuizQuestion
{
    const { aOptions, nCorrectIndex } = generateOptions(stWord, 'szHanzi', 4);

    return {
        stWord,
        type: 'listening',
        aOptions,
        nCorrectIndex,
    };
}

/**
 * @brief 병음 타이핑 문제 생성 (한자 보고 병음 입력)
 * @param stWord 정답 단어
 */
export function generatePinyinTypingQuestion(stWord: Word): ReviewQuizQuestion
{
    return {
        stWord,
        type: 'pinyin_typing',
        szCorrectPinyin: stWord.szPinyin,
    };
}

/**
 * @brief 복습 테스트 문제 세트 생성
 * @param aWordIds 테스트할 단어 ID 배열
 * @param nQuestionCount 생성할 문제 수
 * @return 셔플된 복습 퀴즈 배열
 */
export function generateReviewQuizQuestions(
    aWordIds: string[],
    nQuestionCount: number = 20
): ReviewQuizQuestion[]
{
    const aAllQuestions: ReviewQuizQuestion[] = [];
    const aReviewTypes: ReviewQuizType[] = ['fill_blank', 'listening', 'pinyin_typing'];

    // 각 단어에 대해 랜덤한 퀴즈 타입 할당
    aWordIds.forEach((szWordId) =>
    {
        const stWord = getWordById(szWordId);
        if (!stWord) return;

        // 랜덤 퀴즈 타입 선택
        const type = aReviewTypes[Math.floor(Math.random() * aReviewTypes.length)];

        let stQuestion: ReviewQuizQuestion | null = null;

        switch (type)
        {
            case 'fill_blank':
                stQuestion = generateFillBlankQuestion(stWord);
                // 예문이 없으면 듣기 퀴즈로 대체
                if (!stQuestion)
                {
                    stQuestion = generateListeningQuestion(stWord);
                }
                break;
            case 'listening':
                stQuestion = generateListeningQuestion(stWord);
                break;
            case 'pinyin_typing':
                stQuestion = generatePinyinTypingQuestion(stWord);
                break;
        }

        if (stQuestion)
        {
            aAllQuestions.push(stQuestion);
        }
    });

    // 셔플 후 요청된 문제 수만큼 반환
    return aAllQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, nQuestionCount);
}

/**
 * @brief 복습 퀴즈 타입 한글 이름
 */
export function getReviewQuizTypeName(type: ReviewQuizType): string
{
    switch (type)
    {
        case 'fill_blank':
            return '빈칸 채우기';
        case 'listening':
            return '듣기';
        case 'pinyin_typing':
            return '병음 입력';
        default:
            return '복습';
    }
}

/**
 * @brief 병음을 기본 문자와 성조 배열로 분리
 * @param szPinyin 병음 (성조 부호 또는 숫자 형식)
 * @return { base: 기본 병음, tones: 성조 배열 }
 */
function parsePinyin(szPinyin: string): { base: string; tones: number[] }
{
    const toneMarkMap: Record<string, { base: string; tone: number }> = {
        'ā': { base: 'a', tone: 1 }, 'á': { base: 'a', tone: 2 },
        'ǎ': { base: 'a', tone: 3 }, 'à': { base: 'a', tone: 4 },
        'ē': { base: 'e', tone: 1 }, 'é': { base: 'e', tone: 2 },
        'ě': { base: 'e', tone: 3 }, 'è': { base: 'e', tone: 4 },
        'ī': { base: 'i', tone: 1 }, 'í': { base: 'i', tone: 2 },
        'ǐ': { base: 'i', tone: 3 }, 'ì': { base: 'i', tone: 4 },
        'ō': { base: 'o', tone: 1 }, 'ó': { base: 'o', tone: 2 },
        'ǒ': { base: 'o', tone: 3 }, 'ò': { base: 'o', tone: 4 },
        'ū': { base: 'u', tone: 1 }, 'ú': { base: 'u', tone: 2 },
        'ǔ': { base: 'u', tone: 3 }, 'ù': { base: 'u', tone: 4 },
        'ǖ': { base: 'v', tone: 1 }, 'ǘ': { base: 'v', tone: 2 },
        'ǚ': { base: 'v', tone: 3 }, 'ǜ': { base: 'v', tone: 4 },
        'ü': { base: 'v', tone: 0 },
    };

    let base = '';
    const tones: number[] = [];

    for (const char of szPinyin)
    {
        const mapped = toneMarkMap[char];
        if (mapped)
        {
            base += mapped.base;
            if (mapped.tone > 0) tones.push(mapped.tone);
        }
        else if (char >= '1' && char <= '4')
        {
            // 숫자 성조
            tones.push(parseInt(char, 10));
        }
        else
        {
            base += char;
        }
    }

    return { base, tones };
}

/**
 * @brief 병음 정답 비교 (성조 부호/숫자 성조 모두 지원)
 * @param szInput 사용자 입력 (kuài, kuai4, gōngsī, gong1si1 등)
 * @param szCorrect 정답 병음 (보통 성조 부호 형식)
 * @param bIgnoreTone 성조 무시 여부
 */
export function comparePinyin(
    szInput: string,
    szCorrect: string,
    bIgnoreTone: boolean = false
): boolean
{
    // 공백 제거 및 소문자 변환
    const szNormalizedInput = szInput.toLowerCase().trim().replace(/\s+/g, '');
    const szNormalizedCorrect = szCorrect.toLowerCase().trim().replace(/\s+/g, '');

    // 기본 문자와 성조 분리
    const stInputParsed = parsePinyin(szNormalizedInput);
    const stCorrectParsed = parsePinyin(szNormalizedCorrect);

    // 기본 병음 비교
    if (stInputParsed.base !== stCorrectParsed.base)
    {
        return false;
    }

    // 성조 무시 모드면 기본 병음만 일치하면 정답
    if (bIgnoreTone)
    {
        return true;
    }

    // 성조 비교 (순서와 값 모두 일치해야 함)
    if (stInputParsed.tones.length !== stCorrectParsed.tones.length)
    {
        return false;
    }

    for (let i = 0; i < stInputParsed.tones.length; i++)
    {
        if (stInputParsed.tones[i] !== stCorrectParsed.tones[i])
        {
            return false;
        }
    }

    return true;
}
