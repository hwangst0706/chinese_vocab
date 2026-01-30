/**
 * @file MostWrongWordsScreen
 * @brief 가장 많이 틀린 단어 목록 화면
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, getHskLevelColor } from '../contexts/ThemeContext';
import { useAppStore } from '../store';
import { getWordById } from '../data';
import { Word, WordProgress } from '../types';

interface WrongWordItem
{
    word: Word;
    progress: WordProgress;
}

export default function MostWrongWordsScreen(): React.JSX.Element
{
    const navigation = useNavigation<any>();
    const { colors } = useTheme();
    const { getMostWrongWords, getLeechWords } = useAppStore();

    const aMostWrong = getMostWrongWords();
    const aLeechWords = getLeechWords();
    const nLeechCount = aLeechWords.length;

    const aWrongWords: WrongWordItem[] = aMostWrong
        .map((progress) =>
        {
            const word = getWordById(progress.szWordId);
            return word ? { word, progress } : null;
        })
        .filter((item): item is WrongWordItem => item !== null)
        .slice(0, 50); // 상위 50개만

    const renderItem = ({ item, index }: { item: WrongWordItem; index: number }): React.JSX.Element =>
    {
        const nAccuracy = item.progress.nCorrectCount + item.progress.nWrongCount > 0
            ? Math.round(
                  (item.progress.nCorrectCount /
                      (item.progress.nCorrectCount + item.progress.nWrongCount)) *
                      100
              )
            : 0;

        // SM-2 필드 (마이그레이션 대응)
        const bIsLeech = item.progress.bIsLeech ?? false;
        const fEasiness = item.progress.fEasiness ?? 2.5;

        return (
            <View style={[
                styles.wordCard,
                { backgroundColor: colors.surface },
                bIsLeech && styles.leechCard,
                bIsLeech && { borderColor: colors.wrong },
            ]}>
                <View style={styles.rankContainer}>
                    <Text style={[
                        styles.rank,
                        { color: colors.textSecondary },
                        index < 3 && { fontSize: 20, color: colors.wrong, fontWeight: '700' },
                    ]}>
                        {index + 1}
                    </Text>
                </View>
                <View style={styles.wordInfo}>
                    <View style={styles.wordHeader}>
                        <Text style={[styles.hanzi, { color: colors.text }]}>{item.word.szHanzi}</Text>
                        <View
                            style={[
                                styles.levelBadge,
                                { backgroundColor: getHskLevelColor(item.word.nLevel, colors) },
                            ]}
                        >
                            <Text style={[styles.levelText, { color: colors.background }]}>HSK {item.word.nLevel}</Text>
                        </View>
                        {bIsLeech && (
                            <View style={[styles.leechBadge, { backgroundColor: colors.wrong }]}>
                                <Text style={styles.leechBadgeText}>LEECH</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.pinyin, { color: colors.primary }]}>{item.word.szPinyin}</Text>
                    <Text style={[styles.meaning, { color: colors.textSecondary }]}>{item.word.szMeaning}</Text>
                    <Text style={[styles.efText, { color: colors.textMuted }]}>
                        난이도: {fEasiness.toFixed(2)} {fEasiness <= 1.5 ? '(어려움)' : fEasiness >= 2.3 ? '(쉬움)' : '(보통)'}
                    </Text>
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={[styles.wrongCount, { color: colors.wrong }]}>{item.progress.nWrongCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>오답</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.correctCount, { color: colors.correct }]}>{item.progress.nCorrectCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>정답</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[
                            styles.accuracy,
                            { color: colors.text },
                            nAccuracy < 50 && { color: colors.wrong },
                        ]}>
                            {nAccuracy}%
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>정답률</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderEmptyList = (): React.JSX.Element => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>틀린 단어가 없습니다</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                퀴즈를 풀면 틀린 단어가 여기에 표시됩니다
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[styles.backButton, { color: colors.primary }]}>← 뒤로</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>오답 단어</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.countContainer}>
                <View style={styles.countRow}>
                    <Text style={[styles.countText, { color: colors.textSecondary }]}>
                        총 {aWrongWords.length}개 단어 (오답 횟수 순)
                    </Text>
                    {aWrongWords.length > 0 && (
                        <TouchableOpacity
                            style={[styles.focusReviewButton, { backgroundColor: colors.primary }]}
                            onPress={() => {
                                const aWordIds = aWrongWords.slice(0, 20).map(item => item.progress.szWordId);
                                navigation.navigate('Quiz', {
                                    aFocusedWordIds: aWordIds,
                                    szFocusedMode: 'wrong_words',
                                });
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.focusReviewButtonText}>집중 복습</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {nLeechCount > 0 && (
                    <TouchableOpacity
                        style={[styles.leechWarning, { backgroundColor: colors.wrong + '20' }]}
                        onPress={() => navigation.navigate('LeechWords')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.leechWarningText, { color: colors.wrong }]}>
                            Leech 단어 {nLeechCount}개 - 탭하여 관리하기
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={aWrongWords}
                renderItem={renderItem}
                keyExtractor={(item) => item.progress.szWordId}
                contentContainerStyle={styles.listContent}
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
    countContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    countRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    countText: {
        fontSize: 14,
    },
    focusReviewButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
    },
    focusReviewButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    leechWarning: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    leechWarningText: {
        fontSize: 13,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    wordCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    leechCard: {
        borderWidth: 2,
    },
    rankContainer: {
        width: 32,
        alignItems: 'center',
        marginRight: 12,
    },
    rank: {
        fontSize: 16,
        fontWeight: '600',
    },
    wordInfo: {
        flex: 1,
    },
    wordHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    hanzi: {
        fontSize: 20,
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
        fontSize: 12,
        marginBottom: 1,
    },
    meaning: {
        fontSize: 12,
    },
    efText: {
        fontSize: 10,
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        marginLeft: 12,
        minWidth: 36,
    },
    wrongCount: {
        fontSize: 18,
        fontWeight: '700',
    },
    correctCount: {
        fontSize: 18,
        fontWeight: '700',
    },
    accuracy: {
        fontSize: 14,
        fontWeight: '600',
    },
    statLabel: {
        fontSize: 10,
        marginTop: 2,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
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
