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
import { colors, hskLevelColors } from '../constants/colors';
import { useAppStore } from '../store';
import { HskLevel } from '../types';
import { levelWordCounts } from '../data';

export default function StatsScreen(): React.JSX.Element
{
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
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={styles.title}>학습 통계</Text>

                {/* 오늘 통계 */}
                <View style={styles.todayCard}>
                    <Text style={styles.sectionTitle}>오늘</Text>
                    <View style={styles.todayStats}>
                        <View style={styles.todayStat}>
                            <Text style={styles.todayStatValue}>
                                {stTodayStats.nQuestionsAnswered}
                            </Text>
                            <Text style={styles.todayStatLabel}>문제 풀이</Text>
                        </View>
                        <View style={styles.todayStat}>
                            <Text style={styles.todayStatValue}>
                                {stTodayStats.nCorrectAnswers}
                            </Text>
                            <Text style={styles.todayStatLabel}>정답</Text>
                        </View>
                        <View style={styles.todayStat}>
                            <Text style={styles.todayStatValue}>
                                {stTodayStats.nQuestionsAnswered > 0
                                    ? Math.round(
                                          (stTodayStats.nCorrectAnswers /
                                              stTodayStats.nQuestionsAnswered) *
                                              100
                                      )
                                    : 0}
                                %
                            </Text>
                            <Text style={styles.todayStatLabel}>정답률</Text>
                        </View>
                    </View>
                </View>

                {/* 주간 차트 */}
                <View style={styles.weeklyCard}>
                    <Text style={styles.sectionTitle}>최근 7일</Text>
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
                                    <Text style={styles.chartValue}>
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
                                    <Text style={styles.chartLabel}>{szDayLabel}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* 전체 통계 */}
                <View style={styles.overallCard}>
                    <Text style={styles.sectionTitle}>전체 기록</Text>
                    <View style={styles.overallStats}>
                        <View style={styles.overallStat}>
                            <Text style={styles.overallStatValue}>{nTotalQuestions}</Text>
                            <Text style={styles.overallStatLabel}>총 문제 수</Text>
                        </View>
                        <View style={styles.overallStat}>
                            <Text style={styles.overallStatValue}>{nOverallAccuracy}%</Text>
                            <Text style={styles.overallStatLabel}>평균 정답률</Text>
                        </View>
                        <View style={styles.overallStat}>
                            <Text style={styles.overallStatValue}>{nTotalWords}</Text>
                            <Text style={styles.overallStatLabel}>학습한 단어</Text>
                        </View>
                        <View style={styles.overallStat}>
                            <Text style={styles.overallStatValue}>{nMasteredWords}</Text>
                            <Text style={styles.overallStatLabel}>완료 단어</Text>
                        </View>
                    </View>
                </View>

                {/* HSK 급수별 통계 */}
                <View style={styles.levelCard}>
                    <Text style={styles.sectionTitle}>급수별 진도</Text>
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
                                            { color: hskLevelColors[nLevel] },
                                        ]}
                                    >
                                        HSK {nLevel}
                                    </Text>
                                    <Text style={styles.levelCount}>
                                        {stStats.nTotalWords}개 단어
                                    </Text>
                                </View>

                                <View style={styles.levelProgress}>
                                    <View style={styles.levelProgressRow}>
                                        <Text style={styles.levelProgressLabel}>
                                            학습 ({stStats.nLearnedWords})
                                        </Text>
                                        <View style={styles.levelProgressBar}>
                                            <View
                                                style={[
                                                    styles.levelProgressFill,
                                                    {
                                                        width: `${nLearnedPercent}%`,
                                                        backgroundColor:
                                                            hskLevelColors[nLevel],
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.levelProgressPercent}>
                                            {nLearnedPercent}%
                                        </Text>
                                    </View>

                                    <View style={styles.levelProgressRow}>
                                        <Text style={styles.levelProgressLabel}>
                                            완료 ({stStats.nMasteredWords})
                                        </Text>
                                        <View style={styles.levelProgressBar}>
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
                                        <Text style={styles.levelProgressPercent}>
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
        backgroundColor: colors.background,
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
        color: colors.text,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    todayCard: {
        backgroundColor: colors.surface,
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
        color: colors.accent,
    },
    todayStatLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    weeklyCard: {
        backgroundColor: colors.surface,
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
        color: colors.textSecondary,
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
        color: colors.textSecondary,
        marginTop: 8,
    },
    overallCard: {
        backgroundColor: colors.surface,
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
        backgroundColor: colors.surfaceLight,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    overallStatValue: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
    },
    overallStatLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    levelCard: {
        backgroundColor: colors.surface,
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
        color: colors.textSecondary,
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
        color: colors.textSecondary,
        width: 70,
    },
    levelProgressBar: {
        flex: 1,
        height: 8,
        backgroundColor: colors.surfaceLight,
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
        color: colors.textSecondary,
        width: 40,
        textAlign: 'right',
    },
});
