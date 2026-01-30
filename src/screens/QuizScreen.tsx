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
    Alert,
    TextInput,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useTheme, getHskLevelColor } from '../contexts/ThemeContext';
import { useAppStore } from '../store';
import { QuizQuestion, Word } from '../types';
import { getWordById } from '../data';
import {
    generateQuizQuestions,
    getQuestionText,
    getQuestionDisplay,
    getQuizTypeName,
    isTypingQuiz,
    comparePinyin,
} from '../utils/quiz';
import AiExamplesModal from '../components/AiExamplesModal';

type LearningPhase = 'preview' | 'quiz' | 'result';

// 집중 복습 모드 타입
type FocusedMode = 'wrong_words' | 'leech_words';

// Route params 타입
type QuizRouteParams = {
    Quiz: {
        aFocusedWordIds?: string[];      // 집중 복습할 단어 ID 목록
        szFocusedMode?: FocusedMode;     // 집중 복습 모드
    };
};

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
    const route = useRoute<RouteProp<QuizRouteParams, 'Quiz'>>();
    const { colors } = useTheme();
    const {
        settings,
        getSessionWords,
        getNewWords,
        updateWordProgress,
        getTodayStats,
        toggleWordExclusion,
        isWordExcluded,
        getSavedQuizSession,
        saveQuizSession,
        clearQuizSession,
    } = useAppStore();

    // 집중 복습 모드 확인
    const aFocusedWordIds = route.params?.aFocusedWordIds;
    const szFocusedMode = route.params?.szFocusedMode;
    const bIsFocusedMode = !!aFocusedWordIds && aFocusedWordIds.length > 0;

    // Phase 관리
    const [szPhase, setPhase] = useState<LearningPhase>('preview');

    // 미리보기용 새 단어
    const [aNewWords, setNewWords] = useState<Word[]>([]);
    const [nPreviewIndex, setPreviewIndex] = useState(0);

    // 퀴즈 상태
    const [aQuestions, setQuestions] = useState<QuizQuestion[]>([]);
    const [nCurrentIndex, setCurrentIndex] = useState(0);
    const [nSelectedOption, setSelectedOption] = useState<number | null>(null);
    const [bShowResult, setShowResult] = useState(false);
    const [nCorrectCount, setCorrectCount] = useState(0);

    // 타이핑 퀴즈 상태
    const [szTypedAnswer, setTypedAnswer] = useState('');
    const [bTypingCorrect, setTypingCorrect] = useState<boolean | null>(null);

    // AI 모달 상태
    const [bAiModalVisible, setAiModalVisible] = useState(false);

    // 세션 정보
    const [nReviewCount, setReviewCount] = useState(0);
    const [nNewCount, setNewCount] = useState(0);

    const [fadeAnim] = useState(new Animated.Value(1));
    const progressAnim = useRef(new Animated.Value(0)).current;
    const feedbackAnim = useRef(new Animated.Value(0)).current;
    const resultScaleAnim = useRef(new Animated.Value(0)).current;
    const cardFlipAnim = useRef(new Animated.Value(0)).current;

    useEffect(() =>
    {
        // 집중 복습 모드가 아닐 때만 저장된 세션 확인
        if (!bIsFocusedMode)
        {
            const stSavedSession = getSavedQuizSession();
            if (stSavedSession)
            {
                // 저장된 세션이 있으면 이어하기 여부 확인
                Alert.alert(
                    '이어서 학습하기',
                    `이전에 학습하던 내용이 있습니다.\n(${stSavedSession.nCurrentIndex}/${stSavedSession.aQuestions.length}문제 진행)\n\n이어서 학습하시겠습니까?`,
                    [
                        {
                            text: '처음부터',
                            style: 'destructive',
                            onPress: () =>
                            {
                                clearQuizSession();
                                initializeSession();
                            },
                        },
                        {
                            text: '이어하기',
                            style: 'default',
                            onPress: () => restoreSession(stSavedSession),
                        },
                    ]
                );
                return;
            }
        }
        initializeSession();
    }, []);

    // 프로그레스 바 애니메이션 (퀴즈 단계)
    useEffect(() =>
    {
        if (szPhase === 'quiz' && aQuestions.length > 0)
        {
            Animated.timing(progressAnim, {
                toValue: (nCurrentIndex + 1) / aQuestions.length,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        }
    }, [nCurrentIndex, aQuestions.length, szPhase]);

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
        if (szPhase === 'result')
        {
            resultScaleAnim.setValue(0);
            Animated.spring(resultScaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }
    }, [szPhase]);

    // 미리보기: 단어 카드 표시 시 자동 발음 재생
    useEffect(() =>
    {
        if (szPhase === 'preview' && aNewWords.length > 0 && settings.bSoundEnabled)
        {
            const stWord = aNewWords[nPreviewIndex];
            if (stWord)
            {
                // 약간의 딜레이 후 재생 (화면 전환 후)
                const timeout = setTimeout(() =>
                {
                    Speech.speak(stWord.szHanzi, {
                        language: 'zh-CN',
                        rate: 0.8,
                    });
                }, 300);
                return () => clearTimeout(timeout);
            }
        }
    }, [szPhase, nPreviewIndex, aNewWords]);

    /**
     * @brief 세션 초기화 - 복습/새 단어 분리 및 미리보기 준비
     */
    const initializeSession = (): void =>
    {
        // 집중 복습 모드 처리
        if (bIsFocusedMode && aFocusedWordIds)
        {
            initializeFocusedSession();
            return;
        }

        const nQuizCount = settings.nDailyGoal;
        const { aReviewWordIds, aNewWordIds } = getSessionWords(nQuizCount);

        // 새 단어 객체 배열 생성 (미리보기용)
        const aNewWordObjects = aNewWordIds
            .map((szId) => getWordById(szId))
            .filter((w): w is Word => w !== null);

        setNewWords(aNewWordObjects);
        setNewCount(aNewWordIds.length);
        setReviewCount(aReviewWordIds.length);

        // 전체 퀴즈 생성 (복습 + 새 단어 섞기)
        const aAllWordIds = [...aReviewWordIds, ...aNewWordIds];
        const aShuffledIds = aAllWordIds.sort(() => Math.random() - 0.5);
        const aGeneratedQuestions = generateQuizQuestions(aShuffledIds);

        setQuestions(aGeneratedQuestions);
        setPreviewIndex(0);
        setCurrentIndex(0);
        setSelectedOption(null);
        setShowResult(false);
        setCorrectCount(0);
        setTypedAnswer('');
        setTypingCorrect(null);
        progressAnim.setValue(0);

        // 상황별 알림 처리
        if (aReviewWordIds.length === 0 && aNewWordIds.length === 0)
        {
            // 케이스 3: 복습도 없고 새 단어도 없음 (현재 단어장 완료)
            Alert.alert(
                '단어장 학습 완료! 🎉',
                '현재 선택한 단어장의 모든 단어를 학습했어요!\n\n다른 단어장을 추가해서 계속 실력을 키워보세요!',
                [
                    { text: '설정으로 이동', onPress: () => navigation.navigate('Settings') },
                    { text: '홈으로', onPress: () => navigation.goBack() },
                ]
            );
            return;
        }
        else if (aNewWordIds.length === 0 && aReviewWordIds.length > 0)
        {
            // 케이스 2: 새 단어 없음 (현재 단어장 새 단어 완료, 복습만 남음)
            if (aReviewWordIds.length >= nQuizCount)
            {
                // 복습이 많아서 새 단어 못 배우는 경우
                Alert.alert(
                    '복습 우선 모드 📚',
                    '오늘은 복습할 단어가 많아서 새 단어 없이 복습만 진행합니다.\n\n복습을 마치면 새 단어를 배울 수 있어요!',
                    [{ text: '복습 시작', style: 'default' }]
                );
            }
            else
            {
                // 진짜 새 단어가 없는 경우 (단어장 완료)
                Alert.alert(
                    '새 단어 학습 완료! 🎊',
                    '현재 선택한 단어장의 새 단어를 모두 학습했어요!\n\n다른 단어장을 추가하거나, 복습으로 실력을 다져보세요!',
                    [{ text: '확인', style: 'default' }]
                );
            }
            setPhase('quiz');
        }
        else if (aNewWordObjects.length === 0)
        {
            // 새 단어가 없으면 바로 퀴즈로
            setPhase('quiz');
        }
        else
        {
            setPhase('preview');
        }
    };

    /**
     * @brief 집중 복습 세션 초기화 (오답노트/Leech 단어)
     */
    const initializeFocusedSession = (): void =>
    {
        if (!aFocusedWordIds || aFocusedWordIds.length === 0)
        {
            Alert.alert('알림', '복습할 단어가 없습니다.');
            navigation.goBack();
            return;
        }

        // 집중 복습 모드: 미리보기 없이 바로 퀴즈
        setNewWords([]);
        setNewCount(0);
        setReviewCount(aFocusedWordIds.length);

        // 셔플하여 퀴즈 생성
        const aShuffledIds = [...aFocusedWordIds].sort(() => Math.random() - 0.5);
        const aGeneratedQuestions = generateQuizQuestions(aShuffledIds);

        setQuestions(aGeneratedQuestions);
        setPreviewIndex(0);
        setCurrentIndex(0);
        setSelectedOption(null);
        setShowResult(false);
        setCorrectCount(0);
        setTypedAnswer('');
        setTypingCorrect(null);
        progressAnim.setValue(0);

        // 집중 복습 시작 안내
        const szModeTitle = szFocusedMode === 'leech_words' ? 'Leech 단어 집중 복습' : '오답 단어 집중 복습';
        Alert.alert(
            szModeTitle,
            `${aFocusedWordIds.length}개 단어를 집중 복습합니다.`,
            [{ text: '시작', style: 'default' }]
        );

        setPhase('quiz');
    };

    /**
     * @brief 저장된 세션 복원
     */
    const restoreSession = (stSession: typeof getSavedQuizSession extends () => infer R ? NonNullable<R> : never): void =>
    {
        setQuestions(stSession.aQuestions);
        setCurrentIndex(stSession.nCurrentIndex);
        setCorrectCount(stSession.nCorrectCount);
        setReviewCount(stSession.nReviewCount);
        setNewCount(stSession.nNewCount);
        setNewWords([]);  // 미리보기는 건너뛰기
        setPreviewIndex(0);
        setSelectedOption(null);
        setShowResult(false);
        setTypedAnswer('');
        setTypingCorrect(null);
        progressAnim.setValue(stSession.nCurrentIndex / stSession.aQuestions.length);
        setPhase('quiz');
    };

    /**
     * @brief 현재 세션 저장 (뒤로가기 시)
     */
    const saveCurrentSession = useCallback((): void =>
    {
        // 집중 복습 모드나 결과 화면에서는 저장하지 않음
        if (bIsFocusedMode || szPhase === 'result' || aQuestions.length === 0) return;

        // 퀴즈가 진행 중일 때만 저장
        if (szPhase === 'quiz' && nCurrentIndex < aQuestions.length)
        {
            const szToday = new Date().toISOString().split('T')[0];
            saveQuizSession({
                szDate: szToday,
                aQuestions,
                nCurrentIndex,
                nCorrectCount,
                nReviewCount,
                nNewCount,
            });
        }
    }, [bIsFocusedMode, szPhase, aQuestions, nCurrentIndex, nCorrectCount, nReviewCount, nNewCount, saveQuizSession]);

    // 화면 이탈 시 세션 저장
    useEffect(() =>
    {
        const unsubscribe = navigation.addListener('beforeRemove', () =>
        {
            saveCurrentSession();
        });

        return unsubscribe;
    }, [navigation, saveCurrentSession]);

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

        // TTS: 정답/오답 모두 한자 읽어주기
        if (settings.bSoundEnabled)
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

    /**
     * @brief 타이핑 퀴즈 제출 핸들러
     */
    const handleSubmitTyping = (): void =>
    {
        if (bShowResult || !stCurrentQuestion?.szCorrectAnswer) return;

        Keyboard.dismiss();
        setShowResult(true);

        // 성조 엄격 모드에 따라 비교
        const bIgnoreTone = !settings.bToneStrictMode;
        const bIsCorrect = comparePinyin(szTypedAnswer, stCurrentQuestion.szCorrectAnswer, bIgnoreTone);

        setTypingCorrect(bIsCorrect);

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

        // TTS: 정답 병음 읽어주기
        if (settings.bSoundEnabled)
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
                setTypedAnswer('');
                setTypingCorrect(null);
            }, 150);
        }
        else
        {
            // 퀴즈 완료 시 세션 삭제
            clearQuizSession();
            setPhase('result');
        }
    };

    const handleFinish = (): void =>
    {
        navigation.goBack();
    };

    const handleRetry = (): void =>
    {
        initializeSession();
    };

    /**
     * @brief 미리보기에서 다음 카드로 이동
     */
    const handleNextPreview = (): void =>
    {
        if (nPreviewIndex < aNewWords.length - 1)
        {
            cardFlipAnim.setValue(0);
            setPreviewIndex((prev) => prev + 1);
        }
        else
        {
            // 미리보기 완료 → 퀴즈 시작
            setPhase('quiz');
        }
    };

    /**
     * @brief 미리보기에서 이전 카드로 이동
     */
    const handlePrevPreview = (): void =>
    {
        if (nPreviewIndex > 0)
        {
            cardFlipAnim.setValue(0);
            setPreviewIndex((prev) => prev - 1);
        }
    };

    /**
     * @brief 미리보기 건너뛰기
     */
    const handleSkipPreview = (): void =>
    {
        setPhase('quiz');
    };

    /**
     * @brief 미리보기 카드 발음 재생
     */
    const handlePreviewSpeak = (szHanzi: string): void =>
    {
        if (settings.bSoundEnabled)
        {
            Speech.speak(szHanzi, {
                language: 'zh-CN',
                rate: 0.8,
            });
        }
    };

    /**
     * @brief "알고있어요" 버튼 - 단어 제외 및 대체 단어 추가
     */
    const handleKnowWord = (): void =>
    {
        if (aNewWords.length === 0) return;

        const stCurrentWord = aNewWords[nPreviewIndex];

        // 1. 현재 단어를 제외 목록에 추가
        toggleWordExclusion(stCurrentWord.szId);

        // 2. 대체할 새 단어 1개 가져오기
        const aReplacementIds = getNewWords(1);
        const stReplacementWord = aReplacementIds.length > 0
            ? getWordById(aReplacementIds[0])
            : null;

        // 3. 새 단어 목록 업데이트
        const aUpdatedNewWords = aNewWords.filter((w) => w.szId !== stCurrentWord.szId);
        if (stReplacementWord)
        {
            aUpdatedNewWords.push(stReplacementWord);
        }
        setNewWords(aUpdatedNewWords);
        setNewCount(aUpdatedNewWords.length);

        // 4. 퀴즈 목록에서 제외된 단어 제거하고 대체 단어 추가
        const aUpdatedQuestions = aQuestions.filter(
            (q) => q.stWord.szId !== stCurrentWord.szId
        );
        if (stReplacementWord)
        {
            const aNewQuestions = generateQuizQuestions([stReplacementWord.szId]);
            aUpdatedQuestions.push(...aNewQuestions);
        }
        // 셔플
        setQuestions(aUpdatedQuestions.sort(() => Math.random() - 0.5));

        // 5. 인덱스 조정 (마지막 카드였으면 이전으로)
        if (nPreviewIndex >= aUpdatedNewWords.length && aUpdatedNewWords.length > 0)
        {
            setPreviewIndex(aUpdatedNewWords.length - 1);
        }
        else if (aUpdatedNewWords.length === 0)
        {
            // 새 단어가 모두 없어지면 퀴즈로
            setPhase('quiz');
        }

        // 햅틱 피드백
        if (settings.bVibrationEnabled)
        {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handleReplaySound = (): void =>
    {
        if (stCurrentQuestion)
        {
            Speech.speak(stCurrentQuestion.stWord.szHanzi, {
                language: 'zh-CN',
                rate: 0.8,
            });
        }
    };

    // 로딩 중
    if (aQuestions.length === 0 && aNewWords.length === 0)
    {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>문제 준비 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // 미리보기 단계
    if (szPhase === 'preview' && aNewWords.length > 0)
    {
        const stCurrentWord = aNewWords[nPreviewIndex];

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                {/* 헤더 */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleFinish}>
                        <Text style={[styles.closeButton, { color: colors.textSecondary }]}>✕</Text>
                    </TouchableOpacity>
                    <View style={[styles.progressIndicator, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.progressText, { color: colors.text }]}>
                            새 단어 {nPreviewIndex + 1} / {aNewWords.length}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleSkipPreview}>
                        <Text style={[styles.skipButton, { color: colors.primary }]}>건너뛰기</Text>
                    </TouchableOpacity>
                </View>

                {/* 프로그레스 바 */}
                <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${((nPreviewIndex + 1) / aNewWords.length) * 100}%`,
                                backgroundColor: colors.accent,
                            },
                        ]}
                    />
                </View>

                {/* 단어 카드 */}
                <View style={styles.previewContainer}>
                    <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                        오늘의 새 단어를 먼저 훑어보세요
                    </Text>

                    <View style={[styles.wordCard, { backgroundColor: colors.surface }]}>
                        <View
                            style={[
                                styles.cardLevelBadge,
                                { backgroundColor: getHskLevelColor(stCurrentWord.nLevel, colors) },
                            ]}
                        >
                            <Text style={styles.cardLevelText}>HSK {stCurrentWord.nLevel}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => handlePreviewSpeak(stCurrentWord.szHanzi)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.cardHanzi, { color: colors.text }]}>
                                {stCurrentWord.szHanzi}
                            </Text>
                        </TouchableOpacity>

                        <Text style={[styles.cardPinyin, { color: colors.primary }]}>
                            {stCurrentWord.szPinyin}
                        </Text>

                        <Text style={[styles.cardMeaning, { color: colors.textSecondary }]}>
                            {stCurrentWord.szMeaning}
                        </Text>

                        {stCurrentWord.szExample && (
                            <View style={[styles.cardExample, { backgroundColor: colors.surfaceLight }]}>
                                <Text style={[styles.cardExampleText, { color: colors.text }]}>
                                    {stCurrentWord.szExample}
                                </Text>
                                <Text style={[styles.cardExamplePinyin, { color: colors.primary }]}>
                                    {stCurrentWord.szExamplePinyin}
                                </Text>
                                <Text style={[styles.cardExampleMeaning, { color: colors.textSecondary }]}>
                                    {stCurrentWord.szExampleMeaning}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.exampleSpeakButton, { backgroundColor: colors.surface }]}
                                    onPress={() => handlePreviewSpeak(stCurrentWord.szExample!)}
                                >
                                    <Text style={[styles.exampleSpeakButtonText, { color: colors.primary }]}>
                                        🔊 예문 듣기
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.cardButtonRow}>
                            <TouchableOpacity
                                style={[styles.speakButton, { backgroundColor: colors.surfaceLight }]}
                                onPress={() => handlePreviewSpeak(stCurrentWord.szHanzi)}
                            >
                                <Text style={[styles.speakButtonText, { color: colors.primary }]}>
                                    🔊 발음 듣기
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.knowButton, { backgroundColor: colors.correct + '20', borderColor: colors.correct }]}
                                onPress={handleKnowWord}
                            >
                                <Text style={[styles.knowButtonText, { color: colors.correct }]}>
                                    ✓ 알고있어요
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 네비게이션 버튼 */}
                    <View style={styles.previewNav}>
                        <TouchableOpacity
                            style={[
                                styles.prevButton,
                                { backgroundColor: colors.surface },
                                nPreviewIndex === 0 && styles.buttonDisabled,
                            ]}
                            onPress={handlePrevPreview}
                            disabled={nPreviewIndex === 0}
                        >
                            <Text style={[
                                styles.prevButtonText,
                                { color: colors.text },
                                nPreviewIndex === 0 && { color: colors.textMuted },
                            ]}>
                                ← 이전
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.nextPreviewButton, { backgroundColor: colors.primary }]}
                            onPress={handleNextPreview}
                        >
                            <Text style={[styles.nextPreviewButtonText, { color: '#FFFFFF' }]}>
                                {nPreviewIndex < aNewWords.length - 1 ? '다음 →' : '퀴즈 시작 →'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.previewHint, { color: colors.textMuted }]}>
                        복습 {nReviewCount}개 + 새 단어 {nNewCount}개 = 총 {nReviewCount + nNewCount}단어 ({aQuestions.length}문제)
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // 퀴즈 완료
    if (szPhase === 'result')
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
                        stCurrentQuestion.type !== 'hanzi_to_pinyin' &&
                        stCurrentQuestion.type !== 'meaning_to_pinyin' && (
                        <Text style={[styles.questionPinyin, { color: colors.textSecondary }]}>
                            {(settings.bShowPinyin || bShowResult)
                                ? stCurrentQuestion.stWord.szPinyin
                                : ''}
                        </Text>
                    )}
                    {/* 타이핑 퀴즈: 한자 힌트 표시 */}
                    {isTypingQuiz(stCurrentQuestion.type) && (
                        <Text style={[styles.questionHanzi, { color: colors.textMuted }]}>
                            {stCurrentQuestion.stWord.szHanzi}
                        </Text>
                    )}
                </View>

                {/* 타이핑 퀴즈 입력 */}
                {isTypingQuiz(stCurrentQuestion.type) ? (
                    <View style={styles.typingContainer}>
                        <TextInput
                            style={[
                                styles.typingInput,
                                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                                bShowResult && bTypingCorrect && { borderColor: colors.correct },
                                bShowResult && !bTypingCorrect && { borderColor: colors.wrong },
                            ]}
                            value={szTypedAnswer}
                            onChangeText={setTypedAnswer}
                            placeholder="병음을 입력하세요 (예: nǐ hǎo)"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!bShowResult}
                            onSubmitEditing={handleSubmitTyping}
                            returnKeyType="done"
                        />
                        <Text style={[styles.typingHint, { color: colors.textMuted }]}>
                            {settings.bToneStrictMode
                                ? '성조 포함 입력 (nǐ hǎo 또는 ni3 hao3)'
                                : '성조 없이 입력 가능 (ni hao)'}
                        </Text>
                        {!bShowResult && (
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    { backgroundColor: szTypedAnswer.trim() ? colors.primary : colors.surfaceLight },
                                ]}
                                onPress={handleSubmitTyping}
                                disabled={!szTypedAnswer.trim()}
                                activeOpacity={0.8}
                            >
                                <Text style={[
                                    styles.submitButtonText,
                                    { color: szTypedAnswer.trim() ? '#FFFFFF' : colors.textMuted },
                                ]}>
                                    확인
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    /* 선택지 (애니메이션 버튼) */
                    <View style={styles.optionsContainer}>
                        {stCurrentQuestion.aOptions?.map((szOption, nIndex) => (
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
                )}

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
                                isTypingQuiz(stCurrentQuestion.type)
                                    ? (bTypingCorrect ? { color: colors.correct } : { color: colors.wrong })
                                    : (nSelectedOption === stCurrentQuestion.nCorrectIndex
                                        ? { color: colors.correct }
                                        : { color: colors.wrong }),
                            ]}
                        >
                            {isTypingQuiz(stCurrentQuestion.type)
                                ? (bTypingCorrect
                                    ? '정답입니다! 👏'
                                    : `오답! 정답: ${stCurrentQuestion.szCorrectAnswer}`)
                                : (nSelectedOption === stCurrentQuestion.nCorrectIndex
                                    ? '정답입니다! 👏'
                                    : `오답! 정답: ${stCurrentQuestion.aOptions?.[stCurrentQuestion.nCorrectIndex ?? 0]}`)}
                        </Text>

                        {/* 다시듣기 버튼 */}
                        <TouchableOpacity
                            style={[styles.replayButton, { backgroundColor: colors.surface }]}
                            onPress={handleReplaySound}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.replayButtonText, { color: colors.primary }]}>
                                🔊 다시 듣기
                            </Text>
                        </TouchableOpacity>

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
                                <TouchableOpacity
                                    style={[styles.exampleSpeakButton, { backgroundColor: colors.surfaceLight }]}
                                    onPress={() =>
                                    {
                                        if (settings.bSoundEnabled)
                                        {
                                            Speech.speak(stCurrentQuestion.stWord.szExample!, {
                                                language: 'zh-CN',
                                                rate: 0.8,
                                            });
                                        }
                                    }}
                                >
                                    <Text style={[styles.exampleSpeakButtonText, { color: colors.primary }]}>
                                        🔊 예문 듣기
                                    </Text>
                                </TouchableOpacity>
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

                        {/* AI 예문 생성 버튼 */}
                        <TouchableOpacity
                            style={[styles.aiButton, { backgroundColor: colors.primary + '20' }]}
                            onPress={() =>
                            {
                                if (!settings.szGeminiApiKey)
                                {
                                    Alert.alert(
                                        'API 키 필요',
                                        'AI 예문 생성을 사용하려면 설정에서 Gemini API 키를 입력해주세요.',
                                        [
                                            { text: '취소', style: 'cancel' },
                                            { text: '설정으로 이동', onPress: () => navigation.navigate('Settings') },
                                        ]
                                    );
                                }
                                else
                                {
                                    setAiModalVisible(true);
                                }
                            }}
                        >
                            <Text style={[styles.aiButtonText, { color: colors.primary }]}>
                                ✨ AI로 예문 더 보기
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* 하단 고정 버튼 */}
            {bShowResult && (
                <View style={[styles.bottomButtonContainer, { backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.nextButton, styles.nextButtonFixed, { backgroundColor: colors.primary }]}
                        onPress={handleNext}
                    >
                        <Text style={[styles.nextButtonText, { color: '#FFFFFF' }]}>
                            {nCurrentIndex < aQuestions.length - 1 ? '다음 →' : '결과 보기'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* AI 예문 모달 */}
            {stCurrentQuestion && (
                <AiExamplesModal
                    bVisible={bAiModalVisible}
                    onClose={() => setAiModalVisible(false)}
                    stWord={stCurrentQuestion.stWord}
                />
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
    questionHanzi: {
        fontSize: 24,
        marginTop: 8,
    },
    // 타이핑 퀴즈 스타일
    typingContainer: {
        gap: 16,
    },
    typingInput: {
        borderRadius: 16,
        padding: 18,
        fontSize: 20,
        textAlign: 'center',
        borderWidth: 2,
    },
    typingHint: {
        fontSize: 12,
        textAlign: 'center',
    },
    submitButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: '700',
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
        marginBottom: 12,
    },
    replayButton: {
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    replayButtonText: {
        fontSize: 16,
        fontWeight: '600',
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
    exampleSpeakButton: {
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 16,
        alignSelf: 'center',
    },
    exampleSpeakButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    excludeButton: {
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    excludeButtonText: {
        fontSize: 14,
        textAlign: 'center',
    },
    aiButton: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    aiButtonText: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    nextButton: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 48,
    },
    nextButtonFixed: {
        width: '100%',
        alignItems: 'center',
    },
    nextButtonText: {
        fontSize: 18,
        fontWeight: '700',
    },
    bottomButtonContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
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
    // 미리보기 화면
    skipButton: {
        fontSize: 14,
        fontWeight: '600',
        padding: 8,
    },
    previewContainer: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
    },
    previewLabel: {
        fontSize: 16,
        marginBottom: 20,
    },
    wordCard: {
        width: '100%',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    cardLevelBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 16,
    },
    cardLevelText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    cardHanzi: {
        fontSize: 72,
        fontWeight: '700',
        marginBottom: 12,
    },
    cardPinyin: {
        fontSize: 24,
        marginBottom: 8,
    },
    cardMeaning: {
        fontSize: 20,
        marginBottom: 20,
        textAlign: 'center',
    },
    cardExample: {
        width: '100%',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    cardExampleText: {
        fontSize: 16,
        marginBottom: 4,
        textAlign: 'center',
    },
    cardExamplePinyin: {
        fontSize: 14,
        marginBottom: 4,
        textAlign: 'center',
    },
    cardExampleMeaning: {
        fontSize: 14,
        textAlign: 'center',
    },
    cardButtonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    speakButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    speakButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    knowButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    knowButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    previewNav: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    prevButton: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    prevButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    nextPreviewButton: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    nextPreviewButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    previewHint: {
        fontSize: 14,
    },
});
