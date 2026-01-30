/**
 * @file BackupSection.tsx
 * @brief Google Drive 백업/복원 UI 컴포넌트
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { ThemeColors } from '../contexts/ThemeContext';
import { useGoogleAuthContext } from '../contexts/GoogleAuthContext';
import { useAppStore } from '../store';
import { createBackup, restoreBackup } from '../services/googleDrive';
import { BackupStatus } from '../types/backup';

interface BackupSectionProps
{
    colors: ThemeColors;
}

export default function BackupSection({ colors }: BackupSectionProps): React.JSX.Element
{
    const {
        stUser,
        bIsAuthenticated,
        bIsLoading: bAuthLoading,
        szError,
        stBackupInfo,
        signIn,
        signOutUser,
        refreshBackupInfo,
        clearError,
    } = useGoogleAuthContext();

    const {
        wordProgress,
        dailyStats,
        reviewTestRecords,
        settings,
        reviewTestSettings,
        aExcludedWords,
        importBackupData,
    } = useAppStore();

    const [szBackupStatus, setBackupStatus] = useState<BackupStatus>('idle');

    // 날짜 포맷팅
    const formatDate = (szIsoDate: string): string =>
    {
        const dt = new Date(szIsoDate);
        return dt.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // 로그인 처리
    const handleSignIn = async (): Promise<void> =>
    {
        await signIn();
    };

    // 로그아웃 처리
    const handleSignOut = async (): Promise<void> =>
    {
        Alert.alert(
            '로그아웃',
            'Google 계정에서 로그아웃하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '로그아웃',
                    onPress: async () =>
                    {
                        await signOutUser();
                    },
                },
            ]
        );
    };

    // 백업 처리
    const handleBackup = async (): Promise<void> =>
    {
        setBackupStatus('backing_up');

        try
        {
            const result = await createBackup(
                wordProgress,
                dailyStats,
                reviewTestRecords,
                settings,
                reviewTestSettings,
                aExcludedWords
            );

            if (result.bSuccess)
            {
                setBackupStatus('success');
                await refreshBackupInfo();
                Alert.alert('백업 완료', result.szMessage);
            }
            else
            {
                setBackupStatus('error');
                Alert.alert('백업 실패', result.szMessage);
            }
        }
        catch (error)
        {
            setBackupStatus('error');
            const szMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            Alert.alert('백업 실패', szMessage);
        }
        finally
        {
            setTimeout(() => setBackupStatus('idle'), 2000);
        }
    };

    // 복원 처리
    const handleRestore = async (): Promise<void> =>
    {
        Alert.alert(
            '백업 복원',
            '현재 데이터가 백업 데이터로 대체됩니다. 계속하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '복원',
                    style: 'destructive',
                    onPress: async () =>
                    {
                        setBackupStatus('restoring');

                        try
                        {
                            const result = await restoreBackup();

                            if (result.bSuccess && result.stBackupData)
                            {
                                // Store에 데이터 적용
                                importBackupData(result.stBackupData);
                                setBackupStatus('success');
                                Alert.alert('복원 완료', '백업 데이터가 복원되었습니다.');
                            }
                            else
                            {
                                setBackupStatus('error');
                                Alert.alert('복원 실패', result.szMessage);
                            }
                        }
                        catch (error)
                        {
                            setBackupStatus('error');
                            const szMessage = error instanceof Error ? error.message : '알 수 없는 오류';
                            Alert.alert('복원 실패', szMessage);
                        }
                        finally
                        {
                            setTimeout(() => setBackupStatus('idle'), 2000);
                        }
                    },
                },
            ]
        );
    };

    const bIsProcessing = szBackupStatus === 'backing_up' || szBackupStatus === 'restoring' || bAuthLoading;

    // 비로그인 상태
    if (!bIsAuthenticated)
    {
        return (
            <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Google Drive 백업
                </Text>
                <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                    학습 데이터를 Google Drive에 백업하고 복원할 수 있습니다
                </Text>

                {szError && (
                    <View style={[styles.errorContainer, { backgroundColor: '#FF6B6B20' }]}>
                        <Text style={[styles.errorText, { color: '#FF6B6B' }]}>{szError}</Text>
                        <TouchableOpacity onPress={clearError}>
                            <Text style={[styles.errorDismiss, { color: colors.textMuted }]}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.googleButton, { backgroundColor: '#4285F4' }]}
                    onPress={handleSignIn}
                    disabled={bAuthLoading}
                    activeOpacity={0.7}
                >
                    {bAuthLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Text style={styles.googleIcon}>G</Text>
                            <Text style={styles.googleButtonText}>Google 계정으로 로그인</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
    }

    // 로그인 상태
    return (
        <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Google Drive 백업
            </Text>

            {/* 사용자 정보 */}
            <View style={[styles.userInfo, { backgroundColor: colors.surfaceLight }]}>
                <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                        {stUser?.szName?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                </View>
                <View style={styles.userDetails}>
                    <Text style={[styles.userName, { color: colors.text }]}>{stUser?.szName}</Text>
                    <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{stUser?.szEmail}</Text>
                </View>
            </View>

            {/* 백업 정보 */}
            {stBackupInfo ? (
                <View style={[styles.backupInfo, { borderColor: colors.border }]}>
                    <Text style={[styles.backupLabel, { color: colors.textMuted }]}>마지막 백업</Text>
                    <Text style={[styles.backupDate, { color: colors.text }]}>
                        {formatDate(stBackupInfo.dtModified)}
                    </Text>
                </View>
            ) : (
                <View style={[styles.backupInfo, { borderColor: colors.border }]}>
                    <Text style={[styles.noBackupText, { color: colors.textMuted }]}>
                        아직 백업이 없습니다
                    </Text>
                </View>
            )}

            {/* 백업/복원 버튼 */}
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={handleBackup}
                    disabled={bIsProcessing}
                    activeOpacity={0.7}
                >
                    {szBackupStatus === 'backing_up' ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={styles.actionButtonText}>백업하기</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        { backgroundColor: colors.surfaceLight },
                        !stBackupInfo && styles.disabledButton,
                    ]}
                    onPress={handleRestore}
                    disabled={bIsProcessing || !stBackupInfo}
                    activeOpacity={0.7}
                >
                    {szBackupStatus === 'restoring' ? (
                        <ActivityIndicator color={colors.text} size="small" />
                    ) : (
                        <Text style={[styles.actionButtonTextSecondary, { color: colors.text }]}>
                            복원하기
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* 로그아웃 버튼 */}
            <TouchableOpacity
                style={[styles.signOutButton, { borderColor: colors.border }]}
                onPress={handleSignOut}
                disabled={bIsProcessing}
                activeOpacity={0.7}
            >
                <Text style={[styles.signOutText, { color: colors.textSecondary }]}>로그아웃</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
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
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        marginBottom: 16,
        lineHeight: 20,
    },
    errorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 14,
        flex: 1,
    },
    errorDismiss: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 12,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    googleIcon: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginRight: 10,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 16,
    },
    userAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#4285F4',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userAvatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
    },
    backupInfo: {
        borderTopWidth: 1,
        borderBottomWidth: 1,
        paddingVertical: 14,
        marginBottom: 16,
    },
    backupLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    backupDate: {
        fontSize: 16,
        fontWeight: '500',
    },
    noBackupText: {
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    actionButtonTextSecondary: {
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
    signOutButton: {
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
    },
    signOutText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
