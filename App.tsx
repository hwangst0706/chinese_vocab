/**
 * @file App.tsx
 * @brief HSK 단어 암기 앱 엔트리 포인트
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/constants/colors';

export default function App(): React.JSX.Element
{
    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar style="light" backgroundColor={colors.background} />
            <AppNavigator />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
});
