/**
 * @file backup.ts
 * @brief Google Drive 백업/복원 관련 타입 정의
 */

import { WordProgress, DailyStats, Settings, ReviewTestSettings, ReviewTestRecord } from './index';

/**
 * @brief 백업 데이터 구조
 */
export interface BackupData
{
    // 메타 정보
    szVersion: string;         // 백업 버전
    dtCreated: string;         // 생성 시간 (ISO string)
    szDeviceInfo?: string;     // 디바이스 정보

    // 학습 데이터
    wordProgress: Record<string, WordProgress>;
    dailyStats: Record<string, DailyStats>;
    reviewTestRecords: ReviewTestRecord[];

    // 설정 데이터
    settings: Settings;
    reviewTestSettings: ReviewTestSettings;
    aExcludedWords: string[];
}

/**
 * @brief Google Drive 파일 정보
 */
export interface BackupFileInfo
{
    szFileId: string;          // Google Drive 파일 ID
    szFileName: string;        // 파일 이름
    dtModified: string;        // 수정 시간
    nSize: number;             // 파일 크기 (bytes)
}

/**
 * @brief Google 사용자 정보
 */
export interface GoogleUser
{
    szId: string;              // Google 사용자 ID
    szEmail: string;           // 이메일
    szName: string;            // 이름
    szPicture?: string;        // 프로필 사진 URL
}

/**
 * @brief 인증 토큰 정보
 */
export interface AuthTokens
{
    szAccessToken: string;
    szRefreshToken?: string;
    dtExpiry: string;          // 만료 시간 (ISO string)
}

/**
 * @brief 백업 상태
 */
export type BackupStatus = 'idle' | 'loading' | 'backing_up' | 'restoring' | 'success' | 'error';

/**
 * @brief 백업 결과
 */
export interface BackupResult
{
    bSuccess: boolean;
    szMessage: string;
    stFileInfo?: BackupFileInfo;
}

/**
 * @brief 복원 결과
 */
export interface RestoreResult
{
    bSuccess: boolean;
    szMessage: string;
    stBackupData?: BackupData;
}
