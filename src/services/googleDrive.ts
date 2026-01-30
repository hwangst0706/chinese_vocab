/**
 * @file googleDrive.ts
 * @brief Google Drive REST API v3 서비스
 */

import { BackupData, BackupFileInfo, BackupResult, RestoreResult } from '../types/backup';
import { getValidAccessToken } from './googleAuth';

// Google Drive API 엔드포인트
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

// 백업 파일 설정
const BACKUP_FILE_NAME = 'hsk_vocab_backup.json';
const BACKUP_MIME_TYPE = 'application/json';

// 현재 백업 버전
const BACKUP_VERSION = '1.0.0';

/**
 * @brief 백업 파일 검색 (appDataFolder에서)
 */
export const findBackupFile = async (): Promise<BackupFileInfo | null> =>
{
    const szAccessToken = await getValidAccessToken();
    if (!szAccessToken)
    {
        throw new Error('인증이 필요합니다');
    }

    try
    {
        const szQuery = `name='${BACKUP_FILE_NAME}' and trashed=false`;
        const szFields = 'files(id,name,modifiedTime,size)';

        const response = await fetch(
            `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${encodeURIComponent(szQuery)}&fields=${encodeURIComponent(szFields)}`,
            {
                headers: {
                    Authorization: `Bearer ${szAccessToken}`,
                },
            }
        );

        if (!response.ok)
        {
            throw new Error(`파일 검색 실패: ${response.status}`);
        }

        const data = await response.json();

        if (data.files && data.files.length > 0)
        {
            const file = data.files[0];
            return {
                szFileId: file.id,
                szFileName: file.name,
                dtModified: file.modifiedTime,
                nSize: parseInt(file.size, 10) || 0,
            };
        }

        return null;
    }
    catch (error)
    {
        console.error('백업 파일 검색 실패:', error);
        throw error;
    }
};

/**
 * @brief 백업 파일 내용 다운로드
 */
const downloadBackupFile = async (szFileId: string): Promise<BackupData | null> =>
{
    const szAccessToken = await getValidAccessToken();
    if (!szAccessToken)
    {
        throw new Error('인증이 필요합니다');
    }

    try
    {
        const response = await fetch(
            `${DRIVE_API_BASE}/files/${szFileId}?alt=media`,
            {
                headers: {
                    Authorization: `Bearer ${szAccessToken}`,
                },
            }
        );

        if (!response.ok)
        {
            throw new Error(`파일 다운로드 실패: ${response.status}`);
        }

        const data = await response.json();
        return data as BackupData;
    }
    catch (error)
    {
        console.error('백업 파일 다운로드 실패:', error);
        throw error;
    }
};

/**
 * @brief 새 백업 파일 생성
 */
const createBackupFile = async (stBackupData: BackupData): Promise<BackupFileInfo> =>
{
    const szAccessToken = await getValidAccessToken();
    if (!szAccessToken)
    {
        throw new Error('인증이 필요합니다');
    }

    try
    {
        // multipart/related 요청 생성
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const metadata = {
            name: BACKUP_FILE_NAME,
            mimeType: BACKUP_MIME_TYPE,
            parents: ['appDataFolder'],
        };

        const requestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            `Content-Type: ${BACKUP_MIME_TYPE}\r\n\r\n` +
            JSON.stringify(stBackupData) +
            closeDelimiter;

        const response = await fetch(
            `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,modifiedTime,size`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${szAccessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body: requestBody,
            }
        );

        if (!response.ok)
        {
            const errorData = await response.text();
            throw new Error(`파일 생성 실패: ${response.status} - ${errorData}`);
        }

        const data = await response.json();

        return {
            szFileId: data.id,
            szFileName: data.name,
            dtModified: data.modifiedTime,
            nSize: parseInt(data.size, 10) || 0,
        };
    }
    catch (error)
    {
        console.error('백업 파일 생성 실패:', error);
        throw error;
    }
};

/**
 * @brief 기존 백업 파일 업데이트
 */
