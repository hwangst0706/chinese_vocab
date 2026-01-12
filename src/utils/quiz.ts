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
 * @brief 여러 퀴즈 문제 생성 (각 단어당 모든 퀴즈 유형 생성)
 * @param aWordIds 단어 ID 배열
 * @return 단어 수 × 3 (퀴즈 유형) 개의 문제 배열
 */
export function generateQuizQuestions(aWordIds: string[]): QuizQuestion[]
{
    const aQuizTypes: QuizType[] = [
        'hanzi_to_meaning',
        'meaning_to_hanzi',
        'hanzi_to_pinyin',
    ];

    const aAllQuestions: QuizQuestion[] = [];

    // 각 단어에 대해 3가지 퀴즈 유형 모두 생성
    aWordIds.forEach((szWordId) =>
    {
        aQuizTypes.forEach((type) =>
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
            return stQuestion.stWord.szMeaning;
        default:
            return '';
    }
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
 * @brief 병음 정답 비교 (성조 부호 무시 옵션)
 * @param szInput 사용자 입력
 * @param szCorrect 정답 병음
 * @param bIgnoreTone 성조 무시 여부
 */
export function comparePinyin(
    szInput: string,
    szCorrect: string,
    bIgnoreTone: boolean = false
): boolean
{
    const normalize = (s: string): string =>
    {
        let result = s.toLowerCase().trim();
        if (bIgnoreTone)
        {
            // 성조 부호를 기본 알파벳으로 변환
            const toneMap: Record<string, string> = {
                'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
                'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
                'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
                'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
                'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
                'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v',
            };
            result = result.split('').map(c => toneMap[c] || c).join('');
        }
        return result;
    };

    return normalize(szInput) === normalize(szCorrect);
}
