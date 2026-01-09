/**
 * @file ThemeContext
 * @brief 테마 컨텍스트 - 다크/라이트 모드 지원
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors
{
    // 배경
    background: string;
    surface: string;
    surfaceLight: string;

    // 텍스트
    text: string;
    textSecondary: string;
    textMuted: string;

    // 브랜드
    primary: string;
    primaryLight: string;
    primaryDark: string;

    // 악센트
    accent: string;
    secondary: string;

    // 상태
    correct: string;
    wrong: string;
    warning: string;

    // HSK 레벨
    hsk1: string;
    hsk2: string;
    hsk3: string;
    hsk4: string;
    hsk5: string;
    hsk6: string;

    // 기타
    border: string;
    disabled: string;
    shadow: string;
    card: string;
}

const darkColors: ThemeColors = {
    background: '#0A0A0F',
    surface: '#16161D',
    surfaceLight: '#22222D',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    primary: '#EF4444',
    primaryLight: '#F87171',
    primaryDark: '#DC2626',
    accent: '#FBBF24',
    secondary: '#60A5FA',
    correct: '#22C55E',
    wrong: '#EF4444',
    warning: '#F59E0B',
    hsk1: '#22C55E',
    hsk2: '#84CC16',
    hsk3: '#EAB308',
    hsk4: '#F59E0B',
    hsk5: '#F97316',
    hsk6: '#EF4444',
    border: '#2D2D3A',
    disabled: '#4B5563',
    shadow: '#000000',
    card: '#1E1E28',
};

const lightColors: ThemeColors = {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceLight: '#F1F5F9',
    text: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    primary: '#DC2626',
    primaryLight: '#EF4444',
    primaryDark: '#B91C1C',
    accent: '#D97706',
    secondary: '#3B82F6',
    correct: '#16A34A',
    wrong: '#DC2626',
    warning: '#D97706',
    hsk1: '#16A34A',
    hsk2: '#65A30D',
    hsk3: '#CA8A04',
    hsk4: '#D97706',
    hsk5: '#EA580C',
    hsk6: '#DC2626',
    border: '#E2E8F0',
    disabled: '#CBD5E1',
    shadow: '#64748B',
    card: '#FFFFFF',
};

interface ThemeContextType
{
    colors: ThemeColors;
    themeMode: ThemeMode;
    isDark: boolean;
    setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'hsk-vocab-theme';

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element
{
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() =>
    {
        loadTheme();
    }, []);

    const loadTheme = async (): Promise<void> =>
    {
        try
        {
            const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme))
            {
                setThemeModeState(savedTheme as ThemeMode);
            }
        }
        catch (error)
        {
            console.error('Failed to load theme:', error);
        }
        finally
        {
            setIsLoaded(true);
        }
    };

    const setThemeMode = async (mode: ThemeMode): Promise<void> =>
    {
        setThemeModeState(mode);
        try
        {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        }
        catch (error)
        {
            console.error('Failed to save theme:', error);
        }
    };

    const isDark = themeMode === 'system'
        ? systemColorScheme === 'dark'
        : themeMode === 'dark';

    const colors = isDark ? darkColors : lightColors;

    if (!isLoaded)
    {
        return <></>;
    }

    return (
        <ThemeContext.Provider value={{ colors, themeMode, isDark, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType
{
    const context = useContext(ThemeContext);
    if (!context)
    {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

// HSK 레벨 색상 헬퍼
export function getHskLevelColor(nLevel: number, colors: ThemeColors): string
{
    const levelColors: Record<number, string> = {
        1: colors.hsk1,
        2: colors.hsk2,
        3: colors.hsk3,
        4: colors.hsk4,
        5: colors.hsk5,
        6: colors.hsk6,
    };
    return levelColors[nLevel] || colors.primary;
}
