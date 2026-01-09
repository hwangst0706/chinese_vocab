/**
 * @file App.tsx
 * @brief HSK 단어 암기 앱 엔트리 포인트
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

function AppContent(): React.JSX.Element
{
    const { colors, isDark } = useTheme();

    return (
        <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaProvider>
                <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
                <AppNavigator />
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

export default function App(): React.JSX.Element
{
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
