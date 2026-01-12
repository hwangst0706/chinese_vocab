/**
 * @file CalendarModal
 * @brief 월별 학습 현황 달력 모달
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store';

interface CalendarModalProps
{
    bVisible: boolean;
    onClose: () => void;
}

export default function CalendarModal({ bVisible, onClose }: CalendarModalProps): React.JSX.Element
{
    const { colors } = useTheme();
    const { hasLearnedOnDate, dailyStats, reviewTestRecords } = useAppStore();

    const [dtCurrentMonth, setCurrentMonth] = useState(new Date());

    const nYear = dtCurrentMonth.getFullYear();
    const nMonth = dtCurrentMonth.getMonth();

    // 월 이동
    const handlePrevMonth = (): void =>
    {
        const dtNew = new Date(nYear, nMonth - 1, 1);
        setCurrentMonth(dtNew);
    };

    const handleNextMonth = (): void =>
    {
        const dtNew = new Date(nYear, nMonth + 1, 1);
        setCurrentMonth(dtNew);
    };

    // 달력 데이터 생성
    const generateCalendarDays = (): (number | null)[][] =>
    {
        const dtFirstDay = new Date(nYear, nMonth, 1);
        const nFirstDayOfWeek = dtFirstDay.getDay(); // 0 = Sunday
        const nDaysInMonth = new Date(nYear, nMonth + 1, 0).getDate();

        const aWeeks: (number | null)[][] = [];
        let aCurrentWeek: (number | null)[] = [];

        // 첫 주 빈 칸 채우기
        for (let i = 0; i < nFirstDayOfWeek; i++)
        {
            aCurrentWeek.push(null);
        }

        // 날짜 채우기
        for (let nDay = 1; nDay <= nDaysInMonth; nDay++)
        {
            aCurrentWeek.push(nDay);

            if (aCurrentWeek.length === 7)
            {
                aWeeks.push(aCurrentWeek);
                aCurrentWeek = [];
            }
        }

        // 마지막 주 빈 칸 채우기
        if (aCurrentWeek.length > 0)
        {
            while (aCurrentWeek.length < 7)
            {
                aCurrentWeek.push(null);
            }
            aWeeks.push(aCurrentWeek);
        }

        return aWeeks;
    };

    // 특정 날짜의 학습 정보 가져오기
    const getDayInfo = (nDay: number): { bLearned: boolean; nQuestions: number; bHasTest: boolean } =>
    {
        const szDate = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(nDay).padStart(2, '0')}`;
        const bLearned = hasLearnedOnDate(szDate);
        const stStats = dailyStats[szDate];
        const nQuestions = stStats?.nQuestionsAnswered || 0;
        const bHasTest = reviewTestRecords.some((r) => r.szDate === szDate);

        return { bLearned, nQuestions, bHasTest };
    };

    // 오늘 날짜 확인
    const isToday = (nDay: number): boolean =>
    {
        const dtToday = new Date();
        return (
            dtToday.getFullYear() === nYear &&
            dtToday.getMonth() === nMonth &&
            dtToday.getDate() === nDay
        );
    };

    // 이번 달 통계 계산
    const getMonthStats = (): { nLearnedDays: number; nTotalQuestions: number; nTests: number } =>
    {
        let nLearnedDays = 0;
        let nTotalQuestions = 0;
        let nTests = 0;
        const nDaysInMonth = new Date(nYear, nMonth + 1, 0).getDate();

        for (let nDay = 1; nDay <= nDaysInMonth; nDay++)
        {
            const stInfo = getDayInfo(nDay);
            if (stInfo.bLearned) nLearnedDays++;
            nTotalQuestions += stInfo.nQuestions;
            if (stInfo.bHasTest) nTests++;
        }

        return { nLearnedDays, nTotalQuestions, nTests };
    };

    const aWeeks = generateCalendarDays();
    const stMonthStats = getMonthStats();
    const aDayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const aMonthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    return (
        <Modal
            visible={bVisible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    style={[styles.modalContainer, { backgroundColor: colors.surface }]}
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* 헤더 */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={[styles.navButton, { backgroundColor: colors.surfaceLight }]}
                            onPress={handlePrevMonth}
                        >
                            <Text style={[styles.navButtonText, { color: colors.text }]}>←</Text>
                        </TouchableOpacity>
                        <Text style={[styles.monthTitle, { color: colors.text }]}>
                            {nYear}년 {aMonthNames[nMonth]}
                        </Text>
                        <TouchableOpacity
                            style={[styles.navButton, { backgroundColor: colors.surfaceLight }]}
                            onPress={handleNextMonth}
                        >
                            <Text style={[styles.navButtonText, { color: colors.text }]}>→</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 요일 헤더 */}
                    <View style={styles.weekHeader}>
                        {aDayNames.map((szDay, i) => (
                            <View key={i} style={styles.dayCell}>
                                <Text
                                    style={[
                                        styles.dayHeaderText,
                                        { color: i === 0 ? colors.wrong : (i === 6 ? colors.primary : colors.textSecondary) },
                                    ]}
                                >
                                    {szDay}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* 달력 */}
                    <View style={styles.calendar}>
                        {aWeeks.map((aWeek, nWeekIdx) => (
                            <View key={nWeekIdx} style={styles.weekRow}>
                                {aWeek.map((nDay, nDayIdx) =>
                                {
                                    if (nDay === null)
                                    {
                                        return <View key={nDayIdx} style={styles.dayCell} />;
                                    }

                                    const stInfo = getDayInfo(nDay);
                                    const bIsToday = isToday(nDay);

                                    return (
                                        <View key={nDayIdx} style={styles.dayCell}>
                                            <View
                                                style={[
                                                    styles.dayCircle,
                                                    stInfo.bLearned && { backgroundColor: colors.accent },
                                                    bIsToday && !stInfo.bLearned && {
                                                        borderWidth: 2,
                                                        borderColor: colors.primary,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.dayText,
                                                        { color: stInfo.bLearned ? '#FFFFFF' : colors.text },
                                                        bIsToday && !stInfo.bLearned && { color: colors.primary, fontWeight: '700' },
                                                    ]}
                                                >
                                                    {nDay}
                                                </Text>
                                            </View>
                                            {stInfo.bHasTest && (
                                                <View style={[styles.testBadge, { backgroundColor: colors.primary }]}>
                                                    <Text style={styles.testBadgeText}>T</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>

                    {/* 월 통계 */}
                    <View style={[styles.statsContainer, { backgroundColor: colors.surfaceLight }]}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.accent }]}>
                                {stMonthStats.nLearnedDays}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                학습일
                            </Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.accent }]}>
                                {stMonthStats.nTotalQuestions}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                문제
                            </Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.accent }]}>
                                {stMonthStats.nTests}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                복습테스트
                            </Text>
                        </View>
                    </View>

                    {/* 범례 */}
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                            <Text style={[styles.legendText, { color: colors.textSecondary }]}>학습 완료</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.primary }]}>
                                <Text style={styles.legendBadgeText}>T</Text>
                            </View>
                            <Text style={[styles.legendText, { color: colors.textSecondary }]}>복습 테스트</Text>
                        </View>
                    </View>

                    {/* 닫기 버튼 */}
                    <TouchableOpacity
                        style={[styles.closeButton, { backgroundColor: colors.primary }]}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>닫기</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navButtonText: {
        fontSize: 20,
        fontWeight: '600',
    },
    monthTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    weekHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    calendar: {
        marginBottom: 16,
    },
    weekRow: {
        flexDirection: 'row',
    },
    dayCell: {
        flex: 1,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    dayHeaderText: {
        fontSize: 13,
        fontWeight: '600',
    },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
    },
    testBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    testBadgeText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: '800',
    },
    statsContainer: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: '100%',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    legendBadgeText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: '800',
    },
    legendText: {
        fontSize: 12,
    },
    closeButton: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
