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

// 선택형 퀴즈: 4지선다
// 입력형 퀴즈: 타이핑 (인출 훈련)
export type QuizType =
    | 'hanzi_to_meaning'     // 한자 → 뜻 선택 (재인)
    | 'meaning_to_hanzi'     // 뜻 → 한자 선택 (재인)
    | 'hanzi_to_pinyin'      // 한자 → 병음 선택 (재인)
    | 'meaning_to_pinyin';   // 뜻 → 병음 타이핑 (인출, Production)

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
    // 선택형 퀴즈용
    aOptions?: string[];
    nCorrectIndex?: number;
    // 타이핑 퀴즈용 (meaning_to_pinyin)
    szCorrectAnswer?: string;
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
    bToneStrictMode: boolean; // 성조 엄격 모드 (병음 입력 시 성조 필수)
    szGeminiApiKey: string;   // Gemini API 키 (AI 예문 생성용)
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

// 퀴즈 세션 (이어하기용)
export interface QuizSession
{
    szDate: string;           // 세션 날짜 (YYYY-MM-DD)
    aQuestions: QuizQuestion[];  // 퀴즈 문제 목록
    nCurrentIndex: number;    // 현재 문제 인덱스
    nCorrectCount: number;    // 정답 수
    nReviewCount: number;     // 복습 단어 수
    nNewCount: number;        // 새 단어 수
}
