/**
 * @file AppNavigator
 * @brief 앱 네비게이션 설정
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import QuizScreen from '../screens/QuizScreen';
import ReviewQuizScreen from '../screens/ReviewQuizScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatsScreen from '../screens/StatsScreen';
import ExcludedWordsScreen from '../screens/ExcludedWordsScreen';
import MostWrongWordsScreen from '../screens/MostWrongWordsScreen';
import LeechWordsScreen from '../screens/LeechWordsScreen';
import WordListScreen from '../screens/WordListScreen';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ szIcon, bFocused }: { szIcon: string; bFocused: boolean }): React.JSX.Element
{
    return (
        <View style={styles.tabIconContainer}>
            <Text style={[styles.tabIcon, bFocused && styles.tabIconFocused]}>
                {szIcon}
            </Text>
        </View>
    );
}

function HomeTabs(): React.JSX.Element
{
    const { colors } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: '홈',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon szIcon="🏠" bFocused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Stats"
                component={StatsScreen}
                options={{
                    tabBarLabel: '통계',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon szIcon="📊" bFocused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: '설정',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon szIcon="⚙️" bFocused={focused} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

function MainNavigator(): React.JSX.Element
{
    const { colors } = useTheme();

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="MainTabs" component={HomeTabs} />
            <Stack.Screen
                name="Quiz"
                component={QuizScreen}
                options={{ gestureEnabled: false }}
            />
            <Stack.Screen
                name="ReviewQuiz"
                component={ReviewQuizScreen}
                options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="ExcludedWords" component={ExcludedWordsScreen} />
            <Stack.Screen name="MostWrongWords" component={MostWrongWordsScreen} />
            <Stack.Screen name="LeechWords" component={LeechWordsScreen} />
            <Stack.Screen name="WordList" component={WordListScreen} />
        </Stack.Navigator>
    );
}

export default function AppNavigator(): React.JSX.Element
{
    return (
        <NavigationContainer>
            <MainNavigator />
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabIcon: {
        fontSize: 20,
        opacity: 0.6,
    },
    tabIconFocused: {
        opacity: 1,
    },
});
