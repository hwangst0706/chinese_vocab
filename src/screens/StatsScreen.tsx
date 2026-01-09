/**
 * @file StatsScreen
 * @brief 통계 화면
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, getHskLevelColor } from '../contexts/ThemeContext';
import { useAppStore } from '../store';
import { HskLevel } from '../types';
import { levelWordCounts } from '../data';

export default function StatsScreen(): React.JSX.Element
{
    const { colors } = useTheme();
    const { settings, dailyStats, wordProgress, getLevelStats, getTodayStats } = useAppStore();

    const stTodayStats = getTodayStats();

    // 최근 7일 통계
    const aLast7Days = getLast7DaysStats();

    function getLast7DaysStats(): { szDate: string; nQuestions: number; nCorrect: number }[]
    {
        const aResult = [];
        const dtToday = new Date();

        for (let i = 6; i >= 0; i--)
        {
            const dt = new Date(dtToday);
            dt.setDate(dt.getDate() - i);
            const szDateKey = dt.toISOString().split('T')[0];
            const stStats = dailyStats[szDateKey];

            aResult.push({
                szDate: szDateKey,
                nQuestions: stStats?.nQuestionsAnswered || 0,
                nCorrect: stStats?.nCorrectAnswers || 0,
            });
        }

        return aResult;
    }

    // 전체 통계 계산
    const nTotalWords = Object.keys(wordProgress).length;
    const nMasteredWords = Object.values(wordProgress).filter((wp) => wp.bMastered).length;
    const nTotalQuestions = Object.values(dailyStats).reduce(
        (sum, ds) => sum + ds.nQuestionsAnswered,
        0
    );
    const nTotalCorrect = Object.values(dailyStats).reduce(
        (sum, ds) => sum + ds.nCorrectAnswers,
        0
    );
    const nOverallAccuracy = nTotalQuestions > 0
        ? Math.round((nTotalCorrect / nTotalQuestions) * 100)
        : 0;

    // 주간 최대값 (차트 스케일링용)
    const nMaxQuestions = Math.max(...aLast7Days.map((d) => d.nQuestions), 1);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={[styles.title, { color: colors.text }]}>학습 통계</Text>

                {/* 오늘 통계 */}
                <View style={[styles.todayCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>오늘</Text>
                    <View style={styles.todayStats}>
                        <View style={styles.todayStat}>
                            <Text style={[styles.todayStatValue, { color: colors.accent }]}>
                                {stTodayStats.nQuestionsAnswered}
                            </Text>
                            <Text style={[styles.todayStatLabel, { color: colors.textSecondary }]}>문제 풀이</Text>
                        </View>
                        <View style={styles.todayStat}>
                            <Text style={[styles.todayStatValue, { color: colors.accent }]}>
                                {stTodayStats.nCorrectAnswers}
                            </Text>
                            <Text style={[styles.todayStatLabel, { color: colors.textSecondary }]}>정답</Text>
                        </View>
                        <View style={styles.todayStat}>
                            <Text style={[styles.todayStatValue, { color: colors.accent }]}>
                                {stTodayStats.nQuestionsAnswered > 0
                                    ? Math.round(
                                          (stTodayStats.nCorrectAnswers /
                                              stTodayStats.nQuestionsAnswered) *
                                              100
                                      )
                                    : 0}
                                %
                            </Text>
                            <Text style={[styles.todayStatLabel, { color: colors.textSecondary }]}>정답률</Text>
                        </View>
                    </View>
                </View>

                {/* 주간 차트 */}
                <View style={[styles.weeklyCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>최근 7일</Text>
                    <View style={styles.chartContainer}>
                        {aLast7Days.map((day, index) =>
                        {
                            const nHeight = (day.nQuestions / nMaxQuestions) * 100;
                            const szDayLabel = new Date(day.szDate).toLocaleDateString(
                                'ko-KR',
                                { weekday: 'short' }
                            );

                            return (
                                <View key={index} style={styles.chartBar}>
                                    <Text style={[styles.chartValue, { color: colors.textSecondary }]}>
                                        {day.nQuestions > 0 ? day.nQuestions : ''}
                                    </Text>
                                    <View style={styles.barContainer}>
                                        <View
                                            style={[
                                                styles.bar,
                                                {
                                                    height: `${Math.max(nHeight, 5)}%`,
                                                    backgroundColor:
                                                        index === 6
                                                            ? colors.primary
                                                            : colors.surfaceLight,
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>{szDayLabel}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* 전체 통계 */}
                <View style={[styles.overallCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>전체 기록</Text>
                    <View style={styles.overallStats}>
                        <View style={[styles.overallStat, { backgroundColor: colors.surfaceLight }]}>
                            <Text style={[styles.overallStatValue, { color: colors.text }]}>{nTotalQuestions}</Text>
                            <Text style={[styles.overallStatLabel, { color: colors.textSecondary }]}>총 문제 수</Text>
                        </View>
                        <View style={[styles.overallStat, { backgroundColor: colors.surfaceLight }]}>
                            <Text style={[styles.overallStatValue, { color: colors.text }]}>{nOverallAccuracy}%</Text>
                            <Text style={[styles.overallStatLabel, { color: colors.textSecondary }]}>평균 정답률</Text>
                        </View>
                        <View style={[styles.overallStat, { backgroundColor: colors.surfaceLight }]}>
                            <Text style={[styles.overallStatValue, { color: colors.text }]}>{nTotalWords}</Text>
                            <Text style={[styles.overallStatLabel, { color: colors.textSecondary }]}>학습한 단어</Text>
                        </View>
                        <View style={[styles.overallStat, { backgroundColor: colors.surfaceLight }]}>
                            <Text style={[styles.overallStatValue, { color: colors.text }]}>{nMasteredWords}</Text>
                            <Text style={[styles.overallStatLabel, { color: colors.textSecondary }]}>완료 단어</Text>
                        </View>
                    </View>
                </View>

                {/* HSK 급수별 통계 */}
                <View style={[styles.levelCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>급수별 진도</Text>
                    {settings.aSelectedLevels.map((nLevel) =>
                    {
                        const stStats = getLevelStats(nLevel as HskLevel);
                        const nLearnedPercent =
                            stStats.nTotalWords > 0
                                ? Math.round(
                                      (stStats.nLearnedWords / stStats.nTotalWords) * 100
                                  )
                                : 0;
                        const nMasteredPercent =
                            stStats.nTotalWords > 0
                                ? Math.round(
                                      (stStats.nMasteredWords / stStats.nTotalWords) * 100
                                  )
                                : 0;

                        return (
                            <View key={nLevel} style={styles.levelItem}>
                                <View style={styles.levelHeader}>
                                    <Text
                                        style={[
                                            styles.levelTitle,
                                            { color: getHskLevelColor(nLevel, colors) },
                                        ]}
                                    >
                                        HSK {nLevel}
                                    </Text>
                                    <Text style={[styles.levelCount, { color: colors.textSecondary }]}>
                                        {stStats.nTotalWords}개 단어
                                    </Text>
                                </View>

                                <View style={styles.levelProgress}>
                                    <View style={styles.levelProgressRow}>
                                        <Text style={[styles.levelProgressLabel, { color: colors.textSecondary }]}>
                                            학습 ({stStats.nLearnedWords})
                                        </Text>
                                        <View style={[styles.levelProgressBar, { backgroundColor: colors.surfaceLight }]}>
                                            <View
                                                style={[
                                                    styles.levelProgressFill,
                                                    {
                                                        width: `${nLearnedPercent}%`,
                                                        backgroundColor:
                                                            getHskLevelColor(nLevel, colors),
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={[styles.levelProgressPercent, { color: colors.textSecondary }]}>
                                            {nLearnedPercent}%
                                        </Text>
                                    </View>

                                    <View style={styles.levelProgressRow}>
                                        <Text style={[styles.levelProgressLabel, { color: colors.textSecondary }]}>
                                            완료 ({stStats.nMasteredWords})
                                        </Text>
                                        <View style={[styles.levelProgressBar, { backgroundColor: colors.surfaceLight }]}>
                                            <View
                                                style={[
                                                    styles.levelProgressFill,
                                                    {
                                                        width: `${nMasteredPercent}%`,
                                                        backgroundColor: colors.accent,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={[styles.levelProgressPercent, { color: colors.textSecondary }]}>
                                            {nMasteredPercent}%
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    todayCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    todayStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    todayStat: {
        alignItems: 'center',
    },
    todayStatValue: {
        fontSize: 32,
        fontWeight: '700',
    },
    todayStatLabel: {
        fontSize: 14,
        marginTop: 4,
    },
    weeklyCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 150,
    },
    chartBar: {
        flex: 1,
        alignItems: 'center',
    },
    chartValue: {
        fontSize: 12,
        marginBottom: 4,
        height: 16,
    },
    barContainer: {
        width: '60%',
        height: 100,
        justifyContent: 'flex-end',
    },
    bar: {
        width: '100%',
        borderRadius: 4,
    },
    chartLabel: {
        fontSize: 12,
        marginTop: 8,
    },
    overallCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    overallStats: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    overallStat: {
        width: '48%',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    overallStatValue: {
        fontSize: 28,
        fontWeight: '700',
    },
    overallStatLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    levelCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    levelItem: {
        marginBottom: 20,
    },
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    levelTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    levelCount: {
        fontSize: 14,
    },
    levelProgress: {
        gap: 8,
    },
    levelProgressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    levelProgressLabel: {
        fontSize: 12,
        width: 70,
    },
    levelProgressBar: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginHorizontal: 8,
    },
    levelProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    levelProgressPercent: {
        fontSize: 12,
        width: 40,
        textAlign: 'right',
    },
});
