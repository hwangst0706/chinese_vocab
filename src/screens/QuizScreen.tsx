/**
 * @file QuizScreen
 * @brief 퀴즈 화면 - 3가지 퀴즈 타입
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ScrollView,
    Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useTheme, getHskLevelColor } from '../contexts/ThemeContext';
import { useAppStore } from '../store';
import { QuizQuestion } from '../types';
import {
    generateQuizQuestions,
    getQuestionText,
    getQuestionDisplay,
    getQuizTypeName,
} from '../utils/quiz';

const QUIZ_COUNT = 10;

// 애니메이션 버튼 컴포넌트
interface AnimatedOptionButtonProps
{
    szOption: string;
    nIndex: number;
    bIsCorrect: boolean;
    bIsSelected: boolean;
    bShowResult: boolean;
    colors: any;
    onPress: () => void;
}

function AnimatedOptionButton({
    szOption,
    nIndex,
    bIsCorrect,
    bIsSelected,
    bShowResult,
    colors,
    onPress,
}: AnimatedOptionButtonProps): React.JSX.Element
{
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const handlePressIn = (): void =>
    {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = (): void =>
    {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
        }).start();
    };

    // 정답/오답 피드백 애니메이션
    useEffect(() =>
    {
        if (bShowResult && bIsSelected)
        {
            if (bIsCorrect)
            {
                // 정답: 바운스 효과
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.05,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        friction: 3,
                        tension: 100,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
            else
            {
                // 오답: 쉐이크 효과
                Animated.sequence([
                    Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
                ]).start();
            }
        }
    }, [bShowResult, bIsSelected, bIsCorrect]);

    const getOptionStyle = (): object[] =>
    {
        const baseStyle = [styles.option, { backgroundColor: colors.surface, borderColor: colors.surface }];

        if (!bShowResult) return baseStyle;

        if (bIsCorrect)
        {
            return [...baseStyle, { borderColor: colors.correct, backgroundColor: `${colors.correct}20` }];
        }

        if (bIsSelected && !bIsCorrect)
        {
            return [...baseStyle, { borderColor: colors.wrong, backgroundColor: `${colors.wrong}20` }];
        }

        return [...baseStyle, styles.optionDisabled];
    };

    return (
        <Animated.View
            style={{
                transform: [
                    { scale: scaleAnim },
                    { translateX: shakeAnim },
                ],
            }}
        >
            <TouchableOpacity
                style={getOptionStyle()}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={bShowResult}
                activeOpacity={1}
            >
                <Text
                    style={[
                        styles.optionText,
                        { color: colors.text },
                        bShowResult && bIsCorrect && { color: colors.correct, fontWeight: '600' },
                        bShowResult && bIsSelected && !bIsCorrect && { color: colors.wrong },
                    ]}
                >
                    {szOption}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function QuizScreen(): React.JSX.Element
{
    const navigation = useNavigation<any>();
    const { colors } = useTheme();
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
    const progressAnim = useRef(new Animated.Value(0)).current;
    const feedbackAnim = useRef(new Animated.Value(0)).current;
    const resultScaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() =>
    {
        initializeQuiz();
    }, []);

    // 프로그레스 바 애니메이션
    useEffect(() =>
    {
        if (aQuestions.length > 0)
        {
            Animated.timing(progressAnim, {
                toValue: (nCurrentIndex + 1) / aQuestions.length,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        }
    }, [nCurrentIndex, aQuestions.length]);

    // 피드백 슬라이드 애니메이션
    useEffect(() =>
    {
        if (bShowResult)
        {
            feedbackAnim.setValue(0);
            Animated.spring(feedbackAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }
    }, [bShowResult]);

    // 결과 화면 애니메이션
    useEffect(() =>
    {
        if (bQuizComplete)
        {
            resultScaleAnim.setValue(0);
            Animated.spring(resultScaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }
    }, [bQuizComplete]);

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
        progressAnim.setValue(0);
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
                <Text style={{ color: colors.accent, fontWeight: '700' }}>{szHanzi}</Text>
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

    // 로딩 중
    if (aQuestions.length === 0)
    {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>문제 준비 중...</Text>
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
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Animated.View
                    style={[
                        styles.resultContainer,
                        {
                            opacity: resultScaleAnim,
                            transform: [
                                {
                                    scale: resultScaleAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <Text style={styles.resultEmoji}>
                        {nAccuracy >= 80 ? '🎉' : nAccuracy >= 50 ? '👍' : '💪'}
                    </Text>
                    <Text style={[styles.resultTitle, { color: colors.text }]}>학습 완료!</Text>

                    <View style={[styles.resultStats, { backgroundColor: colors.surface }]}>
                        <View style={styles.resultStatItem}>
                            <Text style={[styles.resultStatValue, { color: colors.accent }]}>{nCorrectCount}</Text>
                            <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>정답</Text>
                        </View>
                        <View style={styles.resultStatItem}>
                            <Text style={[styles.resultStatValue, { color: colors.accent }]}>
                                {aQuestions.length - nCorrectCount}
                            </Text>
                            <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>오답</Text>
                        </View>
                        <View style={styles.resultStatItem}>
                            <Text style={[styles.resultStatValue, { color: colors.accent }]}>{nAccuracy}%</Text>
                            <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>정답률</Text>
                        </View>
                    </View>

                    <View style={styles.todayProgress}>
                        <Text style={[styles.todayProgressText, { color: colors.textSecondary }]}>
                            오늘 총 {stTodayStats.nQuestionsAnswered}문제 풀이
                        </Text>
                    </View>

                    <View style={styles.resultButtons}>
                        <TouchableOpacity
                            style={[styles.resultButtonSecondary, { backgroundColor: colors.surface }]}
                            onPress={handleFinish}
                        >
                            <Text style={[styles.resultButtonSecondaryText, { color: colors.text }]}>홈으로</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.resultButtonPrimary, { backgroundColor: colors.primary }]}
                            onPress={handleRetry}
                        >
                            <Text style={[styles.resultButtonPrimaryText, { color: colors.text }]}>계속 학습</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </SafeAreaView>
        );
    }

    // 퀴즈 진행
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleFinish}>
                    <Text style={[styles.closeButton, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
                <View style={[styles.progressIndicator, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.progressText, { color: colors.text }]}>
                        {nCurrentIndex + 1} / {aQuestions.length}
                    </Text>
                </View>
                <View style={[styles.scoreContainer, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.scoreText, { color: colors.background }]}>{nCorrectCount}점</Text>
                </View>
            </View>

            {/* 진행 바 (애니메이션) */}
            <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
                <Animated.View
                    style={[
                        styles.progressFill,
                        {
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                            backgroundColor: colors.primary,
                        },
                    ]}
                />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    {/* 퀴즈 타입 */}
                    <View style={styles.quizTypeContainer}>
                    <Text style={[styles.quizType, { color: colors.textSecondary }]}>
                        {getQuizTypeName(stCurrentQuestion.type)}
                    </Text>
                    <View
                        style={[
                            styles.levelBadge,
                            { borderColor: getHskLevelColor(stCurrentQuestion.stWord.nLevel, colors) },
                        ]}
                    >
                        <Text
                            style={[
                                styles.levelBadgeText,
                                { color: getHskLevelColor(stCurrentQuestion.stWord.nLevel, colors) },
                            ]}
                        >
                            HSK {stCurrentQuestion.stWord.nLevel}
                        </Text>
                    </View>
                </View>

                {/* 문제 */}
                <View style={styles.questionContainer}>
                    <Text style={[styles.questionDisplay, { color: colors.text }]}>
                        {getQuestionDisplay(stCurrentQuestion)}
                    </Text>
                    {stCurrentQuestion.type !== 'meaning_to_hanzi' &&
                        stCurrentQuestion.type !== 'hanzi_to_pinyin' && (
                        <Text style={[styles.questionPinyin, { color: colors.textSecondary }]}>
                            {(settings.bShowPinyin || bShowResult)
                                ? stCurrentQuestion.stWord.szPinyin
                                : ''}
                        </Text>
                    )}
                </View>

                {/* 선택지 (애니메이션 버튼) */}
                <View style={styles.optionsContainer}>
                    {stCurrentQuestion.aOptions.map((szOption, nIndex) => (
                        <AnimatedOptionButton
                            key={`${nCurrentIndex}-${nIndex}`}
                            szOption={szOption}
                            nIndex={nIndex}
                            bIsCorrect={nIndex === stCurrentQuestion.nCorrectIndex}
                            bIsSelected={nIndex === nSelectedOption}
                            bShowResult={bShowResult}
                            colors={colors}
                            onPress={() => handleSelectOption(nIndex)}
                        />
                    ))}
                </View>

                {/* 결과 & 다음 버튼 (슬라이드업 애니메이션) */}
                {bShowResult && (
                    <Animated.View
                        style={[
                            styles.feedbackContainer,
                            {
                                opacity: feedbackAnim,
                                transform: [
                                    {
                                        translateY: feedbackAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [30, 0],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.feedbackText,
                                nSelectedOption === stCurrentQuestion.nCorrectIndex
                                    ? { color: colors.correct }
                                    : { color: colors.wrong },
                            ]}
                        >
                            {nSelectedOption === stCurrentQuestion.nCorrectIndex
                                ? '정답입니다! 👏'
                                : `오답! 정답: ${stCurrentQuestion.aOptions[stCurrentQuestion.nCorrectIndex]}`}
                        </Text>

                        {stCurrentQuestion.stWord.szExample && (
                            <View style={[styles.exampleContainer, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.exampleText, { color: colors.text }]}>
                                    {renderHighlightedExample(
                                        stCurrentQuestion.stWord.szExample,
                                        stCurrentQuestion.stWord.szHanzi
                                    )}
                                </Text>
                                <Text style={[styles.examplePinyin, { color: colors.primary }]}>
                                    {stCurrentQuestion.stWord.szExamplePinyin}
                                </Text>
                                <Text style={[styles.exampleMeaning, { color: colors.textSecondary }]}>
                                    {stCurrentQuestion.stWord.szExampleMeaning}
                                </Text>
                            </View>
                        )}

                        {/* 단어 제외 토글 */}
                        <TouchableOpacity
                            style={[
                                styles.excludeButton,
                                { backgroundColor: colors.surfaceLight },
                                isWordExcluded(stCurrentQuestion.stWord.szId) &&
                                    { backgroundColor: `${colors.wrong}30` },
                            ]}
                            onPress={() =>
                                toggleWordExclusion(stCurrentQuestion.stWord.szId)
                            }
                        >
                            <Text style={[styles.excludeButtonText, { color: colors.textSecondary }]}>
                                {isWordExcluded(stCurrentQuestion.stWord.szId)
                                    ? '🚫 퀴즈 제외됨 (탭해서 해제)'
                                    : '이 단어 퀴즈에서 제외'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.nextButton, { backgroundColor: colors.primary }]} onPress={handleNext}>
                            <Text style={[styles.nextButtonText, { color: colors.text }]}>
                                {nCurrentIndex < aQuestions.length - 1 ? '다음' : '결과 보기'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                    )}
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
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
        padding: 8,
    },
    progressIndicator: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
    },
    scoreContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    scoreText: {
        fontSize: 14,
        fontWeight: '700',
    },
    progressBar: {
        height: 4,
    },
    progressFill: {
        height: '100%',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    quizTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    quizType: {
        fontSize: 14,
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
        marginBottom: 8,
    },
    questionPinyin: {
        fontSize: 20,
        height: 28,
    },
    optionsContainer: {
        gap: 12,
    },
    option: {
        borderRadius: 12,
        padding: 18,
        borderWidth: 2,
    },
    optionDisabled: {
        opacity: 0.5,
    },
    optionText: {
        fontSize: 18,
        textAlign: 'center',
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
    exampleContainer: {
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 16,
    },
    exampleText: {
        fontSize: 16,
        marginBottom: 4,
        lineHeight: 24,
    },
    examplePinyin: {
        fontSize: 14,
        marginBottom: 4,
    },
    exampleMeaning: {
        fontSize: 14,
    },
    excludeButton: {
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    excludeButtonText: {
        fontSize: 14,
        textAlign: 'center',
    },
    nextButton: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 48,
    },
    nextButtonText: {
        fontSize: 18,
        fontWeight: '700',
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
        marginBottom: 32,
    },
    resultStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
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
    },
    resultStatLabel: {
        fontSize: 14,
        marginTop: 4,
    },
    todayProgress: {
        marginBottom: 32,
    },
    todayProgressText: {
        fontSize: 16,
    },
    resultButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    resultButtonSecondary: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    resultButtonSecondaryText: {
        fontSize: 16,
        fontWeight: '600',
    },
    resultButtonPrimary: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    resultButtonPrimaryText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
