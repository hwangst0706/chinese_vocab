/**
 * @file SettingsScreen
 * @brief 설정 화면
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, getHskLevelColor, ThemeMode } from '../contexts/ThemeContext';
import { useAppStore } from '../store';
import { HskLevel } from '../types';
import { levelWordCounts } from '../data';

export default function SettingsScreen(): React.JSX.Element
{
    const navigation = useNavigation<any>();
    const { colors, themeMode, setThemeMode } = useTheme();
    const { settings, updateSettings, resetAllProgress, getExcludedWordIds, getMostWrongWords } = useAppStore();

    const [szDailyGoal, setDailyGoal] = useState(settings.nDailyGoal.toString());

    useEffect(() =>
    {
        setDailyGoal(settings.nDailyGoal.toString());
    }, [settings.nDailyGoal]);

    const handleDailyGoalChange = (szValue: string): void =>
    {
        setDailyGoal(szValue);
    };

    const handleDailyGoalBlur = (): void =>
    {
        let nValue = parseInt(szDailyGoal, 10);
        if (isNaN(nValue) || nValue < 5)
        {
            nValue = 5;
        }
        else if (nValue > 100)
        {
            nValue = 100;
        }
        setDailyGoal(nValue.toString());
        updateSettings({ nDailyGoal: nValue });
    };

    const handleToggleLevel = (nLevel: HskLevel): void =>
    {
        const aCurrentLevels = settings.aSelectedLevels;

        if (aCurrentLevels.includes(nLevel))
        {
            if (aCurrentLevels.length > 1)
            {
                updateSettings({
                    aSelectedLevels: aCurrentLevels.filter((l) => l !== nLevel),
                });
            }
        }
        else
        {
            updateSettings({
                aSelectedLevels: [...aCurrentLevels, nLevel].sort((a, b) => a - b),
            });
        }
    };

    const handleResetProgress = (): void =>
    {
        Alert.alert(
            '학습 진도 초기화',
            '모든 학습 기록이 삭제됩니다. 계속하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '초기화',
                    style: 'destructive',
                    onPress: () => resetAllProgress(),
                },
            ]
        );
    };

    const aAllLevels: HskLevel[] = [1, 2, 3];

    const aThemeOptions: { mode: ThemeMode; label: string; icon: string }[] = [
        { mode: 'light', label: '라이트', icon: '☀️' },
        { mode: 'dark', label: '다크', icon: '🌙' },
        { mode: 'system', label: '시스템', icon: '📱' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={[styles.title, { color: colors.text }]}>설정</Text>

                {/* 테마 설정 */}
                <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>테마</Text>
                    <View style={styles.themeOptions}>
                        {aThemeOptions.map((option) => (
                            <TouchableOpacity
                                key={option.mode}
                                style={[
                                    styles.themeOption,
                                    { backgroundColor: colors.surfaceLight },
                                    themeMode === option.mode && {
                                        backgroundColor: colors.primary,
                                    },
                                ]}
                                onPress={() => setThemeMode(option.mode)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.themeIcon}>{option.icon}</Text>
                                <Text
                                    style={[
                                        styles.themeLabel,
                                        { color: colors.text },
                                        themeMode === option.mode && { color: '#FFFFFF' },
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* 일일 목표 */}
                <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>일일 목표</Text>
                    <View style={styles.dailyGoalRow}>
                        <Text style={[styles.label, { color: colors.text }]}>하루 문제 수</Text>
                        <View style={styles.dailyGoalInput}>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text }]}
                                value={szDailyGoal}
                                onChangeText={handleDailyGoalChange}
                                onBlur={handleDailyGoalBlur}
                                keyboardType="number-pad"
                                maxLength={3}
                                placeholderTextColor={colors.textMuted}
                            />
                            <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>문제</Text>
                        </View>
                    </View>
                </View>

                {/* HSK 레벨 선택 */}
                <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>학습 범위</Text>
                    <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                        학습할 HSK 급수를 선택하세요
                    </Text>
                    {aAllLevels.map((nLevel) =>
                    {
                        const bSelected = settings.aSelectedLevels.includes(nLevel);
                        const nWordCount = levelWordCounts[nLevel];
                        const levelColor = getHskLevelColor(nLevel, colors);

                        return (
                            <TouchableOpacity
                                key={nLevel}
                                style={[
                                    styles.levelOption,
                                    { backgroundColor: colors.surfaceLight },
                                    bSelected && { borderColor: colors.primary },
                                ]}
                                onPress={() => handleToggleLevel(nLevel)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.levelInfo}>
                                    <Text style={[styles.levelText, { color: levelColor }]}>
                                        HSK {nLevel}
                                    </Text>
                                    <Text style={[styles.levelWordCount, { color: colors.textSecondary }]}>
                                        {nWordCount}개 단어
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.checkbox,
                                        { borderColor: colors.textSecondary },
                                        bSelected && {
                                            backgroundColor: levelColor,
                                            borderColor: levelColor,
                                        },
                                    ]}
                                >
                                    {bSelected && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 알림 설정 */}
                <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>알림</Text>

                    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.text }]}>소리</Text>
                        <Switch
                            value={settings.bSoundEnabled}
                            onValueChange={(bValue) => updateSettings({ bSoundEnabled: bValue })}
                            trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.text }]}>진동</Text>
                        <Switch
                            value={settings.bVibrationEnabled}
                            onValueChange={(bValue) => updateSettings({ bVibrationEnabled: bValue })}
                            trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <View style={[styles.settingRow, { borderBottomColor: 'transparent' }]}>
                        <Text style={[styles.label, { color: colors.text }]}>복습 알림</Text>
                        <Switch
                            value={settings.bNotificationEnabled}
                            onValueChange={(bValue) => updateSettings({ bNotificationEnabled: bValue })}
                            trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* 퀴즈 설정 */}
                <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>퀴즈 설정</Text>

                    <View style={[styles.settingRow, { borderBottomColor: 'transparent' }]}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.label, { color: colors.text }]}>병음 표시</Text>
                            <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                                퀴즈에서 한자의 병음을 표시합니다{'\n'}(병음 퀴즈 제외, 예문은 항상 표시)
                            </Text>
                        </View>
                        <Switch
                            value={settings.bShowPinyin}
                            onValueChange={(bValue) => updateSettings({ bShowPinyin: bValue })}
                            trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* 학습 관리 */}
                <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>학습 관리</Text>

                    <TouchableOpacity
                        style={[styles.menuButton, { backgroundColor: colors.surfaceLight }]}
                        onPress={() => navigation.navigate('ExcludedWords')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuButtonInfo}>
                            <Text style={[styles.menuButtonText, { color: colors.text }]}>제외된 단어</Text>
                            <Text style={[styles.menuButtonDescription, { color: colors.textSecondary }]}>
                                퀴즈에서 제외한 단어를 확인하고 복원합니다
                            </Text>
                        </View>
                        <View style={[styles.menuButtonBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.menuButtonBadgeText}>{getExcludedWordIds().length}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.menuButton, { backgroundColor: colors.surfaceLight }]}
                        onPress={() => navigation.navigate('MostWrongWords')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuButtonInfo}>
                            <Text style={[styles.menuButtonText, { color: colors.text }]}>오답 단어</Text>
                            <Text style={[styles.menuButtonDescription, { color: colors.textSecondary }]}>
                                가장 많이 틀린 단어를 확인합니다
                            </Text>
                        </View>
                        <View style={[styles.menuButtonBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.menuButtonBadgeText}>{getMostWrongWords().length}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* 데이터 관리 */}
                <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>데이터 관리</Text>
                    <TouchableOpacity
                        style={[styles.dangerButton, { backgroundColor: colors.wrong }]}
                        onPress={handleResetProgress}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.dangerButtonText}>학습 진도 초기화</Text>
                    </TouchableOpacity>
                </View>

                {/* 앱 정보 */}
                <View style={styles.appInfo}>
                    <Text style={[styles.appInfoText, { color: colors.textMuted }]}>HSK 단어 암기 v1.3.0</Text>
                    <Text style={[styles.appInfoText, { color: colors.textMuted }]}>
                        HSK 1~3급 총 {levelWordCounts[1] + levelWordCounts[2] + levelWordCounts[3]}개 단어
                    </Text>
                </View>
            </ScrollView>
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
    title: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 24,
    },
    section: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    sectionDescription: {
        fontSize: 14,
        marginBottom: 16,
    },
    themeOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    themeOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    themeIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    themeLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    dailyGoalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    label: {
        fontSize: 16,
    },
    dailyGoalInput: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 18,
        fontWeight: '600',
        width: 80,
        textAlign: 'center',
    },
    inputSuffix: {
        fontSize: 16,
        marginLeft: 8,
    },
    levelOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    levelInfo: {
        flex: 1,
    },
    levelText: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    levelWordCount: {
        fontSize: 14,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingDescription: {
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
    },
    menuButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
    },
    menuButtonInfo: {
        flex: 1,
    },
    menuButtonText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    menuButtonDescription: {
        fontSize: 12,
    },
    menuButtonBadge: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        minWidth: 36,
        alignItems: 'center',
    },
    menuButtonBadgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    dangerButton: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    dangerButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    appInfo: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    appInfoText: {
        fontSize: 14,
        marginBottom: 4,
    },
});