const updateBackupFile = async (szFileId: string, stBackupData: BackupData): Promise<BackupFileInfo> =>
{
    const szAccessToken = await getValidAccessToken();
    if (!szAccessToken)
    {
        throw new Error('인증이 필요합니다');
    }

    try
    {
        const response = await fetch(
            `${DRIVE_UPLOAD_API}/files/${szFileId}?uploadType=media&fields=id,name,modifiedTime,size`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${szAccessToken}`,
                    'Content-Type': BACKUP_MIME_TYPE,
                },
                body: JSON.stringify(stBackupData),
            }
        );

        if (!response.ok)
        {
            const errorData = await response.text();
            throw new Error(`파일 업데이트 실패: ${response.status} - ${errorData}`);
        }

        const data = await response.json();

        return {
            szFileId: data.id,
            szFileName: data.name,
            dtModified: data.modifiedTime,
            nSize: parseInt(data.size, 10) || 0,
        };
    }
    catch (error)
    {
        console.error('백업 파일 업데이트 실패:', error);
        throw error;
    }
};

/**
 * @brief 백업 생성 (Store 데이터로부터)
 */
export const createBackup = async (
    wordProgress: Record<string, any>,
    dailyStats: Record<string, any>,
    reviewTestRecords: any[],
    settings: any,
    reviewTestSettings: any,
    aExcludedWords: string[]
): Promise<BackupResult> =>
{
    try
    {
        // 백업 데이터 구성
        const stBackupData: BackupData = {
            szVersion: BACKUP_VERSION,
            dtCreated: new Date().toISOString(),
            szDeviceInfo: 'HSK Vocab App',
            wordProgress,
            dailyStats,
            reviewTestRecords,
            settings,
            reviewTestSettings,
            aExcludedWords,
        };

        // 기존 백업 파일 확인
        const stExistingFile = await findBackupFile();

        let stFileInfo: BackupFileInfo;

        if (stExistingFile)
        {
            // 기존 파일 업데이트
            stFileInfo = await updateBackupFile(stExistingFile.szFileId, stBackupData);
        }
        else
        {
            // 새 파일 생성
            stFileInfo = await createBackupFile(stBackupData);
        }

        return {
            bSuccess: true,
            szMessage: '백업이 완료되었습니다',
            stFileInfo,
        };
    }
    catch (error)
    {
        const szErrorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        return {
            bSuccess: false,
            szMessage: `백업 실패: ${szErrorMessage}`,
        };
    }
};

/**
 * @brief 백업 복원
 */
export const restoreBackup = async (): Promise<RestoreResult> =>
{
    try
    {
        // 백업 파일 검색
        const stFileInfo = await findBackupFile();

        if (!stFileInfo)
        {
            return {
                bSuccess: false,
                szMessage: '백업 파일을 찾을 수 없습니다',
            };
        }

        // 백업 파일 다운로드
        const stBackupData = await downloadBackupFile(stFileInfo.szFileId);

        if (!stBackupData)
        {
            return {
                bSuccess: false,
                szMessage: '백업 파일을 읽을 수 없습니다',
            };
        }

        // 버전 호환성 확인 (필요시 마이그레이션)
        if (!stBackupData.szVersion)
        {
            return {
                bSuccess: false,
                szMessage: '호환되지 않는 백업 파일입니다',
            };
        }

        return {
            bSuccess: true,
            szMessage: '백업 데이터를 불러왔습니다',
            stBackupData,
        };
    }
    catch (error)
    {
        const szErrorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        return {
            bSuccess: false,
            szMessage: `복원 실패: ${szErrorMessage}`,
        };
    }
};

/**
 * @brief 백업 정보 조회
 */
export const getBackupInfo = async (): Promise<BackupFileInfo | null> =>
{
    try
    {
        return await findBackupFile();
    }
    catch (error)
    {
        console.error('백업 정보 조회 실패:', error);
        return null;
    }
};

/**
 * @brief 백업 파일 삭제
 */
export const deleteBackup = async (): Promise<boolean> =>
{
    const szAccessToken = await getValidAccessToken();
    if (!szAccessToken)
    {
        throw new Error('인증이 필요합니다');
    }

    try
    {
        const stFileInfo = await findBackupFile();
        if (!stFileInfo)
        {
            return true;  // 이미 없음
        }

        const response = await fetch(
            `${DRIVE_API_BASE}/files/${stFileInfo.szFileId}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${szAccessToken}`,
                },
            }
        );

        return response.ok || response.status === 404;
    }
    catch (error)
    {
        console.error('백업 삭제 실패:', error);
        return false;
    }
};
