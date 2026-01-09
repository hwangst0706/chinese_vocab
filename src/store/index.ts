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
} from '../types';
import { allWords, getWordsByLevel, levelWordCounts } from '../data';

// SRS 간격 (일 단위): 레벨별 다음 복습까지의 일수
const SRS_INTERVALS = [0, 1, 3, 7, 14, 30];

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
            },

            aExcludedWords: [],

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

                let stNewProgress: WordProgress;

                if (bCorrect)
                {
                    const nNewLevel = stExisting
                        ? Math.min(stExisting.nLevel + 1, SRS_INTERVALS.length - 1)
                        : 1;

                    const nDaysUntilReview = SRS_INTERVALS[nNewLevel];
                    const dtNext = new Date();
                    dtNext.setDate(dtNext.getDate() + nDaysUntilReview);

                    stNewProgress = {
                        szWordId,
                        nLevel: nNewLevel,
                        nCorrectCount: (stExisting?.nCorrectCount || 0) + 1,
                        nWrongCount: stExisting?.nWrongCount || 0,
                        dtNextReview: dtNext.toISOString(),
                        dtLastReview: new Date().toISOString(),
                        bMastered: nNewLevel >= SRS_INTERVALS.length - 1,
                    };
                }
                else
                {
                    // 오답: 레벨 1로 리셋
                    const dtNext = new Date();
                    dtNext.setDate(dtNext.getDate() + 1);

                    stNewProgress = {
                        szWordId,
                        nLevel: 1,
                        nCorrectCount: stExisting?.nCorrectCount || 0,
                        nWrongCount: (stExisting?.nWrongCount || 0) + 1,
                        dtNextReview: dtNext.toISOString(),
                        dtLastReview: new Date().toISOString(),
                        bMastered: false,
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
        }),
        {
            name: 'hsk-vocab-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
