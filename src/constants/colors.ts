/**
 * @file 색상 상수
 * @brief 앱 전체 색상 테마 (다크 모드)
 */

export const colors = {
    // 배경
    background: '#0D0D0D',
    surface: '#1A1A1A',
    surfaceLight: '#2A2A2A',

    // 텍스트
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#666666',

    // 브랜드
    primary: '#E53935',      // 중국 레드
    primaryLight: '#FF6F60',
    primaryDark: '#AB000D',

    // 악센트
    accent: '#FFD700',       // 골드
    secondary: '#4FC3F7',    // 하늘색

    // 상태
    correct: '#4CAF50',      // 정답 - 녹색
    wrong: '#F44336',        // 오답 - 빨강
    warning: '#FF9800',

    // HSK 레벨 색상
    hsk1: '#4CAF50',         // 초급 - 녹색
    hsk2: '#8BC34A',
    hsk3: '#CDDC39',
    hsk4: '#FFC107',         // 중급 - 노랑
    hsk5: '#FF9800',
    hsk6: '#F44336',         // 고급 - 빨강

    // 기타
    border: '#333333',
    disabled: '#555555',
};

export const hskLevelColors: Record<number, string> = {
    1: colors.hsk1,
    2: colors.hsk2,
    3: colors.hsk3,
    4: colors.hsk4,
    5: colors.hsk5,
    6: colors.hsk6,
};
