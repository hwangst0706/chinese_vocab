/**
 * @file HomeScreen
 * @brief 메인 홈 화면 - 일일 목표, 퀴즈 시작
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, hskLevelColors } from '../constants/colors';
import { useAppStore } from '../store';
import { HskLevel } from '../types';

export default function HomeScreen(): React.JSX.Element
{
    const navigation = useNavigation<any>();
    const {
        settings,
        getTodayStats,
        getWordsToReview,
        getLevelStats,
    } = useAppStore();

    const stTodayStats = getTodayStats();
    const aReviewWords = getWordsToReview();
    const nProgress = Math.min(
        (stTodayStats.nQuestionsAnswered / settings.nDailyGoal) * 100,
        100
    );

    const handleStartQuiz = (): void =>
    {
        navigation.navigate('Quiz');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 헤더 */}
                <View style={styles.header}>
                    <Text style={styles.title}>HSK 단어 암기</Text>
                    <Text style={styles.subtitle}>오늘도 화이팅! 🔥</Text>
                </View>

                {/* 일일 목표 카드 */}
                <View style={styles.dailyCard}>
                    <Text style={styles.dailyCardTitle}>오늘의 목표</Text>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${nProgress}%` },
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {stTodayStats.nQuestionsAnswered} / {settings.nDailyGoal}
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stTodayStats.nCorrectAnswers}</Text>
                            <Text style={styles.statLabel}>정답</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stTodayStats.nNewWordsLearned}</Text>
                            <Text style={styles.statLabel}>새 단어</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{aReviewWords.length}</Text>
                            <Text style={styles.statLabel}>복습 대기</Text>
                        </View>
                    </View>
                </View>

                {/* HSK 레벨별 진도 */}
                <View style={styles.levelSection}>
                    <Text style={styles.sectionTitle}>학습 진도</Text>
                    {settings.aSelectedLevels.map((nLevel) =>
                    {
                        const stStats = getLevelStats(nLevel as HskLevel);
                        const nPercent = stStats.nTotalWords > 0
                            ? Math.round((stStats.nLearnedWords / stStats.nTotalWords) * 100)
                            : 0;

                        return (
                            <View key={nLevel} style={styles.levelItem}>
                                <View style={styles.levelHeader}>
                                    <View style={styles.levelBadge}>
                                        <Text
                                            style={[
                                                styles.levelBadgeText,
                                                { color: hskLevelColors[nLevel] },
                                            ]}
                                        >
                                            HSK {nLevel}
                                        </Text>
                                    </View>
                                    <Text style={styles.levelPercent}>{nPercent}%</Text>
                                </View>
                                <View style={styles.levelProgressBar}>
                                    <View
                                        style={[
                                            styles.levelProgressFill,
                                            {
                                                width: `${nPercent}%`,
                                                backgroundColor: hskLevelColors[nLevel],
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={styles.levelDetail}>
                                    {stStats.nLearnedWords} / {stStats.nTotalWords} 단어
                                    {stStats.nMasteredWords > 0 && ` (${stStats.nMasteredWords} 완료)`}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* 퀴즈 시작 버튼 */}
                <TouchableOpacity style={styles.startButton} onPress={handleStartQuiz}>
                    <Text style={styles.startButtonText}>학습 시작</Text>
                    <Text style={styles.startButtonSubtext}>
                        {aReviewWords.length > 0
                            ? `복습 ${aReviewWords.length}개 + 새 단어`
                            : '새 단어 학습'}
                    </Text>
                </TouchableOpacity>
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
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: {
        fontSize: 18,
        color: colors.textSecondary,
        marginTop: 4,
    },
    dailyCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    dailyCardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    progressContainer: {
        marginBottom: 20,
    },
    progressBar: {
        height: 12,
        backgroundColor: colors.surfaceLight,
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 6,
    },
    progressText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'right',
        marginTop: 8,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.accent,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    levelSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    levelItem: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    levelBadge: {
        backgroundColor: colors.surfaceLight,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    levelBadgeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    levelPercent: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    levelProgressBar: {
        height: 6,
        backgroundColor: colors.surfaceLight,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    levelProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    levelDetail: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    startButton: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 20,
        alignItems: 'center',
        marginTop: 8,
    },
    startButtonText: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
    },
    startButtonSubtext: {
        fontSize: 14,
        color: colors.text,
        opacity: 0.8,
        marginTop: 4,
    },
});
