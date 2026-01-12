/**
 * @file ReviewQuizScreen
 * @brief 주기적 복습 테스트 화면 - 빈칸채우기, 듣기, 병음 타이핑
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ScrollView,
    TextInput,
    Keyboard,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useTheme, getHskLevelColor } from '../contexts/ThemeContext';
import { useAppStore } from '../store';
import { ReviewQuizQuestion } from '../types';
import {
    generateReviewQuizQuestions,
    getReviewQuizTypeName,
    comparePinyin,
} from '../utils/quiz';

export default function ReviewQuizScreen(): React.JSX.Element
{
    const navigation = useNavigation<any>();
    const { colors } = useTheme();
    const {
        settings,
        reviewTestSettings,
        getReviewTestWords,
        recordReviewTestResult,
    } = useAppStore();

    const [aQuestions, setQuestions] = useState<ReviewQuizQuestion[]>([]);
    const [nCurrentIndex, setCurrentIndex] = useState(0);
    const [nSelectedOption, setSelectedOption] = useState<number | null>(null);
    const [szPinyinInput, setPinyinInput] = useState('');
    const [bShowResult, setShowResult] = useState(false);
    const [bIsCorrect, setIsCorrect] = useState(false);
    const [nCorrectCount, setCorrectCount] = useState(0);
    const [aWeakWordIds, setWeakWordIds] = useState<string[]>([]);
    const [bQuizFinished, setQuizFinished] = useState(false);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const resultScaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() =>
    {
        initializeQuiz();
    }, []);

    useEffect(() =>
    {
        if (aQuestions.length > 0)
        {
            Animated.timing(progressAnim, {
                toValue: (nCurrentIndex + 1) / aQuestions.length,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    }, [nCurrentIndex, aQuestions.length]);

    useEffect(() =>
    {
        if (bQuizFinished)
        {
            resultScaleAnim.setValue(0);
            Animated.spring(resultScaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }
    }, [bQuizFinished]);

    // 듣기 퀴즈: 자동 재생
    useEffect(() =>
    {
        if (aQuestions.length > 0 && !bShowResult)
        {
            const stQuestion = aQuestions[nCurrentIndex];
            if (stQuestion?.type === 'listening' && settings.bSoundEnabled)
            {
                const timeout = setTimeout(() =>
                {
                    Speech.speak(stQuestion.stWord.szHanzi, {
                        language: 'zh-CN',
                        rate: 0.8,
                    });
                }, 300);
                return () => clearTimeout(timeout);
            }
        }
    }, [nCurrentIndex, aQuestions, bShowResult]);

    const initializeQuiz = (): void =>
    {
        const nCount = reviewTestSettings.nQuestionCount;
        const aWordIds = getReviewTestWords(nCount);

        if (aWordIds.length < 5)
        {
            Alert.alert(
                '학습한 단어 부족',
                '복습 테스트를 진행하려면 최소 10개 이상의 단어를 학습해야 합니다.',
                [{ text: '확인', onPress: () => navigation.goBack() }]
            );
            return;
        }

        const aGeneratedQuestions = generateReviewQuizQuestions(aWordIds, nCount);
        setQuestions(aGeneratedQuestions);
        setCurrentIndex(0);
        setCorrectCount(0);
        setWeakWordIds([]);
        setShowResult(false);
        setBIsCorrect(false);
        setNSelectedOption(null);
        setPinyinInput('');
        setQuizFinished(false);
    };

    const setBIsCorrect = setIsCorrect;
    const setNSelectedOption = setSelectedOption;

    const stCurrentQuestion = aQuestions[nCurrentIndex];

    const handlePlaySound = (): void =>
    {
        if (stCurrentQuestion && settings.bSoundEnabled)
        {
            Speech.speak(stCurrentQuestion.stWord.szHanzi, {
                language: 'zh-CN',
                rate: 0.8,
            });
        }
    };

    const handleSelectOption = (nIndex: number): void =>
    {
        if (bShowResult) return;

        setSelectedOption(nIndex);
        const bCorrect = nIndex === stCurrentQuestion.nCorrectIndex;
        processAnswer(bCorrect);
    };

    const handleSubmitPinyin = (): void =>
    {
        if (bShowResult || !szPinyinInput.trim()) return;

        Keyboard.dismiss();
        const bCorrect = comparePinyin(szPinyinInput, stCurrentQuestion.szCorrectPinyin || '', true);
        processAnswer(bCorrect);
    };

    const processAnswer = (bCorrect: boolean): void =>
    {
        setIsCorrect(bCorrect);
        setShowResult(true);

        if (settings.bVibrationEnabled)
        {
            if (bCorrect)
            {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            else
            {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        }

        if (settings.bSoundEnabled)
        {
            Speech.speak(stCurrentQuestion.stWord.szHanzi, {
                language: 'zh-CN',
                rate: 0.8,
            });
        }

        if (bCorrect)
        {
            setCorrectCount((prev) => prev + 1);
        }
        else
        {
            setWeakWordIds((prev) => [...prev, stCurrentQuestion.stWord.szId]);
        }
    };

    const handleNext = (): void =>
    {
        if (nCurrentIndex < aQuestions.length - 1)
        {
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
                setPinyinInput('');
                setShowResult(false);
                setIsCorrect(false);
            }, 150);
        }
        else
        {
            // 테스트 완료 - 결과 기록
            recordReviewTestResult(
                aQuestions.length,
                nCorrectCount + (bIsCorrect ? 1 : 0),
                aWeakWordIds
            );
            setQuizFinished(true);
        }
    };

    const handleFinish = (): void =>
    {
        navigation.goBack();
    };

    // 로딩
    if (aQuestions.length === 0)
    {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        문제 준비 중...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // 결과 화면
    if (bQuizFinished)
    {
        const nAccuracy = Math.round((nCorrectCount / aQuestions.length) * 100);

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
                        {nAccuracy >= 90 ? '🏆' : nAccuracy >= 70 ? '🎉' : nAccuracy >= 50 ? '👍' : '💪'}
                    </Text>
                    <Text style={[styles.resultTitle, { color: colors.text }]}>
                        복습 테스트 완료!
                    </Text>

                    <View style={[styles.resultStats, { backgroundColor: colors.surface }]}>
                        <View style={styles.resultStatItem}>
                            <Text style={[styles.resultStatValue, { color: colors.correct }]}>
                                {nCorrectCount}
                            </Text>
                            <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>
                                정답
                            </Text>
                        </View>
                        <View style={styles.resultStatItem}>
                            <Text style={[styles.resultStatValue, { color: colors.wrong }]}>
                                {aQuestions.length - nCorrectCount}
                            </Text>
                            <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>
                                오답
                            </Text>
                        </View>
                        <View style={styles.resultStatItem}>
                            <Text style={[styles.resultStatValue, { color: colors.accent }]}>
                                {nAccuracy}%
                            </Text>
                            <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>
                                정답률
                            </Text>
                        </View>
                    </View>

                    {aWeakWordIds.length > 0 && (
                        <View style={[styles.weakWordsContainer, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.weakWordsTitle, { color: colors.text }]}>
                                복습이 필요한 단어 ({aWeakWordIds.length}개)
                            </Text>
                            <Text style={[styles.weakWordsHint, { color: colors.textSecondary }]}>
                                틀린 단어는 일일 학습에서 우선 복습됩니다
                            </Text>
                        </View>
                    )}

                    <View style={styles.gradeContainer}>
                        <Text style={[styles.gradeLabel, { color: colors.textSecondary }]}>
                            등급
                        </Text>
                        <Text style={[styles.gradeValue, { color: colors.accent }]}>
                            {nAccuracy >= 90 ? 'A+' : nAccuracy >= 80 ? 'A' : nAccuracy >= 70 ? 'B' : nAccuracy >= 60 ? 'C' : 'D'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.finishButton, { backgroundColor: colors.primary }]}
                        onPress={handleFinish}
                    >
                        <Text style={[styles.finishButtonText, { color: '#FFFFFF' }]}>
                            홈으로 돌아가기
                        </Text>
                    </TouchableOpacity>
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
                    <Text style={[styles.scoreText, { color: colors.background }]}>
                        {nCorrectCount}점
                    </Text>
                </View>
            </View>

            {/* 프로그레스 바 */}
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
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    {/* 퀴즈 타입 표시 */}
                    <View style={styles.quizTypeContainer}>
                        <View style={[styles.quizTypeBadge, { backgroundColor: colors.surfaceLight }]}>
                            <Text style={[styles.quizTypeText, { color: colors.primary }]}>
                                {getReviewQuizTypeName(stCurrentQuestion.type)}
                            </Text>
                        </View>
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

                    {/* 빈칸 채우기 */}
                    {stCurrentQuestion.type === 'fill_blank' && (
                        <View style={styles.questionContainer}>
                            <Text style={[styles.fillBlankLabel, { color: colors.textSecondary }]}>
                                빈칸에 들어갈 단어는?
                            </Text>
                            <View style={[styles.sentenceContainer, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.sentenceText, { color: colors.text }]}>
                                    {stCurrentQuestion.szQuestionText}
                                </Text>
                                {stCurrentQuestion.stWord.szExampleMeaning && (
                                    <Text style={[styles.sentenceMeaning, { color: colors.textSecondary }]}>
                                        ({stCurrentQuestion.stWord.szExampleMeaning})
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* 듣기 퀴즈 */}
                    {stCurrentQuestion.type === 'listening' && (
                        <View style={styles.questionContainer}>
                            <Text style={[styles.listeningLabel, { color: colors.textSecondary }]}>
                                발음을 듣고 알맞은 한자를 고르세요
                            </Text>
                            <TouchableOpacity
                                style={[styles.playButton, { backgroundColor: colors.primary }]}
                                onPress={handlePlaySound}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.playButtonIcon}>🔊</Text>
                                <Text style={[styles.playButtonText, { color: '#FFFFFF' }]}>
                                    발음 듣기
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* 병음 타이핑 */}
                    {stCurrentQuestion.type === 'pinyin_typing' && (
                        <View style={styles.questionContainer}>
                            <Text style={[styles.pinyinLabel, { color: colors.textSecondary }]}>
                                이 한자의 병음을 입력하세요
                            </Text>
                            <Text style={[styles.hanziDisplay, { color: colors.text }]}>
                                {stCurrentQuestion.stWord.szHanzi}
                            </Text>
                            <Text style={[styles.meaningHint, { color: colors.textSecondary }]}>
                                ({stCurrentQuestion.stWord.szMeaning})
                            </Text>
                            <TextInput
                                style={[
                                    styles.pinyinInput,
                                    {
                                        backgroundColor: colors.surface,
                                        color: colors.text,
                                        borderColor: bShowResult
                                            ? (bIsCorrect ? colors.correct : colors.wrong)
                                            : colors.surface,
                                    },
                                ]}
                                value={szPinyinInput}
                                onChangeText={setPinyinInput}
                                placeholder="병음 입력 (예: nǐ hǎo)"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!bShowResult}
                                onSubmitEditing={handleSubmitPinyin}
                                returnKeyType="done"
                            />
                            {!bShowResult && (
                                <TouchableOpacity
                                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                                    onPress={handleSubmitPinyin}
                                    disabled={!szPinyinInput.trim()}
                                >
                                    <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>
                                        확인
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* 선택지 (빈칸채우기, 듣기) */}
                    {(stCurrentQuestion.type === 'fill_blank' || stCurrentQuestion.type === 'listening') &&
                        stCurrentQuestion.aOptions && (
                        <View style={styles.optionsContainer}>
                            {stCurrentQuestion.aOptions.map((szOption, nIndex) => (
                                <TouchableOpacity
                                    key={nIndex}
                                    style={[
                                        styles.option,
                                        { backgroundColor: colors.surface, borderColor: colors.surface },
                                        bShowResult && nIndex === stCurrentQuestion.nCorrectIndex && {
                                            borderColor: colors.correct,
                                            backgroundColor: `${colors.correct}20`,
                                        },
                                        bShowResult && nIndex === nSelectedOption && nIndex !== stCurrentQuestion.nCorrectIndex && {
                                            borderColor: colors.wrong,
                                            backgroundColor: `${colors.wrong}20`,
                                        },
                                    ]}
                                    onPress={() => handleSelectOption(nIndex)}
                                    disabled={bShowResult}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            { color: colors.text },
                                            bShowResult && nIndex === stCurrentQuestion.nCorrectIndex && {
                                                color: colors.correct,
                                                fontWeight: '700',
                                            },
                                        ]}
                                    >
                                        {szOption}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* 결과 피드백 */}
                    {bShowResult && (
                        <View style={styles.feedbackContainer}>
                            <Text
                                style={[
                                    styles.feedbackText,
                                    { color: bIsCorrect ? colors.correct : colors.wrong },
                                ]}
                            >
                                {bIsCorrect ? '정답입니다! 👏' : '오답입니다 😢'}
                            </Text>

                            {!bIsCorrect && (
                                <View style={[styles.answerReveal, { backgroundColor: colors.surface }]}>
                                    <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>
                                        정답:
                                    </Text>
                                    <Text style={[styles.answerHanzi, { color: colors.text }]}>
                                        {stCurrentQuestion.stWord.szHanzi}
                                    </Text>
                                    <Text style={[styles.answerPinyin, { color: colors.primary }]}>
                                        {stCurrentQuestion.stWord.szPinyin}
                                    </Text>
                                    <Text style={[styles.answerMeaning, { color: colors.textSecondary }]}>
                                        {stCurrentQuestion.stWord.szMeaning}
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.replayButton, { backgroundColor: colors.surfaceLight }]}
                                onPress={handlePlaySound}
                            >
                                <Text style={[styles.replayButtonText, { color: colors.primary }]}>
                                    🔊 발음 듣기
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* 하단 다음 버튼 */}
            {bShowResult && (
                <View style={[styles.bottomButtonContainer, { backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.nextButton, { backgroundColor: colors.primary }]}
                        onPress={handleNext}
                    >
                        <Text style={[styles.nextButtonText, { color: '#FFFFFF' }]}>
                            {nCurrentIndex < aQuestions.length - 1 ? '다음 →' : '결과 보기'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
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
        paddingBottom: 100,
    },
    quizTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 24,
    },
    quizTypeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    quizTypeText: {
        fontSize: 14,
        fontWeight: '600',
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
        marginBottom: 32,
    },
    // 빈칸 채우기
    fillBlankLabel: {
        fontSize: 16,
        marginBottom: 16,
    },
    sentenceContainer: {
        width: '100%',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    sentenceText: {
        fontSize: 24,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 36,
    },
    sentenceMeaning: {
        fontSize: 14,
        marginTop: 12,
        textAlign: 'center',
    },
    // 듣기 퀴즈
    listeningLabel: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 20,
        borderRadius: 16,
        gap: 12,
    },
    playButtonIcon: {
        fontSize: 32,
    },
    playButtonText: {
        fontSize: 18,
        fontWeight: '600',
    },
    // 병음 타이핑
    pinyinLabel: {
        fontSize: 16,
        marginBottom: 16,
    },
    hanziDisplay: {
        fontSize: 72,
        fontWeight: '700',
        marginBottom: 8,
    },
    meaningHint: {
        fontSize: 16,
        marginBottom: 24,
    },
    pinyinInput: {
        width: '100%',
        fontSize: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 2,
        textAlign: 'center',
        marginBottom: 16,
    },
    submitButton: {
        paddingHorizontal: 48,
        paddingVertical: 14,
        borderRadius: 12,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    // 선택지
    optionsContainer: {
        gap: 12,
    },
    option: {
        borderRadius: 12,
        padding: 18,
        borderWidth: 2,
    },
    optionText: {
        fontSize: 20,
        textAlign: 'center',
    },
    // 피드백
    feedbackContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    feedbackText: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    answerReveal: {
        width: '100%',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    answerLabel: {
        fontSize: 14,
        marginBottom: 8,
    },
    answerHanzi: {
        fontSize: 36,
        fontWeight: '700',
        marginBottom: 4,
    },
    answerPinyin: {
        fontSize: 18,
        marginBottom: 4,
    },
    answerMeaning: {
        fontSize: 16,
    },
    replayButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    replayButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    bottomButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    nextButton: {
        width: '100%',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
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
        fontSize: 28,
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
    weakWordsContainer: {
        width: '100%',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    weakWordsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    weakWordsHint: {
        fontSize: 14,
    },
    gradeContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    gradeLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    gradeValue: {
        fontSize: 48,
        fontWeight: '800',
    },
    finishButton: {
        paddingHorizontal: 48,
        paddingVertical: 16,
        borderRadius: 12,
    },
    finishButtonText: {
        fontSize: 18,
        fontWeight: '700',
    },
});
