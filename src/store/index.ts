/**
 * @file Zustand 스토어
 * @brief 앱 전체 상태 관리 (SRS 포함)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    WordProgress,
    DailyStats,
    Settings,
    HskLevel,
    LevelStats,
    ReviewTestSettings,
    ReviewTestRecord,
} from '../types';
import { BackupData } from '../types/backup';
import { allWords, getWordsByLevel, levelWordCounts } from '../data';

/**
 * @brief SM-2 알고리즘 기반 SRS 상수
 */

// 기본 복습 간격 (일 단위): 레벨별 기준 간격 (EF로 조정됨)
const SRS_BASE_INTERVALS = [0, 1, 3, 7, 14, 30, 60, 120, 240];

// 난이도 팩터 (Easiness Factor) 설정
const EF_DEFAULT = 2.5;   // 기본값 (쉬운 단어)
const EF_MIN = 1.3;       // 최소값 (매우 어려운 단어)
const EF_MAX = 2.5;       // 최대값

// Leech (거머리 단어) 감지 임계값
const LEECH_WRONG_THRESHOLD = 8;       // 총 오답 횟수 기준
const LEECH_RATIO_THRESHOLD = 0.5;     // 오답률 기준 (50%)
const LEECH_MIN_ATTEMPTS = 6;          // 최소 시도 횟수

/**
 * @brief SM-2 EF 조정 공식
 * @param fCurrentEF 현재 난이도 팩터
 * @param bCorrect 정답 여부
 * @param nConsecutiveCorrect 연속 정답 횟수 (정답 시)
 * @return 조정된 EF 값
 */
const calculateNewEF = (fCurrentEF: number, bCorrect: boolean, nConsecutiveCorrect: number): number =>
{
    if (bCorrect)
    {
        // 정답: EF 증가 (연속 정답이 많을수록 보너스)
        const fBonus = Math.min(nConsecutiveCorrect * 0.02, 0.1);
        return Math.min(EF_MAX, fCurrentEF + 0.1 + fBonus);
    }
    else
    {
        // 오답: EF 감소
        return Math.max(EF_MIN, fCurrentEF - 0.2);
    }
};

/**
 * @brief 다음 복습 간격 계산 (SM-2 방식)
 * @param nLevel 현재 SRS 레벨
 * @param fEasiness 난이도 팩터
 * @return 다음 복습까지의 일수
 */
const calculateInterval = (nLevel: number, fEasiness: number): number =>
{
    if (nLevel <= 1) return 1;
    if (nLevel === 2) return 3;

    // 레벨 3 이상: 이전 간격 × EF
    const nBaseInterval = SRS_BASE_INTERVALS[Math.min(nLevel, SRS_BASE_INTERVALS.length - 1)];
    return Math.round(nBaseInterval * (fEasiness / EF_DEFAULT));
};

/**
 * @brief Leech 여부 판정
 * @param nWrongCount 총 오답 횟수
 * @param nCorrectCount 총 정답 횟수
 * @return Leech 단어 여부
 */
const checkIsLeech = (nWrongCount: number, nCorrectCount: number): boolean =>
{
    const nTotalAttempts = nWrongCount + nCorrectCount;

    // 조건 1: 오답 횟수가 임계값 초과
    if (nWrongCount >= LEECH_WRONG_THRESHOLD) return true;

    // 조건 2: 충분한 시도 후 오답률이 임계값 초과
    if (nTotalAttempts >= LEECH_MIN_ATTEMPTS)
    {
        const fWrongRatio = nWrongCount / nTotalAttempts;
        if (fWrongRatio > LEECH_RATIO_THRESHOLD) return true;
    }

    return false;
};

interface AppState
{
    // 학습 진도
    wordProgress: Record<string, WordProgress>;

    // 일일 통계
    dailyStats: Record<string, DailyStats>;

    // 설정
    settings: Settings;

    // 제외된 단어 (퀴즈에서 제외)
    aExcludedWords: string[];

    // 오늘 날짜 (YYYY-MM-DD)
    getTodayKey: () => string;

    // 오늘 통계 가져오기
    getTodayStats: () => DailyStats;

    // 단어 진도 업데이트 (정답/오답)
    updateWordProgress: (szWordId: string, bCorrect: boolean) => void;

