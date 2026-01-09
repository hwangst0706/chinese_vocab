/**
 * @file MostWrongWordsScreen
 * @brief 가장 많이 틀린 단어 목록 화면
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, hskLevelColors } from '../constants/colors';
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
    const navigation = useNavigation();
    const { getMostWrongWords } = useAppStore();

    const aMostWrong = getMostWrongWords();
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

        return (
            <View style={styles.wordCard}>
                <View style={styles.rankContainer}>
                    <Text style={[
                        styles.rank,
                        index < 3 && styles.topRank,
                    ]}>
                        {index + 1}
                    </Text>
                </View>
                <View style={styles.wordInfo}>
                    <View style={styles.wordHeader}>
                        <Text style={styles.hanzi}>{item.word.szHanzi}</Text>
                        <View
                            style={[
                                styles.levelBadge,
                                { backgroundColor: hskLevelColors[item.word.nLevel] },
                            ]}
                        >
                            <Text style={styles.levelText}>HSK {item.word.nLevel}</Text>
                        </View>
                    </View>
                    <Text style={styles.pinyin}>{item.word.szPinyin}</Text>
                    <Text style={styles.meaning}>{item.word.szMeaning}</Text>
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.wrongCount}>{item.progress.nWrongCount}</Text>
                        <Text style={styles.statLabel}>오답</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.correctCount}>{item.progress.nCorrectCount}</Text>
                        <Text style={styles.statLabel}>정답</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[
                            styles.accuracy,
                            nAccuracy < 50 && styles.lowAccuracy,
                        ]}>
                            {nAccuracy}%
                        </Text>
                        <Text style={styles.statLabel}>정답률</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderEmptyList = (): React.JSX.Element => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>틀린 단어가 없습니다</Text>
            <Text style={styles.emptySubtext}>
                퀴즈를 풀면 틀린 단어가 여기에 표시됩니다
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← 뒤로</Text>
                </TouchableOpacity>
                <Text style={styles.title}>오답 단어</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.countContainer}>
                <Text style={styles.countText}>
                    총 {aWrongWords.length}개 단어 (오답 횟수 순)
                </Text>
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
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        fontSize: 16,
        color: colors.primary,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    placeholder: {
        width: 50,
    },
    countContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    countText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    wordCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    rankContainer: {
        width: 32,
        alignItems: 'center',
        marginRight: 12,
    },
    rank: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    topRank: {
        fontSize: 20,
        color: colors.wrong,
        fontWeight: '700',
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
        color: colors.text,
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
        color: colors.background,
    },
    pinyin: {
        fontSize: 12,
        color: colors.primary,
        marginBottom: 1,
    },
    meaning: {
        fontSize: 12,
        color: colors.textSecondary,
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
        color: colors.wrong,
    },
    correctCount: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.correct,
    },
    accuracy: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    lowAccuracy: {
        color: colors.wrong,
    },
    statLabel: {
        fontSize: 10,
        color: colors.textMuted,
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
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
