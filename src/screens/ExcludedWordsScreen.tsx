/**
 * @file ExcludedWordsScreen
 * @brief 퀴즈에서 제외된 단어 관리 화면
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
import { colors, hskLevelColors } from '../constants/colors';
import { useAppStore } from '../store';
import { getWordById } from '../data';
import { Word } from '../types';

interface ExcludedWordItem
{
    word: Word;
    szId: string;
}

export default function ExcludedWordsScreen(): React.JSX.Element
{
    const navigation = useNavigation();
    const { getExcludedWordIds, toggleWordExclusion } = useAppStore();

    const aExcludedIds = getExcludedWordIds();
    const aExcludedWords: ExcludedWordItem[] = aExcludedIds
        .map((szId) =>
        {
            const word = getWordById(szId);
            return word ? { word, szId } : null;
        })
        .filter((item): item is ExcludedWordItem => item !== null);

    const handleRestore = (szWordId: string): void =>
    {
        toggleWordExclusion(szWordId);
    };

    const renderItem = ({ item }: { item: ExcludedWordItem }): React.JSX.Element => (
        <View style={styles.wordCard}>
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
            <TouchableOpacity
                style={styles.restoreButton}
                onPress={() => handleRestore(item.szId)}
            >
                <Text style={styles.restoreButtonText}>복원</Text>
            </TouchableOpacity>
        </View>
    );

    const renderEmptyList = (): React.JSX.Element => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyText}>제외된 단어가 없습니다</Text>
            <Text style={styles.emptySubtext}>
                퀴즈 중 단어를 제외하면 여기에 표시됩니다
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← 뒤로</Text>
                </TouchableOpacity>
                <Text style={styles.title}>제외된 단어</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.countContainer}>
                <Text style={styles.countText}>
                    총 {aExcludedWords.length}개 단어
                </Text>
            </View>

            <FlatList
                data={aExcludedWords}
                renderItem={renderItem}
                keyExtractor={(item) => item.szId}
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
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
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
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginRight: 8,
    },
    levelBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    levelText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.background,
    },
    pinyin: {
        fontSize: 14,
        color: colors.primary,
        marginBottom: 2,
    },
    meaning: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    restoreButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    restoreButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
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
