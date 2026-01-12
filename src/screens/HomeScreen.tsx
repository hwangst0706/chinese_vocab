/**
 * @file HomeScreen
 * @brief 메인 홈 화면 - 일일 목표, 퀴즈 시작
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, getHskLevelColor } from '../contexts/ThemeContext';
import { useAppStore } from '../store';
import { HskLevel } from '../types';
import CalendarModal from '../components/CalendarModal';

export default function HomeScreen(): React.JSX.Element
{
    const navigation = useNavigation<any>();
    const { colors } = useTheme();
    const {
        settings,
        getTodayStats,
        getWordsToReview,
        getLevelStats,
        isReviewTestDue,
        getDaysUntilReviewTest,
        reviewTestSettings,
        getCurrentStreak,
        getLongestStreak,
        hasLearnedOnDate,
    } = useAppStore();

    const stTodayStats = getTodayStats();
    const aReviewWords = getWordsToReview();
    const bReviewTestDue = isReviewTestDue();
    const nDaysUntilTest = getDaysUntilReviewTest();
    const nCurrentStreak = getCurrentStreak();
    const nLongestStreak = getLongestStreak();

    const [bShowCalendar, setShowCalendar] = useState(false);

    // 단어 수 기준 진도 계산 (퀴즈 3개 = 단어 1개)
    const nTotalQuizCount = settings.nDailyGoal * 3;
    const nWordsCompleted = Math.floor(stTodayStats.nQuestionsAnswered / 3);
    const nProgress = Math.min(
        (stTodayStats.nQuestionsAnswered / nTotalQuizCount) * 100,
        100
    );

    const handleStartQuiz = (): void =>
    {
        navigation.navigate('Quiz');
    };

    const handleStartReviewTest = (): void =>
    {
        navigation.navigate('ReviewQuiz');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 헤더 */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>HSK 단어 암기</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        오늘도 화이팅! 🔥
                    </Text>
                </View>

                {/* 연속 학습 카드 */}
                <TouchableOpacity
                    style={[styles.streakCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
                    onPress={() => setShowCalendar(true)}
                    activeOpacity={0.8}
                >
                    <View style={styles.streakMain}>
                        <Text style={styles.streakFireIcon}>🔥</Text>
                        <View style={styles.streakInfo}>
                            <Text style={[styles.streakCount, { color: colors.accent }]}>
                                {nCurrentStreak}
                            </Text>
                            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                                일 연속 학습
                            </Text>
                        </View>
                        {nLongestStreak > nCurrentStreak && (
                            <View style={[styles.streakBest, { backgroundColor: colors.surfaceLight }]}>
                                <Text style={[styles.streakBestText, { color: colors.textSecondary }]}>
                                    최장 {nLongestStreak}일
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* 최근 7일 표시 */}
                    <View style={styles.streakWeek}>
                        {Array.from({ length: 7 }).map((_, i) =>
                        {
                            const dtCheck = new Date();
                            dtCheck.setDate(dtCheck.getDate() - (6 - i));
                            const szDateKey = dtCheck.toISOString().split('T')[0];
                            const bLearned = hasLearnedOnDate(szDateKey);
                            const bIsToday = i === 6;
                            const aDayNames = ['일', '월', '화', '수', '목', '금', '토'];
                            const szDayName = aDayNames[dtCheck.getDay()];

                            return (
                                <View key={i} style={styles.streakDay}>
                                    <Text style={[styles.streakDayName, { color: colors.textMuted }]}>
                                        {szDayName}
                                    </Text>
                                    <View
                                        style={[
                                            styles.streakDot,
                                            {
                                                backgroundColor: bLearned ? colors.accent : colors.surfaceLight,
                                                borderWidth: bIsToday ? 2 : 0,
                                                borderColor: colors.primary,
                                            },
                                        ]}
                                    >
                                        {bLearned && <Text style={styles.streakCheck}>✓</Text>}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* 달력 보기 힌트 */}
                    <Text style={[styles.streakHint, { color: colors.textMuted }]}>
                        탭하여 월별 현황 보기
                    </Text>
                </TouchableOpacity>

                {/* 일일 목표 카드 */}
                <View style={[styles.dailyCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                    <Text style={[styles.dailyCardTitle, { color: colors.text }]}>오늘의 목표</Text>

                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { backgroundColor: colors.surfaceLight }]}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${nProgress}%`, backgroundColor: colors.primary },
                                ]}
                            />
                        </View>
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                            {nWordsCompleted} / {settings.nDailyGoal} 단어 ({stTodayStats.nQuestionsAnswered}문제)
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.accent }]}>
                                {stTodayStats.nCorrectAnswers}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>정답</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.accent }]}>
                                {stTodayStats.nNewWordsLearned}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>새 단어</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.accent }]}>
                                {aReviewWords.length}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>복습 대기</Text>
                        </View>
                    </View>
                </View>

                {/* 퀴즈 시작 버튼 */}
                <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: colors.primary, shadowColor: colors.shadow }]}
                    onPress={handleStartQuiz}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.startButtonText, { color: '#FFFFFF' }]}>학습 시작</Text>
                    <Text style={[styles.startButtonSubtext, { color: 'rgba(255,255,255,0.8)' }]}>
                        {aReviewWords.length > 0
                            ? `복습 ${aReviewWords.length}개 + 새 단어`
                            : '새 단어 학습'}
                    </Text>
                </TouchableOpacity>

                {/* 복습 테스트 카드 */}
                {nDaysUntilTest >= 0 && (
                    <TouchableOpacity
                        style={[
                            styles.reviewTestCard,
                            {
                                backgroundColor: bReviewTestDue ? colors.accent : colors.surface,
                                shadowColor: colors.shadow,
                            },
                        ]}
                        onPress={bReviewTestDue ? handleStartReviewTest : undefined}
                        activeOpacity={bReviewTestDue ? 0.8 : 1}
                        disabled={!bReviewTestDue}
                    >
                        <View style={styles.reviewTestContent}>
                            <Text style={[
                                styles.reviewTestIcon,
                                { opacity: bReviewTestDue ? 1 : 0.5 }
                            ]}>
                                📝
                            </Text>
                            <View style={styles.reviewTestTextContainer}>
                                <Text style={[
                                    styles.reviewTestTitle,
                                    { color: bReviewTestDue ? '#FFFFFF' : colors.text }
                                ]}>
                                    {bReviewTestDue ? '복습 테스트 시작!' : '복습 테스트'}
                                </Text>
                                <Text style={[
                                    styles.reviewTestSubtext,
                                    { color: bReviewTestDue ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                                ]}>
                                    {bReviewTestDue
                                        ? `${reviewTestSettings.nQuestionCount}문제 · 빈칸채우기, 듣기, 병음입력`
                                        : `${nDaysUntilTest}일 후 테스트 가능`}
                                </Text>
                            </View>
                            {bReviewTestDue && (
                                <Text style={styles.reviewTestArrow}>→</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {/* HSK 레벨별 진도 */}
                <View style={styles.levelSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>학습 진도</Text>
                    {settings.aSelectedLevels.map((nLevel) =>
                    {
                        const stStats = getLevelStats(nLevel as HskLevel);
                        const nPercent = stStats.nTotalWords > 0
                            ? Math.round((stStats.nLearnedWords / stStats.nTotalWords) * 100)
                            : 0;
                        const levelColor = getHskLevelColor(nLevel, colors);

                        return (
                            <View
                                key={nLevel}
                                style={[styles.levelItem, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
                            >
                                <View style={styles.levelHeader}>
                                    <View style={[styles.levelBadge, { backgroundColor: colors.surfaceLight }]}>
                                        <Text style={[styles.levelBadgeText, { color: levelColor }]}>
                                            HSK {nLevel}
                                        </Text>
                                    </View>
                                    <Text style={[styles.levelPercent, { color: colors.text }]}>{nPercent}%</Text>
                                </View>
                                <View style={[styles.levelProgressBar, { backgroundColor: colors.surfaceLight }]}>
                                    <View
                                        style={[
                                            styles.levelProgressFill,
                                            { width: `${nPercent}%`, backgroundColor: levelColor },
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.levelDetail, { color: colors.textSecondary }]}>
                                    {stStats.nLearnedWords} / {stStats.nTotalWords} 단어
                                    {stStats.nMasteredWords > 0 && ` (${stStats.nMasteredWords} 완료)`}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* 달력 모달 */}
            <CalendarModal
                bVisible={bShowCalendar}
                onClose={() => setShowCalendar(false)}
            />
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
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 18,
        marginTop: 4,
    },
    dailyCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    dailyCardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    progressContainer: {
        marginBottom: 20,
    },
    progressBar: {
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 6,
    },
    progressText: {
        fontSize: 14,
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
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    levelSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    levelItem: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    levelBadge: {
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
    },
    levelProgressBar: {
        height: 6,
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
    },
    startButton: {
        borderRadius: 20,
        paddingVertical: 20,
        alignItems: 'center',
        marginBottom: 24,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    startButtonText: {
        fontSize: 22,
        fontWeight: '700',
    },
    startButtonSubtext: {
        fontSize: 14,
        marginTop: 4,
    },
    reviewTestCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    reviewTestContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewTestIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    reviewTestTextContainer: {
        flex: 1,
    },
    reviewTestTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    reviewTestSubtext: {
        fontSize: 13,
        marginTop: 2,
    },
    reviewTestArrow: {
        fontSize: 24,
        color: '#FFFFFF',
        fontWeight: '300',
    },
    // 연속 학습 카드
    streakCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    streakMain: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    streakFireIcon: {
        fontSize: 40,
        marginRight: 12,
    },
    streakInfo: {
        flex: 1,
    },
    streakCount: {
        fontSize: 36,
        fontWeight: '800',
    },
    streakLabel: {
        fontSize: 14,
        marginTop: -4,
    },
    streakBest: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    streakBestText: {
        fontSize: 12,
        fontWeight: '600',
    },
    streakWeek: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    streakDay: {
        alignItems: 'center',
    },
    streakDayName: {
        fontSize: 12,
        marginBottom: 6,
    },
    streakDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    streakCheck: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    streakHint: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 12,
    },
});
