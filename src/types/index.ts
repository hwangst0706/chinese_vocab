/**
 * @file 타입 정의
 * @brief HSK 단어 암기 앱 타입
 */

export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface Word
{
    szId: string;
    nLevel: HskLevel;
    szHanzi: string;
    szPinyin: string;
    szMeaning: string;
    szExample?: string;
    szExamplePinyin?: string;
    szExampleMeaning?: string;
}

export type QuizType = 'hanzi_to_meaning' | 'meaning_to_hanzi' | 'hanzi_to_pinyin';

// 복습 테스트 전용 퀴즈 타입
export type ReviewQuizType = 'fill_blank' | 'listening' | 'pinyin_typing';

export interface ReviewQuizQuestion
{
    stWord: Word;
    type: ReviewQuizType;
    // fill_blank: 빈칸이 있는 예문
    szQuestionText?: string;
    // fill_blank, listening: 선택지
    aOptions?: string[];
    nCorrectIndex?: number;
    // pinyin_typing: 정답 병음
    szCorrectPinyin?: string;
}

export interface QuizQuestion
{
    stWord: Word;
    type: QuizType;
    aOptions: string[];
    nCorrectIndex: number;
}

export interface WordProgress
{
    szWordId: string;
    nLevel: number;           // SRS 레벨 (0: 새 단어, 1~8: 학습 중)
    nCorrectCount: number;    // 총 정답 수
    nWrongCount: number;      // 총 오답 수
    dtNextReview: string;     // 다음 복습 날짜 (ISO string)
    dtLastReview?: string;    // 마지막 복습 날짜
    bMastered: boolean;       // 암기 완료 여부

    // SM-2 알고리즘 필드
    fEasiness: number;        // 난이도 팩터 (1.3 ~ 2.5, 기본값 2.5)
    nConsecutiveCorrect: number;  // 연속 정답 횟수
    bIsLeech: boolean;        // Leech 단어 여부 (반복 오답)
}

export interface DailyStats
{
    szDate: string;           // YYYY-MM-DD
    nQuestionsAnswered: number;
    nCorrectAnswers: number;
    nNewWordsLearned: number;
    nWordsReviewed: number;
}

export interface Settings
{
    nDailyGoal: number;       // 일일 목표 단어 수 (퀴즈 수 = 단어 수 × 3)
    aSelectedLevels: HskLevel[];  // 학습할 HSK 급수
    bSoundEnabled: boolean;
    bVibrationEnabled: boolean;
    bNotificationEnabled: boolean;
    bShowPinyin: boolean;     // 퀴즈 중 병음 표시 (병음 퀴즈 제외)
}

export interface LevelStats
{
    nLevel: HskLevel;
    nTotalWords: number;
    nLearnedWords: number;    // 한번이라도 학습한 단어
    nMasteredWords: number;   // 암기 완료한 단어
}

// 복습 테스트 기록
export interface ReviewTestRecord
{
    szDate: string;           // YYYY-MM-DD
    nTotalQuestions: number;
    nCorrectAnswers: number;
    nAccuracyPercent: number;
    aWeakWords: string[];     // 틀린 단어 ID 목록
}

// 복습 테스트 설정
export interface ReviewTestSettings
{
    nIntervalDays: number;    // 복습 테스트 주기 (기본: 7일)
    nQuestionCount: number;   // 문제 수 (기본: 20)
    dtLastTest?: string;      // 마지막 테스트 날짜
}