    // 오늘 복습할 단어 가져오기
    getWordsToReview: () => string[];

    // 새로 학습할 단어 가져오기
    getNewWords: (nCount: number) => string[];

    // 퀴즈용 단어 가져오기 (복습 + 새 단어)
    getQuizWords: (nCount: number) => string[];

    // 레벨별 통계
    getLevelStats: (nLevel: HskLevel) => LevelStats;

    // 설정 변경
    updateSettings: (stPartial: Partial<Settings>) => void;

    // 일일 통계 증가
    incrementDailyStat: (szField: keyof DailyStats) => void;

    // 데이터 초기화
    resetAllProgress: () => void;

    // 단어 제외 토글
    toggleWordExclusion: (szWordId: string) => void;

    // 단어 제외 여부 확인
    isWordExcluded: (szWordId: string) => boolean;

    // 가장 많이 틀린 단어 목록 (오답 횟수 기준 정렬)
    getMostWrongWords: () => WordProgress[];

    // 제외된 단어 ID 목록
    getExcludedWordIds: () => string[];

    // Leech 단어 목록 (반복적으로 틀리는 단어)
    getLeechWords: () => WordProgress[];

    // Leech 상태 해제
    resetLeechStatus: (szWordId: string) => void;

    // 세션용 단어 가져오기 (복습 + 새 단어 분리)
    getSessionWords: (nTotalCount: number) => {
        aReviewWordIds: string[];
        aNewWordIds: string[];
    };

    // ============================================================
    // 복습 테스트 관련
    // ============================================================

    // 복습 테스트 설정
    reviewTestSettings: ReviewTestSettings;

    // 복습 테스트 기록
    reviewTestRecords: ReviewTestRecord[];

    // 복습 테스트 설정 업데이트
    updateReviewTestSettings: (stPartial: Partial<ReviewTestSettings>) => void;

    // 복습 테스트 예정 여부 확인
    isReviewTestDue: () => boolean;

    // 복습 테스트까지 남은 일수
    getDaysUntilReviewTest: () => number;

    // 복습 테스트용 단어 가져오기 (학습한 단어 중에서)
    getReviewTestWords: (nCount: number) => string[];

    // 복습 테스트 결과 기록
    recordReviewTestResult: (nTotal: number, nCorrect: number, aWeakWordIds: string[]) => void;

    // 최근 복습 테스트 기록 가져오기
    getRecentReviewTests: (nLimit: number) => ReviewTestRecord[];

    // ============================================================
    // 연속 학습 (스트릭) 관련
    // ============================================================

    // 현재 연속 학습일 가져오기
    getCurrentStreak: () => number;

    // 최장 연속 학습일 가져오기
    getLongestStreak: () => number;

    // 특정 날짜에 학습했는지 확인
    hasLearnedOnDate: (szDate: string) => boolean;

    // ============================================================
    // 백업/복원 관련
    // ============================================================

    // 백업 데이터 가져오기 (복원용)
    importBackupData: (stBackupData: BackupData) => void;
}

const getDateKey = (): string =>
{
    const dt = new Date();
    return dt.toISOString().split('T')[0];
};

