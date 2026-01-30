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
import { GoogleAuthProvider } from './src/contexts/GoogleAuthContext';

function AppContent(): React.JSX.Element
{
    const { colors, isDark } = useTheme();

    return (
        <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaProvider>
                <StatusBar hidden={true} />
                <AppNavigator />
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

export default function App(): React.JSX.Element
{
    return (
        <ThemeProvider>
            <GoogleAuthProvider>
                <AppContent />
            </GoogleAuthProvider>
        </ThemeProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
