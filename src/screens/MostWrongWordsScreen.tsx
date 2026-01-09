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
    const navigation = useNavigation();
    const { colors } = useTheme();
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
            <View style={[styles.wordCard, { backgroundColor: colors.surface }]}>
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
                    </View>
                    <Text style={[styles.pinyin, { color: colors.primary }]}>{item.word.szPinyin}</Text>
                    <Text style={[styles.meaning, { color: colors.textSecondary }]}>{item.word.szMeaning}</Text>
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
                <Text style={[styles.countText, { color: colors.textSecondary }]}>
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
    countText: {
        fontSize: 14,
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
    pinyin: {
        fontSize: 12,
        marginBottom: 1,
    },
    meaning: {
        fontSize: 12,
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
