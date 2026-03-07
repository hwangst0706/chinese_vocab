/**
 * @file WordListScreen
 * @brief 급수별 단어 목록 화면 - 전체 단어 브라우징 및 제외 관리
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, getHskLevelColor } from '../contexts/ThemeContext';
import { useAppStore } from '../store';
import { getWordsByLevel, allWords } from '../data';
import { Word, HskLevel } from '../types';

type WordListRouteParams = {
    WordList: {
        nInitialLevel?: HskLevel;
        bShowExcludedOnly?: boolean;
    };
};

type FilterType = 'all' | 'learned' | 'unlearned' | 'mastered' | 'excluded';

export default function WordListScreen(): React.JSX.Element
{
    const navigation = useNavigation();
    const route = useRoute<RouteProp<WordListRouteParams, 'WordList'>>();
    const { colors } = useTheme();
    const {
        settings,
        wordProgress,
        toggleWordExclusion,
        getExcludedWordIds,
    } = useAppStore();

    const nInitialLevel = route.params?.nInitialLevel ?? settings.aSelectedLevels[0] ?? 1;
    const bShowExcludedOnly = route.params?.bShowExcludedOnly ?? false;

    // 0 = 전체 급수
    const [nSelectedLevel, setSelectedLevel] = useState<HskLevel | 0>(bShowExcludedOnly ? 0 : nInitialLevel);
    const [szSearch, setSearch] = useState('');
    const [szFilter, setFilter] = useState<FilterType>(bShowExcludedOnly ? 'excluded' : 'all');

    const aExcludedIds = getExcludedWordIds();

    const aFilteredWords = useMemo(() =>
    {
        let aWords = nSelectedLevel === 0 ? allWords : getWordsByLevel(nSelectedLevel);

        // 검색 필터
        if (szSearch.trim())
        {
            const szQuery = szSearch.trim().toLowerCase();
            aWords = aWords.filter((w) =>
                w.szHanzi.includes(szQuery) ||
                w.szPinyin.toLowerCase().includes(szQuery) ||
                w.szMeaning.toLowerCase().includes(szQuery)
            );
        }

        // 상태 필터
        switch (szFilter)
        {
            case 'learned':
                aWords = aWords.filter((w) =>
                {
                    const wp = wordProgress[w.szId];
                    return wp && wp.nLevel > 0 && !wp.bMastered;
                });
                break;
            case 'unlearned':
                aWords = aWords.filter((w) => !wordProgress[w.szId]);
                break;
            case 'mastered':
                aWords = aWords.filter((w) =>
                {
                    const wp = wordProgress[w.szId];
                    return wp && wp.bMastered;
                });
                break;
            case 'excluded':
                aWords = aWords.filter((w) => aExcludedIds.includes(w.szId));
                break;
        }

        return aWords;
    }, [nSelectedLevel, szSearch, szFilter, wordProgress, aExcludedIds]);

    const getWordStatus = useCallback((szWordId: string): string =>
    {
        if (aExcludedIds.includes(szWordId)) return 'excluded';
        const wp = wordProgress[szWordId];
        if (!wp) return 'new';
        if (wp.bMastered) return 'mastered';
        if (wp.nLevel > 0) return 'learning';
        return 'new';
    }, [wordProgress, aExcludedIds]);

    const getStatusLabel = (szStatus: string): { szText: string; szColor: string } =>
    {
        switch (szStatus)
        {
            case 'mastered':
                return { szText: '완료', szColor: colors.correct };
            case 'learning':
                return { szText: '학습중', szColor: colors.primary };
            case 'excluded':
                return { szText: '제외됨', szColor: colors.wrong };
            default:
                return { szText: '미학습', szColor: colors.textMuted };
        }
    };

    const aLevels: (HskLevel | 0)[] = [0, 1, 2, 3, 4, 5, 6];

    const aFilters: { szKey: FilterType; szLabel: string }[] = [
        { szKey: 'all', szLabel: '전체' },
        { szKey: 'unlearned', szLabel: '미학습' },
        { szKey: 'learned', szLabel: '학습중' },
        { szKey: 'mastered', szLabel: '완료' },
        { szKey: 'excluded', szLabel: '제외' },
    ];

    const renderWordItem = ({ item }: { item: Word }): React.JSX.Element =>
    {
        const szStatus = getWordStatus(item.szId);
        const stStatusLabel = getStatusLabel(szStatus);
        const wp = wordProgress[item.szId];

        return (
            <View style={[styles.wordCard, { backgroundColor: colors.surface }]}>
                <View style={styles.wordMain}>
                    <View style={styles.wordTop}>
                        <Text style={[styles.hanzi, { color: colors.text }]}>{item.szHanzi}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: `${stStatusLabel.szColor}20` }]}>
                            <Text style={[styles.statusText, { color: stStatusLabel.szColor }]}>
                                {stStatusLabel.szText}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.pinyin, { color: colors.primary }]}>{item.szPinyin}</Text>
                    <Text style={[styles.meaning, { color: colors.textSecondary }]}>{item.szMeaning}</Text>
                    {wp && wp.nLevel > 0 && (
                        <Text style={[styles.progressInfo, { color: colors.textMuted }]}>
                            O {wp.nCorrectCount} / X {wp.nWrongCount} · SRS Lv.{wp.nLevel}
                        </Text>
                    )}
                </View>
                <TouchableOpacity
                    style={[
                        styles.excludeButton,
                        {
                            backgroundColor: szStatus === 'excluded'
                                ? colors.primary
                                : colors.surfaceLight,
                        },
                    ]}
                    onPress={() => toggleWordExclusion(item.szId)}
                    activeOpacity={0.7}
                >
                    <Text style={[
                        styles.excludeButtonText,
                        {
                            color: szStatus === 'excluded'
                                ? '#FFFFFF'
                                : colors.textSecondary,
                        },
                    ]}>
                        {szStatus === 'excluded' ? '복원' : '제외'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    const nTotalForLevel = nSelectedLevel === 0 ? allWords.length : getWordsByLevel(nSelectedLevel).length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 헤더 */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[styles.backButton, { color: colors.primary }]}>{'← 뒤로'}</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>
                    {bShowExcludedOnly ? '제외된 단어' : '단어 목록'}
                </Text>
                <View style={styles.placeholder} />
            </View>

            {/* 급수 탭 */}
            <View style={styles.levelTabs}>
                <FlatList
                    horizontal
                    data={aLevels}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.levelTabsContent}
                    keyExtractor={(item) => item.toString()}
                    renderItem={({ item: nLevel }) =>
                    {
                        const bSelected = nLevel === nSelectedLevel;
                        const levelColor = nLevel === 0 ? colors.primary : getHskLevelColor(nLevel, colors);

                        return (
                            <TouchableOpacity
                                style={[
                                    styles.levelTab,
                                    { backgroundColor: colors.surfaceLight },
                                    bSelected && { backgroundColor: levelColor },
                                ]}
                                onPress={() => setSelectedLevel(nLevel)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.levelTabText,
                                    { color: colors.textSecondary },
                                    bSelected && { color: '#FFFFFF' },
                                ]}>
                                    {nLevel === 0 ? '전체' : `HSK ${nLevel}`}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* 검색 */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text }]}
                    placeholder="한자, 병음, 뜻 검색..."
                    placeholderTextColor={colors.textMuted}
                    value={szSearch}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            {/* 필터 */}
            <View style={styles.filterRow}>
                <FlatList
                    horizontal
                    data={aFilters}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContent}
                    keyExtractor={(item) => item.szKey}
                    renderItem={({ item: stFilter }) =>
                    {
                        const bActive = szFilter === stFilter.szKey;

                        return (
                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    { backgroundColor: colors.surfaceLight },
                                    bActive && { backgroundColor: colors.primary },
                                ]}
                                onPress={() => setFilter(stFilter.szKey)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.filterChipText,
                                    { color: colors.textSecondary },
                                    bActive && { color: '#FFFFFF' },
                                ]}>
                                    {stFilter.szLabel}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* 결과 카운트 */}
            <View style={styles.countRow}>
                <Text style={[styles.countText, { color: colors.textSecondary }]}>
                    {aFilteredWords.length} / {nTotalForLevel}개
                </Text>
            </View>

            {/* 단어 목록 */}
            <FlatList
                data={aFilteredWords}
                renderItem={renderWordItem}
                keyExtractor={(item) => item.szId}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={11}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            {szSearch ? '검색 결과가 없습니다' : '해당하는 단어가 없습니다'}
                        </Text>
                    </View>
                }
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
    levelTabs: {
        paddingVertical: 12,
    },
    levelTabsContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    levelTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    levelTabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    searchInput: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
    },
    filterRow: {
        paddingVertical: 8,
    },
    filterContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    countRow: {
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    countText: {
        fontSize: 13,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    wordCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
    },
    wordMain: {
        flex: 1,
    },
    wordTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    hanzi: {
        fontSize: 22,
        fontWeight: '700',
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    pinyin: {
        fontSize: 13,
        marginBottom: 1,
    },
    meaning: {
        fontSize: 13,
    },
    progressInfo: {
        fontSize: 11,
        marginTop: 4,
    },
    excludeButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 12,
    },
    excludeButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 15,
    },
});
