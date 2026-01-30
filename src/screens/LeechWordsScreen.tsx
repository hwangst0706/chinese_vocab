/**
 * @file LeechWordsScreen
 * @brief Leech 단어 관리 화면 - 반복적으로 틀리는 단어 특별 관리
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, getHskLevelColor } from '../contexts/ThemeContext';
import { useAppStore } from '../store';
import { getWordById } from '../data';
import { Word, WordProgress } from '../types';

interface LeechWordItem
{
    word: Word;
    progress: WordProgress;
}

export default function LeechWordsScreen(): React.JSX.Element
{
    const navigation = useNavigation<any>();
    const { colors } = useTheme();
    const {
        getLeechWords,
        toggleWordExclusion,
        isWordExcluded,
        resetLeechStatus,
    } = useAppStore();

    const [nRefreshKey, setRefreshKey] = useState(0);

    const aLeechWords = getLeechWords();

    const aLeechWordItems: LeechWordItem[] = aLeechWords
        .map((progress) =>
        {
            const word = getWordById(progress.szWordId);
            return word ? { word, progress } : null;
        })
        .filter((item): item is LeechWordItem => item !== null);

    // Leech 상태 해제
    const handleResetLeech = (szWordId: string, szHanzi: string): void =>
    {
        Alert.alert(
            'Leech 상태 해제',
            `"${szHanzi}" 단어의 Leech 상태를 해제하시겠습니까?\n\n다시 오답이 누적되면 Leech로 재분류됩니다.`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '해제',
                    onPress: () =>
                    {
                        resetLeechStatus(szWordId);
                        setRefreshKey((prev) => prev + 1);
                    },
                },
            ]
        );
    };

    // 퀴즈 제외/포함 토글
    const handleToggleExclusion = (szWordId: string): void =>
    {
        toggleWordExclusion(szWordId);
        setRefreshKey((prev) => prev + 1);
    };

    // 전체 Leech 상태 해제
    const handleResetAllLeech = (): void =>
    {
        if (aLeechWordItems.length === 0) return;

        Alert.alert(
            '전체 Leech 상태 해제',
            `${aLeechWordItems.length}개 단어의 Leech 상태를 모두 해제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '전체 해제',
                    style: 'destructive',
                    onPress: () =>
                    {
                        aLeechWordItems.forEach((item) =>
                        {
                            resetLeechStatus(item.progress.szWordId);
                        });
                        setRefreshKey((prev) => prev + 1);
                    },
                },
            ]
        );
    };

    // 집중 복습 시작
    const handleFocusReview = (): void =>
    {
        if (aLeechWordItems.length === 0)
        {
            Alert.alert('알림', 'Leech 단어가 없습니다.');
            return;
        }

        const aWordIds = aLeechWordItems.map((item) => item.progress.szWordId);
        navigation.navigate('Quiz', {
            aFocusedWordIds: aWordIds,
            szFocusedMode: 'leech_words',
        });
    };

    const renderItem = ({ item }: { item: LeechWordItem }): React.JSX.Element =>
    {
        const nAccuracy = item.progress.nCorrectCount + item.progress.nWrongCount > 0
            ? Math.round(
                  (item.progress.nCorrectCount /
                      (item.progress.nCorrectCount + item.progress.nWrongCount)) *
                      100
              )
            : 0;

        const fEasiness = item.progress.fEasiness ?? 2.5;
        const bIsExcluded = isWordExcluded(item.progress.szWordId);

        return (
            <View style={[
                styles.wordCard,
                { backgroundColor: colors.surface },
                bIsExcluded && { opacity: 0.6 },
            ]}>
                <View style={styles.wordInfo}>
                    <View style={styles.wordHeader}>
                        <Text style={[styles.hanzi, { color: colors.text }]}>{item.word.szHanzi}</Text>
                        <View
                            style={[
                                styles.levelBadge,
                                { backgroundColor: getHskLevelColor(item.word.nLevel, colors) },
                            ]}
                        >
                            <Text style={styles.levelText}>HSK {item.word.nLevel}</Text>
                        </View>
                        <View style={[styles.leechBadge, { backgroundColor: colors.wrong }]}>
                            <Text style={styles.leechBadgeText}>LEECH</Text>
                        </View>
                    </View>
                    <Text style={[styles.pinyin, { color: colors.primary }]}>{item.word.szPinyin}</Text>
                    <Text style={[styles.meaning, { color: colors.textSecondary }]}>{item.word.szMeaning}</Text>

                    {/* 통계 */}
                    <View style={styles.statsRow}>
                        <Text style={[styles.statText, { color: colors.wrong }]}>
                            오답 {item.progress.nWrongCount}회
                        </Text>
                        <Text style={[styles.statText, { color: colors.textMuted }]}>|</Text>
                        <Text style={[styles.statText, { color: colors.correct }]}>
                            정답 {item.progress.nCorrectCount}회
                        </Text>
                        <Text style={[styles.statText, { color: colors.textMuted }]}>|</Text>
                        <Text style={[styles.statText, { color: nAccuracy < 50 ? colors.wrong : colors.textMuted }]}>
                            정답률 {nAccuracy}%
                        </Text>
                    </View>

                    <Text style={[styles.efText, { color: colors.textMuted }]}>
                        난이도: {fEasiness.toFixed(2)} (어려움)
                    </Text>
                </View>

                {/* 액션 버튼 */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surfaceLight }]}
                        onPress={() => handleToggleExclusion(item.progress.szWordId)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.actionButtonText, { color: bIsExcluded ? colors.correct : colors.textSecondary }]}>
                            {bIsExcluded ? '포함' : '제외'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surfaceLight }]}
                        onPress={() => handleResetLeech(item.progress.szWordId, item.word.szHanzi)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.actionButtonText, { color: colors.primary }]}>해제</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderEmptyList = (): React.JSX.Element => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>Leech 단어가 없습니다</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                반복적으로 틀리는 단어가 여기에 표시됩니다
            </Text>
        </View>
    );

    const renderHeader = (): React.JSX.Element => (
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Leech 단어란?</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                8회 이상 틀리거나, 정답률이 50% 미만인 단어입니다.
                {'\n'}이런 단어는 다른 학습법을 시도해보세요:
            </Text>
            <View style={styles.tipsList}>
                <Text style={[styles.tipItem, { color: colors.textSecondary }]}>• 예문과 함께 문맥 학습</Text>
                <Text style={[styles.tipItem, { color: colors.textSecondary }]}>• 손으로 직접 써보기</Text>
                <Text style={[styles.tipItem, { color: colors.textSecondary }]}>• 발음 따라 읽기 연습</Text>
                <Text style={[styles.tipItem, { color: colors.textSecondary }]}>• 연상 기억법 활용</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[styles.backButton, { color: colors.primary }]}>← 뒤로</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Leech 단어 관리</Text>
                <View style={styles.placeholder} />
            </View>

            {/* 상단 액션 바 */}
            {aLeechWordItems.length > 0 && (
                <View style={[styles.actionBar, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.countText, { color: colors.textSecondary }]}>
                        {aLeechWordItems.length}개 단어
                    </Text>
                    <View style={styles.actionBarButtons}>
                        <TouchableOpacity
                            style={[styles.headerButton, { backgroundColor: colors.surfaceLight }]}
                            onPress={handleResetAllLeech}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>
                                전체 해제
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.headerButton, { backgroundColor: colors.primary }]}
                            onPress={handleFocusReview}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.headerButtonTextWhite}>집중 복습</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <FlatList
                key={nRefreshKey}
                data={aLeechWordItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.progress.szWordId}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmptyList}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        fontSize: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    placeholder: {
        width: 50,
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    countText: {
        fontSize: 14,
    },
    actionBarButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    headerButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
    },
    headerButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    headerButtonTextWhite: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    infoSection: {
        margin: 20,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 20,
    },
    tipsList: {
        marginTop: 12,
    },
    tipItem: {
        fontSize: 13,
        lineHeight: 22,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    wordCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
    },
    wordInfo: {
        flex: 1,
    },
    wordHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    hanzi: {
        fontSize: 22,
        fontWeight: '700',
        marginRight: 8,
    },
    levelBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    levelText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    leechBadge: {
        marginLeft: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    leechBadgeText: {
        fontSize: 8,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    pinyin: {
        fontSize: 14,
        marginBottom: 2,
    },
    meaning: {
        fontSize: 14,
        marginBottom: 8,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    statText: {
        fontSize: 12,
    },
    efText: {
        fontSize: 11,
    },
    actionButtons: {
        flexDirection: 'column',
        gap: 6,
        marginLeft: 12,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 50,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: 'center',
    },
});
