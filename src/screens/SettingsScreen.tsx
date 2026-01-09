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
    SafeAreaView,
    ScrollView,
    Switch,
    Alert,
    TextInput,
} from 'react-native';
import { colors, hskLevelColors } from '../constants/colors';
import { useAppStore } from '../store';
import { HskLevel } from '../types';
import { levelWordCounts } from '../data';

export default function SettingsScreen(): React.JSX.Element
{
    const { settings, updateSettings, resetAllProgress } = useAppStore();

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
            // 최소 1개는 선택되어야 함
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={styles.title}>설정</Text>

                {/* 일일 목표 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>일일 목표</Text>
                    <View style={styles.dailyGoalRow}>
                        <Text style={styles.label}>하루 문제 수</Text>
                        <View style={styles.dailyGoalInput}>
                            <TextInput
                                style={styles.input}
                                value={szDailyGoal}
                                onChangeText={handleDailyGoalChange}
                                onBlur={handleDailyGoalBlur}
                                keyboardType="number-pad"
                                maxLength={3}
                            />
                            <Text style={styles.inputSuffix}>문제</Text>
                        </View>
                    </View>
                </View>

                {/* HSK 레벨 선택 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>학습 범위</Text>
                    <Text style={styles.sectionDescription}>
                        학습할 HSK 급수를 선택하세요
                    </Text>
                    {aAllLevels.map((nLevel) =>
                    {
                        const bSelected = settings.aSelectedLevels.includes(nLevel);
                        const nWordCount = levelWordCounts[nLevel];

                        return (
                            <TouchableOpacity
                                key={nLevel}
                                style={[
                                    styles.levelOption,
                                    bSelected && styles.levelOptionSelected,
                                ]}
                                onPress={() => handleToggleLevel(nLevel)}
                            >
                                <View style={styles.levelInfo}>
                                    <Text
                                        style={[
                                            styles.levelText,
                                            { color: hskLevelColors[nLevel] },
                                        ]}
                                    >
                                        HSK {nLevel}
                                    </Text>
                                    <Text style={styles.levelWordCount}>
                                        {nWordCount}개 단어
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.checkbox,
                                        bSelected && {
                                            backgroundColor: hskLevelColors[nLevel],
                                            borderColor: hskLevelColors[nLevel],
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
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>알림</Text>

                    <View style={styles.settingRow}>
                        <Text style={styles.label}>소리</Text>
                        <Switch
                            value={settings.bSoundEnabled}
                            onValueChange={(bValue) =>
                                updateSettings({ bSoundEnabled: bValue })
                            }
                            trackColor={{
                                false: colors.surfaceLight,
                                true: colors.primary,
                            }}
                            thumbColor={colors.text}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <Text style={styles.label}>진동</Text>
                        <Switch
                            value={settings.bVibrationEnabled}
                            onValueChange={(bValue) =>
                                updateSettings({ bVibrationEnabled: bValue })
                            }
                            trackColor={{
                                false: colors.surfaceLight,
                                true: colors.primary,
                            }}
                            thumbColor={colors.text}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <Text style={styles.label}>복습 알림</Text>
                        <Switch
                            value={settings.bNotificationEnabled}
                            onValueChange={(bValue) =>
                                updateSettings({ bNotificationEnabled: bValue })
                            }
                            trackColor={{
                                false: colors.surfaceLight,
                                true: colors.primary,
                            }}
                            thumbColor={colors.text}
                        />
                    </View>
                </View>

                {/* 데이터 관리 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>데이터 관리</Text>
                    <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={handleResetProgress}
                    >
                        <Text style={styles.dangerButtonText}>학습 진도 초기화</Text>
                    </TouchableOpacity>
                </View>

                {/* 앱 정보 */}
                <View style={styles.appInfo}>
                    <Text style={styles.appInfoText}>HSK 단어 암기 v1.1.0</Text>
                    <Text style={styles.appInfoText}>
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
        backgroundColor: colors.background,
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
        color: colors.text,
        marginBottom: 24,
    },
    section: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 16,
    },
    dailyGoalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    label: {
        fontSize: 16,
        color: colors.text,
    },
    dailyGoalInput: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        backgroundColor: colors.surfaceLight,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        width: 80,
        textAlign: 'center',
    },
    inputSuffix: {
        fontSize: 16,
        color: colors.textSecondary,
        marginLeft: 8,
    },
    levelOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surfaceLight,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    levelOptionSelected: {
        borderColor: colors.primary,
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
        color: colors.textSecondary,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: colors.textSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dangerButton: {
        backgroundColor: colors.wrong,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    dangerButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    appInfo: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    appInfoText: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 4,
    },
});
