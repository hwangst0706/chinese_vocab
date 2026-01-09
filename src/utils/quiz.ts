/**
 * @file 퀴즈 유틸리티
 * @brief 퀴즈 문제 생성 로직
 */

import { Word, QuizQuestion, QuizType } from '../types';
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
 * @brief 여러 퀴즈 문제 생성
 * @param aWordIds 단어 ID 배열
 */
export function generateQuizQuestions(aWordIds: string[]): QuizQuestion[]
{
    const aQuizTypes: QuizType[] = [
        'hanzi_to_meaning',
        'meaning_to_hanzi',
        'hanzi_to_pinyin',
    ];

    return aWordIds
        .map((szWordId) =>
        {
            // 랜덤 퀴즈 타입 선택
            const type = aQuizTypes[Math.floor(Math.random() * aQuizTypes.length)];
            return generateQuizQuestion(szWordId, type);
        })
        .filter((q): q is QuizQuestion => q !== null);
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
