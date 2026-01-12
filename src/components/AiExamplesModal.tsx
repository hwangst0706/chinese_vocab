/**
 * @file AiExamplesModal
 * @brief AI 생성 예문 및 Q&A 모달
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store';
import { Word } from '../types';
import { generateExamples, askQuestion, GeneratedExample } from '../services/gemini';

interface AiExamplesModalProps
{
    bVisible: boolean;
    onClose: () => void;
    stWord: Word;
}

interface ChatMessage
{
    role: 'user' | 'assistant';
    content: string;
}

export default function AiExamplesModal({
    bVisible,
    onClose,
    stWord,
}: AiExamplesModalProps): React.JSX.Element
{
    const { colors } = useTheme();
    const { settings } = useAppStore();

    const [bLoading, setLoading] = useState(false);
    const [aExamples, setExamples] = useState<GeneratedExample[]>([]);
    const [szError, setError] = useState('');

    // Q&A 상태
    const [szQuestion, setQuestion] = useState('');
    const [aChatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [bAsking, setAsking] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);

    // 모달 열릴 때 예문 생성
    useEffect(() =>
    {
        if (bVisible && aExamples.length === 0 && !bLoading)
        {
            handleGenerateExamples();
        }
    }, [bVisible]);

    // 모달 닫힐 때 상태 초기화
    useEffect(() =>
    {
        if (!bVisible)
        {
            setExamples([]);
            setError('');
            setChatHistory([]);
            setQuestion('');
        }
    }, [bVisible]);

    const handleGenerateExamples = async (): Promise<void> =>
    {
        setLoading(true);
        setError('');

        const result = await generateExamples(settings.szGeminiApiKey, stWord);

        if (result.szError)
        {
            setError(result.szError);
        }
        else if (result.aExamples)
        {
            setExamples(result.aExamples);
        }

        setLoading(false);
    };

    const handleAskQuestion = async (): Promise<void> =>
    {
        if (!szQuestion.trim() || bAsking) return;

        const szUserQuestion = szQuestion.trim();
        setQuestion('');
        setAsking(true);

        // 사용자 질문 추가
        const aNewHistory: ChatMessage[] = [
            ...aChatHistory,
            { role: 'user', content: szUserQuestion },
        ];
        setChatHistory(aNewHistory);

        // 스크롤 아래로
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        const result = await askQuestion(
            settings.szGeminiApiKey,
            stWord,
            szUserQuestion,
            aChatHistory
        );

        if (result.szAnswer)
        {
            setChatHistory([
                ...aNewHistory,
                { role: 'assistant', content: result.szAnswer },
            ]);
        }
        else if (result.szError)
        {
            setChatHistory([
                ...aNewHistory,
                { role: 'assistant', content: `오류: ${result.szError}` },
            ]);
        }

        setAsking(false);

        // 스크롤 아래로
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleSpeak = (szText: string): void =>
    {
        if (settings.bSoundEnabled)
        {
            Speech.speak(szText, {
                language: 'zh-CN',
                rate: 0.8,
            });
        }
    };

    return (
        <Modal
            visible={bVisible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
                    {/* 헤더 */}
                    <View style={styles.header}>
                        <View style={styles.headerInfo}>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>
                                AI 학습 도우미
                            </Text>
                            <Text style={[styles.headerWord, { color: colors.primary }]}>
                                {stWord.szHanzi} ({stWord.szPinyin})
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>
                                ✕
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* 로딩 */}
                        {bLoading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                                    예문 생성 중...
                                </Text>
                            </View>
                        )}

                        {/* 에러 */}
                        {szError && (
                            <View style={[styles.errorContainer, { backgroundColor: colors.wrong + '20' }]}>
                                <Text style={[styles.errorText, { color: colors.wrong }]}>
                                    {szError}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.retryButton, { backgroundColor: colors.wrong }]}
                                    onPress={handleGenerateExamples}
                                >
                                    <Text style={styles.retryButtonText}>다시 시도</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* 예문 목록 */}
                        {aExamples.length > 0 && (
                            <View style={styles.examplesSection}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                    AI 생성 예문
                                </Text>
                                {aExamples.map((example, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.exampleCard, { backgroundColor: colors.surfaceLight }]}
                                        onPress={() => handleSpeak(example.szSentence)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.exampleHeader}>
                                            <Text style={[styles.exampleNumber, { color: colors.primary }]}>
                                                {index + 1}
                                            </Text>
                                            <Text style={styles.speakIcon}>🔊</Text>
                                        </View>
                                        <Text style={[styles.exampleSentence, { color: colors.text }]}>
                                            {example.szSentence}
                                        </Text>
                                        <Text style={[styles.examplePinyin, { color: colors.primary }]}>
                                            {example.szPinyin}
                                        </Text>
                                        <Text style={[styles.exampleMeaning, { color: colors.textSecondary }]}>
                                            {example.szMeaning}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Q&A 섹션 */}
                        {aExamples.length > 0 && (
                            <View style={styles.qaSection}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                    질문하기
                                </Text>

                                {/* 채팅 히스토리 */}
                                {aChatHistory.map((msg, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.chatBubble,
                                            msg.role === 'user'
                                                ? [styles.userBubble, { backgroundColor: colors.primary }]
                                                : [styles.assistantBubble, { backgroundColor: colors.surfaceLight }],
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.chatText,
                                                { color: msg.role === 'user' ? '#FFFFFF' : colors.text },
                                            ]}
                                        >
                                            {msg.content}
                                        </Text>
                                    </View>
                                ))}

                                {/* 로딩 인디케이터 */}
                                {bAsking && (
                                    <View style={[styles.assistantBubble, styles.chatBubble, { backgroundColor: colors.surfaceLight }]}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* 질문 입력 */}
                    {aExamples.length > 0 && (
                        <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
                            <TextInput
                                style={[styles.questionInput, { backgroundColor: colors.surfaceLight, color: colors.text }]}
                                value={szQuestion}
                                onChangeText={setQuestion}
                                placeholder="예: 打算과 计划의 차이가 뭐야?"
                                placeholderTextColor={colors.textMuted}
                                multiline
                                maxLength={500}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    { backgroundColor: szQuestion.trim() ? colors.primary : colors.surfaceLight },
                                ]}
                                onPress={handleAskQuestion}
                                disabled={!szQuestion.trim() || bAsking}
                            >
                                <Text style={[
                                    styles.sendButtonText,
                                    { color: szQuestion.trim() ? '#FFFFFF' : colors.textMuted },
                                ]}>
                                    전송
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '95%',
        minHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerWord: {
        fontSize: 16,
        marginTop: 4,
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        fontSize: 24,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    errorContainer: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
    retryButton: {
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    examplesSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    exampleCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    exampleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    exampleNumber: {
        fontSize: 14,
        fontWeight: '700',
    },
    speakIcon: {
        fontSize: 16,
    },
    exampleSentence: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    examplePinyin: {
        fontSize: 14,
        marginBottom: 4,
    },
    exampleMeaning: {
        fontSize: 14,
    },
    qaSection: {
        marginBottom: 24,
    },
    chatBubble: {
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        maxWidth: '85%',
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    chatText: {
        fontSize: 14,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    questionInput: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        maxHeight: 100,
    },
    sendButton: {
        borderRadius: 20,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    sendButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