const getEmptyDailyStats = (szDate: string): DailyStats => ({
    szDate,
    nQuestionsAnswered: 0,
    nCorrectAnswers: 0,
    nNewWordsLearned: 0,
    nWordsReviewed: 0,
});

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            wordProgress: {},

            dailyStats: {},

            settings: {
                nDailyGoal: 20,
                aSelectedLevels: [1, 2],
                bSoundEnabled: true,
                bVibrationEnabled: true,
                bNotificationEnabled: true,
                bShowPinyin: true,
                bToneStrictMode: false,
                szGeminiApiKey: '',
            },

            aExcludedWords: [],

            reviewTestSettings: {
                nIntervalDays: 7,     // 기본 7일 주기
                nQuestionCount: 20,   // 기본 20문제
                dtLastTest: undefined,
            },

            reviewTestRecords: [],

            getTodayKey: () => getDateKey(),

            getTodayStats: () =>
            {
                const szToday = getDateKey();
                const { dailyStats } = get();
                return dailyStats[szToday] || getEmptyDailyStats(szToday);
            },

            updateWordProgress: (szWordId: string, bCorrect: boolean) =>
            {
                const { wordProgress, dailyStats } = get();
                const szToday = getDateKey();

                const stExisting = wordProgress[szWordId];
                const bIsNew = !stExisting || stExisting.nLevel === 0;

                // 기존 데이터 마이그레이션: SM-2 필드가 없으면 기본값 설정
                const fCurrentEF = stExisting?.fEasiness ?? EF_DEFAULT;
                const nCurrentConsecutive = stExisting?.nConsecutiveCorrect ?? 0;

                let stNewProgress: WordProgress;

                if (bCorrect)
                {
                    // 정답 처리 (SM-2)
                    const nNewConsecutive = nCurrentConsecutive + 1;
                    const nNewLevel = stExisting
                        ? Math.min(stExisting.nLevel + 1, SRS_BASE_INTERVALS.length - 1)
                        : 1;

                    const fNewEF = calculateNewEF(fCurrentEF, true, nNewConsecutive);
                    const nDaysUntilReview = calculateInterval(nNewLevel, fNewEF);

                    const dtNext = new Date();
                    dtNext.setDate(dtNext.getDate() + nDaysUntilReview);

                    const nNewCorrectCount = (stExisting?.nCorrectCount || 0) + 1;
                    const nWrongCount = stExisting?.nWrongCount || 0;

                    stNewProgress = {
                        szWordId,
                        nLevel: nNewLevel,
                        nCorrectCount: nNewCorrectCount,
                        nWrongCount: nWrongCount,
                        dtNextReview: dtNext.toISOString(),
                        dtLastReview: new Date().toISOString(),
                        bMastered: nNewLevel >= SRS_BASE_INTERVALS.length - 1,
                        fEasiness: fNewEF,
                        nConsecutiveCorrect: nNewConsecutive,
                        bIsLeech: stExisting?.bIsLeech ?? false,  // 정답 시 Leech 상태 유지 (자동 해제 안함)
                    };
                }
                else
                {
                    // 오답 처리 (SM-2): 점진적 레벨 하락
                    const nCurrentLevel = stExisting?.nLevel ?? 0;
                    const nNewLevel = Math.max(1, nCurrentLevel - 2);  // 2단계 하락, 최소 1

                    const fNewEF = calculateNewEF(fCurrentEF, false, 0);
                    const nDaysUntilReview = calculateInterval(nNewLevel, fNewEF);

                    const dtNext = new Date();
                    dtNext.setDate(dtNext.getDate() + nDaysUntilReview);

                    const nCorrectCount = stExisting?.nCorrectCount || 0;
                    const nNewWrongCount = (stExisting?.nWrongCount || 0) + 1;

                    // Leech 여부 판정
                    const bNewIsLeech = checkIsLeech(nNewWrongCount, nCorrectCount);

                    stNewProgress = {
                        szWordId,
                        nLevel: nNewLevel,
                        nCorrectCount: nCorrectCount,
                        nWrongCount: nNewWrongCount,
                        dtNextReview: dtNext.toISOString(),
                        dtLastReview: new Date().toISOString(),
                        bMastered: false,
                        fEasiness: fNewEF,
                        nConsecutiveCorrect: 0,  // 연속 정답 리셋
                        bIsLeech: bNewIsLeech,
                    };
                }

                // 일일 통계 업데이트
                const stTodayStats = dailyStats[szToday] || getEmptyDailyStats(szToday);
                const stNewDailyStats: DailyStats = {
                    ...stTodayStats,
                    nQuestionsAnswered: stTodayStats.nQuestionsAnswered + 1,
                    nCorrectAnswers: stTodayStats.nCorrectAnswers + (bCorrect ? 1 : 0),
                    nNewWordsLearned: stTodayStats.nNewWordsLearned + (bIsNew ? 1 : 0),
                    nWordsReviewed: stTodayStats.nWordsReviewed + (bIsNew ? 0 : 1),
                };

                set({
                    wordProgress: {
                        ...wordProgress,
                        [szWordId]: stNewProgress,
                    },
                    dailyStats: {
                        ...dailyStats,
                        [szToday]: stNewDailyStats,
                    },
                });
            },

            getWordsToReview: () =>
            {
                const { wordProgress, settings, aExcludedWords } = get();
                const szToday = getDateKey();
                const dtToday = new Date(szToday);

                return Object.values(wordProgress)
                    .filter((wp) =>
                    {
                        if (wp.bMastered) return false;
                        if (wp.nLevel === 0) return false;
                        if (aExcludedWords.includes(wp.szWordId)) return false;

                        const dtReview = new Date(wp.dtNextReview);
                        return dtReview <= dtToday;
                    })
                    .filter((wp) =>
                    {
                        const word = allWords.find((w) => w.szId === wp.szWordId);
                        return word && settings.aSelectedLevels.includes(word.nLevel);
                    })
                    .map((wp) => wp.szWordId);
            },

            getNewWords: (nCount: number) =>
            {
                const { wordProgress, settings, aExcludedWords } = get();

                const aUnlearned = allWords
                    .filter((word) => settings.aSelectedLevels.includes(word.nLevel))
                    .filter((word) => !wordProgress[word.szId])
                    .filter((word) => !aExcludedWords.includes(word.szId))
                    .map((word) => word.szId);

                // 셔플 후 필요한 개수만큼 반환
                const aShuffled = [...aUnlearned].sort(() => Math.random() - 0.5);
                return aShuffled.slice(0, nCount);
            },

            getQuizWords: (nCount: number) =>
            {
                const { getWordsToReview, getNewWords } = get();

                // 복습할 단어 우선
                const aReviewWords = getWordsToReview();
                const nNewWordsNeeded = Math.max(0, nCount - aReviewWords.length);

                // 부족하면 새 단어 추가
                const aNewWords = getNewWords(nNewWordsNeeded);

                const aCombined = [...aReviewWords, ...aNewWords];

                // 셔플
                return aCombined.sort(() => Math.random() - 0.5).slice(0, nCount);
            },

            getLevelStats: (nLevel: HskLevel) =>
            {
                const { wordProgress } = get();
                const aLevelWords = getWordsByLevel(nLevel);

                let nLearnedWords = 0;
                let nMasteredWords = 0;

                aLevelWords.forEach((word) =>
                {
                    const wp = wordProgress[word.szId];
                    if (wp && wp.nLevel > 0)
                    {
                        nLearnedWords++;
                        if (wp.bMastered)
                        {
                            nMasteredWords++;
                        }
                    }
                });

                return {
                    nLevel,
                    nTotalWords: levelWordCounts[nLevel],
                    nLearnedWords,
                    nMasteredWords,
                };
            },

            updateSettings: (stPartial: Partial<Settings>) =>
            {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        ...stPartial,
                    },
                }));
            },

            incrementDailyStat: (szField: keyof DailyStats) =>
            {
                const { dailyStats } = get();
                const szToday = getDateKey();
                const stTodayStats = dailyStats[szToday] || getEmptyDailyStats(szToday);

                if (typeof stTodayStats[szField] === 'number')
                {
                    set({
                        dailyStats: {
                            ...dailyStats,
                            [szToday]: {
                                ...stTodayStats,
                                [szField]: (stTodayStats[szField] as number) + 1,
                            },
                        },
                    });
                }
            },

            resetAllProgress: () =>
            {
                set({
                    wordProgress: {},
                    dailyStats: {},
                });
            },

            toggleWordExclusion: (szWordId: string) =>
            {
                const { aExcludedWords } = get();

                if (aExcludedWords.includes(szWordId))
                {
                    set({
                        aExcludedWords: aExcludedWords.filter((id) => id !== szWordId),
                    });
                }
                else
                {
                    set({
                        aExcludedWords: [...aExcludedWords, szWordId],
                    });
                }
            },

            isWordExcluded: (szWordId: string) =>
            {
                const { aExcludedWords } = get();
                return aExcludedWords.includes(szWordId);
            },

            getMostWrongWords: () =>
            {
                const { wordProgress } = get();
                return Object.values(wordProgress)
                    .filter((wp) => wp.nWrongCount > 0)
                    .sort((a, b) => b.nWrongCount - a.nWrongCount);
            },

            getExcludedWordIds: () =>
            {
                const { aExcludedWords } = get();
                return aExcludedWords;
            },

            getLeechWords: () =>
            {
                const { wordProgress } = get();
                return Object.values(wordProgress)
                    .filter((wp) => wp.bIsLeech === true)
                    .sort((a, b) => b.nWrongCount - a.nWrongCount);
            },

            resetLeechStatus: (szWordId: string) =>
            {
                const { wordProgress } = get();
                const stExisting = wordProgress[szWordId];

                if (stExisting)
                {
                    set({
                        wordProgress: {
                            ...wordProgress,
                            [szWordId]: {
                                ...stExisting,
                                bIsLeech: false,
                            },
                        },
                    });
                }
            },

            getSessionWords: (nTotalCount: number) =>
            {
                const { getWordsToReview, getNewWords } = get();

                // 1. 복습할 단어 가져오기 (최대 nTotalCount개)
                const aAllReviewWords = getWordsToReview();
                const aReviewWordIds = aAllReviewWords.slice(0, nTotalCount);

                // 2. 남은 개수만큼 새 단어 가져오기
                const nNewWordsNeeded = Math.max(0, nTotalCount - aReviewWordIds.length);
                const aNewWordIds = getNewWords(nNewWordsNeeded);

                return {
                    aReviewWordIds,
                    aNewWordIds,
                };
            },

            // ============================================================
            // 복습 테스트 관련 구현
            // ============================================================

            updateReviewTestSettings: (stPartial: Partial<ReviewTestSettings>) =>
            {
                set((state) => ({
                    reviewTestSettings: {
                        ...state.reviewTestSettings,
                        ...stPartial,
                    },
                }));
            },

            isReviewTestDue: () =>
            {
                const { reviewTestSettings, wordProgress } = get();

                // 학습한 단어가 최소 10개 이상이어야 테스트 가능
                const nLearnedCount = Object.values(wordProgress)
                    .filter((wp) => wp.nLevel > 0).length;
                if (nLearnedCount < 10) return false;

                // 마지막 테스트 기록이 없으면 바로 테스트 가능
                if (!reviewTestSettings.dtLastTest) return true;

                const dtLast = new Date(reviewTestSettings.dtLastTest);
                const dtNow = new Date();
                const nDaysDiff = Math.floor(
                    (dtNow.getTime() - dtLast.getTime()) / (1000 * 60 * 60 * 24)
                );

                return nDaysDiff >= reviewTestSettings.nIntervalDays;
            },

            getDaysUntilReviewTest: () =>
            {
                const { reviewTestSettings, wordProgress } = get();

                // 학습한 단어가 부족하면 -1 반환
                const nLearnedCount = Object.values(wordProgress)
                    .filter((wp) => wp.nLevel > 0).length;
                if (nLearnedCount < 10) return -1;

                // 마지막 테스트 기록이 없으면 0 (바로 가능)
                if (!reviewTestSettings.dtLastTest) return 0;

                const dtLast = new Date(reviewTestSettings.dtLastTest);
                const dtNow = new Date();
                const nDaysDiff = Math.floor(
                    (dtNow.getTime() - dtLast.getTime()) / (1000 * 60 * 60 * 24)
                );

                const nRemaining = reviewTestSettings.nIntervalDays - nDaysDiff;
                return Math.max(0, nRemaining);
            },

            getReviewTestWords: (nCount: number) =>
            {
                const { wordProgress, settings } = get();

                // 학습한 단어 중에서 선택 (nLevel > 0)
                const aLearnedWordIds = Object.values(wordProgress)
                    .filter((wp) =>
                    {
                        if (wp.nLevel === 0) return false;

                        // 선택한 레벨만 포함
                        const stWord = allWords.find((w) => w.szId === wp.szWordId);
                        return stWord && settings.aSelectedLevels.includes(stWord.nLevel);
                    })
                    .map((wp) => wp.szWordId);

                // 셔플 후 요청 개수만큼 반환
                return aLearnedWordIds
                    .sort(() => Math.random() - 0.5)
                    .slice(0, nCount);
            },

            recordReviewTestResult: (nTotal: number, nCorrect: number, aWeakWordIds: string[]) =>
            {
                const { reviewTestRecords } = get();
                const szToday = getDateKey();

                const stNewRecord: ReviewTestRecord = {
                    szDate: szToday,
                    nTotalQuestions: nTotal,
                    nCorrectAnswers: nCorrect,
                    nAccuracyPercent: nTotal > 0 ? Math.round((nCorrect / nTotal) * 100) : 0,
                    aWeakWords: aWeakWordIds,
                };

                set({
                    reviewTestRecords: [...reviewTestRecords, stNewRecord],
                    reviewTestSettings: {
                        ...get().reviewTestSettings,
                        dtLastTest: szToday,
                    },
                });
            },

            getRecentReviewTests: (nLimit: number) =>
            {
                const { reviewTestRecords } = get();
                return reviewTestRecords
                    .slice(-nLimit)
                    .reverse();  // 최신순
            },

            // ============================================================
            // 연속 학습 (스트릭) 관련 구현
            // ============================================================

            hasLearnedOnDate: (szDate: string) =>
            {
                const { dailyStats, reviewTestRecords } = get();

                // 일일 학습 기록 확인
                const stDayStats = dailyStats[szDate];
                if (stDayStats && stDayStats.nQuestionsAnswered > 0)
                {
                    return true;
                }

                // 복습 테스트 기록 확인
                const bHasReviewTest = reviewTestRecords.some(
                    (record) => record.szDate === szDate
                );

                return bHasReviewTest;
            },

            getCurrentStreak: () =>
            {
                const { hasLearnedOnDate } = get();
                const dtToday = new Date();
                let nStreak = 0;

                // 오늘부터 거꾸로 확인
                for (let i = 0; i < 365; i++)  // 최대 1년까지 확인
                {
                    const dtCheck = new Date(dtToday);
                    dtCheck.setDate(dtCheck.getDate() - i);
                    const szDateKey = dtCheck.toISOString().split('T')[0];

                    if (hasLearnedOnDate(szDateKey))
                    {
                        nStreak++;
                    }
                    else
                    {
                        // 오늘 아직 안했으면 어제부터 카운트
                        if (i === 0)
                        {
                            continue;
                        }
                        break;
                    }
                }

                return nStreak;
            },

            getLongestStreak: () =>
            {
                const { dailyStats, reviewTestRecords } = get();

                // 모든 학습 날짜 수집
                const aLearnedDates = new Set<string>();

                // dailyStats에서 학습한 날짜
                Object.entries(dailyStats).forEach(([szDate, stats]) =>
                {
                    if (stats.nQuestionsAnswered > 0)
                    {
                        aLearnedDates.add(szDate);
                    }
                });

                // reviewTestRecords에서 테스트한 날짜
                reviewTestRecords.forEach((record) =>
                {
                    aLearnedDates.add(record.szDate);
                });

                if (aLearnedDates.size === 0) return 0;

                // 날짜 정렬
                const aSortedDates = Array.from(aLearnedDates).sort();

                let nLongestStreak = 1;
                let nCurrentStreak = 1;

                for (let i = 1; i < aSortedDates.length; i++)
                {
                    const dtPrev = new Date(aSortedDates[i - 1]);
                    const dtCurr = new Date(aSortedDates[i]);

                    // 연속 날짜인지 확인 (하루 차이)
                    const nDiffDays = Math.round(
                        (dtCurr.getTime() - dtPrev.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (nDiffDays === 1)
                    {
                        nCurrentStreak++;
                        nLongestStreak = Math.max(nLongestStreak, nCurrentStreak);
                    }
                    else
                    {
                        nCurrentStreak = 1;
                    }
                }

                return nLongestStreak;
            },

            // ============================================================
            // 백업/복원 관련 구현
            // ============================================================

            importBackupData: (stBackupData: BackupData) =>
            {
                set({
                    wordProgress: stBackupData.wordProgress || {},
                    dailyStats: stBackupData.dailyStats || {},
                    reviewTestRecords: stBackupData.reviewTestRecords || [],
                    settings: {
                        ...get().settings,  // 기존 설정 유지 (API 키 등)
                        ...stBackupData.settings,
                    },
                    reviewTestSettings: stBackupData.reviewTestSettings || get().reviewTestSettings,
                    aExcludedWords: stBackupData.aExcludedWords || [],
                });
            },
        }),
        {
            name: 'hsk-vocab-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
