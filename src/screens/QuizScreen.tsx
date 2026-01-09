/**
 * @file QuizScreen
 * @brief 퀴즈 화면 - 3가지 퀴즈 타입
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { colors, hskLevelColors } from '../constants/colors';
import { useAppStore } from '../store';
import { QuizQuestion } from '../types';
import {
    generateQuizQuestions,
    getQuestionText,
    getQuestionDisplay,
    getQuizTypeName,
} from '../utils/quiz';

const QUIZ_COUNT = 10;

export default function QuizScreen(): React.JSX.Element
{
    const navigation = useNavigation<any>();
    const {
        settings,
        getQuizWords,
        updateWordProgress,
        getTodayStats,
        toggleWordExclusion,
        isWordExcluded,
    } = useAppStore();

    const [aQuestions, setQuestions] = useState<QuizQuestion[]>([]);
    const [nCurrentIndex, setCurrentIndex] = useState(0);
    const [nSelectedOption, setSelectedOption] = useState<number | null>(null);
    const [bShowResult, setShowResult] = useState(false);
    const [nCorrectCount, setCorrectCount] = useState(0);
    const [bQuizComplete, setQuizComplete] = useState(false);

    const [fadeAnim] = useState(new Animated.Value(1));

    useEffect(() =>
    {
        initializeQuiz();
    }, []);

    const initializeQuiz = (): void =>
    {
        const aWordIds = getQuizWords(QUIZ_COUNT);
        const aGeneratedQuestions = generateQuizQuestions(aWordIds);
        setQuestions(aGeneratedQuestions);
        setCurrentIndex(0);
        setSelectedOption(null);
        setShowResult(false);
        setCorrectCount(0);
        setQuizComplete(false);
    };

    const stCurrentQuestion = aQuestions[nCurrentIndex];

    // 예문에서 학습 단어 하이라이트
    const renderHighlightedExample = (
        szExample: string,
        szHanzi: string
    ): React.ReactNode =>
    {
        const nIndex = szExample.indexOf(szHanzi);
        if (nIndex === -1)
        {
            return szExample;
        }

        const szBefore = szExample.slice(0, nIndex);
        const szAfter = szExample.slice(nIndex + szHanzi.length);

        return (
            <>
                {szBefore}
                <Text style={styles.highlightedWord}>{szHanzi}</Text>
                {szAfter}
            </>
        );
    };

    const handleSelectOption = (nIndex: number): void =>
    {
        if (bShowResult) return;

        setSelectedOption(nIndex);
        setShowResult(true);

        const bIsCorrect = nIndex === stCurrentQuestion.nCorrectIndex;

        // 진동 피드백
        if (settings.bVibrationEnabled)
        {
            if (bIsCorrect)
            {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            else
            {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        }

        // TTS: 정답일 때 한자 읽어주기
        if (bIsCorrect && settings.bSoundEnabled)
        {
            Speech.speak(stCurrentQuestion.stWord.szHanzi, {
                language: 'zh-CN',
                rate: 0.8,
            });
        }

        // 진도 업데이트
        updateWordProgress(stCurrentQuestion.stWord.szId, bIsCorrect);

        if (bIsCorrect)
        {
            setCorrectCount((prev) => prev + 1);
        }
    };

    const handleNext = (): void =>
    {
        if (nCurrentIndex < aQuestions.length - 1)
        {
            // 페이드 애니메이션
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();

            setTimeout(() =>
            {
                setCurrentIndex((prev) => prev + 1);
                setSelectedOption(null);
                setShowResult(false);
            }, 150);
        }
        else
        {
            setQuizComplete(true);
        }
    };

    const handleFinish = (): void =>
    {
        navigation.goBack();
    };

    const handleRetry = (): void =>
    {
        initializeQuiz();
    };

    const getOptionStyle = (nIndex: number): object =>
    {
        if (!bShowResult) return styles.option;

        if (nIndex === stCurrentQuestion.nCorrectIndex)
        {
            return [styles.option, styles.optionCorrect];
        }

        if (nIndex === nSelectedOption && nIndex !== stCurrentQuestion.nCorrectIndex)
        {
            return [styles.option, styles.optionWrong];
        }

        return [styles.option, styles.optionDisabled];
    };

    // 로딩 중
    if (aQuestions.length === 0)
    {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>문제 준비 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // 퀴즈 완료
    if (bQuizComplete)
    {
        const nAccuracy = Math.round((nCorrectCount / aQuestions.length) * 100);
        const stTodayStats = getTodayStats();

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.resultContainer}>
                    <Text style={styles.resultEmoji}>
                        {nAccuracy >= 80 ? '🎉' : nAccuracy >= 50 ? '👍' : '💪'}
                    </Text>
                    <Text style={styles.resultTitle}>학습 완료!</Text>

                    <View style={styles.resultStats}>
                        <View style={styles.resultStatItem}>
                            <Text style={styles.resultStatValue}>{nCorrectCount}</Text>
                            <Text style={styles.resultStatLabel}>정답</Text>
                        </View>
                        <View style={styles.resultStatItem}>
                            <Text style={styles.resultStatValue}>
                                {aQuestions.length - nCorrectCount}
                            </Text>
                            <Text style={styles.resultStatLabel}>오답</Text>
                        </View>
                        <View style={styles.resultStatItem}>
                            <Text style={styles.resultStatValue}>{nAccuracy}%</Text>
                            <Text style={styles.resultStatLabel}>정답률</Text>
                        </View>
                    </View>

                    <View style={styles.todayProgress}>
                        <Text style={styles.todayProgressText}>
                            오늘 총 {stTodayStats.nQuestionsAnswered}문제 풀이
                        </Text>
                    </View>

                    <View style={styles.resultButtons}>
                        <TouchableOpacity
                            style={styles.resultButtonSecondary}
                            onPress={handleFinish}
                        >
                            <Text style={styles.resultButtonSecondaryText}>홈으로</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.resultButtonPrimary}
                            onPress={handleRetry}
                        >
                            <Text style={styles.resultButtonPrimaryText}>계속 학습</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // 퀴즈 진행
    return (
        <SafeAreaView style={styles.container}>
            {/* 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleFinish}>
                    <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
                <View style={styles.progressIndicator}>
                    <Text style={styles.progressText}>
                        {nCurrentIndex + 1} / {aQuestions.length}
                    </Text>
                </View>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>{nCorrectCount}점</Text>
                </View>
            </View>

            {/* 진행 바 */}
            <View style={styles.progressBar}>
                <View
                    style={[
                        styles.progressFill,
                        {
                            width: `${((nCurrentIndex + 1) / aQuestions.length) * 100}%`,
                        },
                    ]}
                />
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* 퀴즈 타입 */}
                <View style={styles.quizTypeContainer}>
                    <Text style={styles.quizType}>
                        {getQuizTypeName(stCurrentQuestion.type)}
                    </Text>
                    <View
                        style={[
                            styles.levelBadge,
                            { borderColor: hskLevelColors[stCurrentQuestion.stWord.nLevel] },
                        ]}
                    >
                        <Text
                            style={[
                                styles.levelBadgeText,
                                { color: hskLevelColors[stCurrentQuestion.stWord.nLevel] },
                            ]}
                        >
                            HSK {stCurrentQuestion.stWord.nLevel}
                        </Text>
                    </View>
                </View>

                {/* 문제 */}
                <View style={styles.questionContainer}>
                    <Text style={styles.questionDisplay}>
                        {getQuestionDisplay(stCurrentQuestion)}
                    </Text>
                    {stCurrentQuestion.type !== 'meaning_to_hanzi' &&
                        stCurrentQuestion.type !== 'hanzi_to_pinyin' && (
                        <Text style={styles.questionPinyin}>
                            {(settings.bShowPinyin || bShowResult)
                                ? stCurrentQuestion.stWord.szPinyin
                                : ''}
                        </Text>
                    )}
                </View>

                {/* 선택지 */}
                <View style={styles.optionsContainer}>
                    {stCurrentQuestion.aOptions.map((szOption, nIndex) => (
                        <TouchableOpacity
                            key={nIndex}
                            style={getOptionStyle(nIndex)}
                            onPress={() => handleSelectOption(nIndex)}
                            disabled={bShowResult}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    bShowResult &&
                                        nIndex === stCurrentQuestion.nCorrectIndex &&
                                        styles.optionTextCorrect,
                                    bShowResult &&
                                        nIndex === nSelectedOption &&
                                        nIndex !== stCurrentQuestion.nCorrectIndex &&
                                        styles.optionTextWrong,
                                ]}
                            >
                                {szOption}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 결과 & 다음 버튼 */}
                {bShowResult && (
                    <View style={styles.feedbackContainer}>
                        <Text
                            style={[
                                styles.feedbackText,
                                nSelectedOption === stCurrentQuestion.nCorrectIndex
                                    ? styles.feedbackCorrect
                                    : styles.feedbackWrong,
                            ]}
                        >
                            {nSelectedOption === stCurrentQuestion.nCorrectIndex
                                ? '정답입니다! 👏'
                                : `오답! 정답: ${stCurrentQuestion.aOptions[stCurrentQuestion.nCorrectIndex]}`}
                        </Text>

                        {stCurrentQuestion.stWord.szExample && (
                            <View style={styles.exampleContainer}>
                                <Text style={styles.exampleText}>
                                    {renderHighlightedExample(
                                        stCurrentQuestion.stWord.szExample,
                                        stCurrentQuestion.stWord.szHanzi
                                    )}
                                </Text>
                                <Text style={styles.examplePinyin}>
                                    {stCurrentQuestion.stWord.szExamplePinyin}
                                </Text>
                                <Text style={styles.exampleMeaning}>
                                    {stCurrentQuestion.stWord.szExampleMeaning}
                                </Text>
                            </View>
                        )}

                        {/* 단어 제외 토글 */}
                        <TouchableOpacity
                            style={[
                                styles.excludeButton,
                                isWordExcluded(stCurrentQuestion.stWord.szId) &&
                                    styles.excludeButtonActive,
                            ]}
                            onPress={() =>
                                toggleWordExclusion(stCurrentQuestion.stWord.szId)
                            }
                        >
                            <Text style={styles.excludeButtonText}>
                                {isWordExcluded(stCurrentQuestion.stWord.szId)
                                    ? '🚫 퀴즈 제외됨 (탭해서 해제)'
                                    : '이 단어 퀴즈에서 제외'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                            <Text style={styles.nextButtonText}>
                                {nCurrentIndex < aQuestions.length - 1 ? '다음' : '결과 보기'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        color: colors.textSecondary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    closeButton: {
        fontSize: 24,
        color: colors.textSecondary,
        padding: 8,
    },
    progressIndicator: {
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    scoreContainer: {
        backgroundColor: colors.accent,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    scoreText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.background,
    },
    progressBar: {
        height: 4,
        backgroundColor: colors.surface,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    quizTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    quizType: {
        fontSize: 14,
        color: colors.textSecondary,
        marginRight: 12,
    },
    levelBadge: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    levelBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    questionContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    questionDisplay: {
        fontSize: 56,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    questionPinyin: {
        fontSize: 20,
        color: colors.textSecondary,
        height: 28,
    },
    optionsContainer: {
        gap: 12,
    },
    option: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 18,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    optionCorrect: {
        borderColor: colors.correct,
        backgroundColor: `${colors.correct}20`,
    },
    optionWrong: {
        borderColor: colors.wrong,
        backgroundColor: `${colors.wrong}20`,
    },
    optionDisabled: {
        opacity: 0.5,
    },
    optionText: {
        fontSize: 18,
        color: colors.text,
        textAlign: 'center',
    },
    optionTextCorrect: {
        color: colors.correct,
        fontWeight: '600',
    },
    optionTextWrong: {
        color: colors.wrong,
    },
    feedbackContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    feedbackText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    feedbackCorrect: {
        color: colors.correct,
    },
    feedbackWrong: {
        color: colors.wrong,
    },
    exampleContainer: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 16,
    },
    exampleText: {
        fontSize: 16,
        color: colors.text,
        marginBottom: 4,
        lineHeight: 24,
    },
    highlightedWord: {
        color: colors.accent,
        fontWeight: '700',
    },
    examplePinyin: {
        fontSize: 14,
        color: colors.primary,
        marginBottom: 4,
    },
    exampleMeaning: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    excludeButton: {
        backgroundColor: colors.surfaceLight,
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    excludeButtonActive: {
        backgroundColor: `${colors.wrong}30`,
    },
    excludeButtonText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    nextButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 48,
    },
    nextButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    // 결과 화면
    resultContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    resultEmoji: {
        fontSize: 80,
        marginBottom: 16,
    },
    resultTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 32,
    },
    resultStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
    },
    resultStatItem: {
        alignItems: 'center',
    },
    resultStatValue: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.accent,
    },
    resultStatLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    todayProgress: {
        marginBottom: 32,
    },
    todayProgressText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    resultButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    resultButtonSecondary: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    resultButtonSecondaryText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    resultButtonPrimary: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    resultButtonPrimaryText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
});
