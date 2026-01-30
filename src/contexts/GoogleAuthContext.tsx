/**
 * @file GoogleAuthContext.tsx
 * @brief Google OAuth 인증 상태 관리 컨텍스트
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GoogleUser, BackupFileInfo } from '../types/backup';
import {
    useGoogleAuth,
    loadStoredTokens,
    loadStoredUser,
    fetchUserInfo,
    signOut,
    getValidAccessToken,
} from '../services/googleAuth';
import { getBackupInfo } from '../services/googleDrive';

interface GoogleAuthContextType
{
    // 상태
    stUser: GoogleUser | null;
    bIsAuthenticated: boolean;
    bIsLoading: boolean;
    szError: string | null;
    stBackupInfo: BackupFileInfo | null;

    // 액션
    signIn: () => Promise<boolean>;
    signOutUser: () => Promise<void>;
    refreshBackupInfo: () => Promise<void>;
    clearError: () => void;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

interface GoogleAuthProviderProps
{
    children: ReactNode;
}

export function GoogleAuthProvider({ children }: GoogleAuthProviderProps): React.JSX.Element
{
    const [stUser, setUser] = useState<GoogleUser | null>(null);
    const [bIsLoading, setIsLoading] = useState(true);
    const [szError, setError] = useState<string | null>(null);
    const [stBackupInfo, setBackupInfo] = useState<BackupFileInfo | null>(null);

    const { request, response, promptAsync, exchangeCodeForTokens } = useGoogleAuth();

    // 초기화: 저장된 인증 정보 로드
    useEffect(() =>
    {
        const initAuth = async () =>
        {
            try
            {
                const stStoredUser = await loadStoredUser();
                const stStoredTokens = await loadStoredTokens();

                if (stStoredUser && stStoredTokens)
                {
                    // 토큰 유효성 확인
                    const szValidToken = await getValidAccessToken();
                    if (szValidToken)
                    {
                        setUser(stStoredUser);
                        // 백업 정보 로드
                        const stInfo = await getBackupInfo();
                        setBackupInfo(stInfo);
                    }
                }
            }
            catch (error)
            {
                console.error('인증 초기화 실패:', error);
            }
            finally
            {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    // OAuth 응답 처리
    useEffect(() =>
    {
        const handleAuthResponse = async () =>
        {
            if (response?.type === 'success' && response.params?.code)
            {
                setIsLoading(true);
                setError(null);

                try
                {
                    // 코드를 토큰으로 교환
                    const codeVerifier = request?.codeVerifier;
                    if (!codeVerifier)
                    {
                        throw new Error('Code verifier가 없습니다');
                    }

                    const stTokens = await exchangeCodeForTokens(response.params.code, codeVerifier);

                    if (stTokens)
                    {
                        // 사용자 정보 가져오기
                        const stUserInfo = await fetchUserInfo(stTokens.szAccessToken);
                        if (stUserInfo)
                        {
                            setUser(stUserInfo);
                            // 백업 정보 로드
                            const stInfo = await getBackupInfo();
                            setBackupInfo(stInfo);
                        }
                        else
                        {
                            throw new Error('사용자 정보를 가져올 수 없습니다');
                        }
                    }
                    else
                    {
                        throw new Error('인증 토큰을 받을 수 없습니다');
                    }
                }
                catch (error)
                {
                    const szErrorMessage = error instanceof Error ? error.message : '로그인 실패';
                    setError(szErrorMessage);
                    console.error('로그인 실패:', error);
                }
                finally
                {
                    setIsLoading(false);
                }
            }
            else if (response?.type === 'error')
            {
                setError(response.error?.message || '인증 오류가 발생했습니다');
                setIsLoading(false);
            }
            else if (response?.type === 'dismiss')
            {
                setIsLoading(false);
            }
        };

        handleAuthResponse();
    }, [response, request, exchangeCodeForTokens]);

    // 로그인
    const signIn = useCallback(async (): Promise<boolean> =>
    {
        if (!request)
        {
            setError('인증 요청을 준비할 수 없습니다');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try
        {
            const result = await promptAsync();
            return result?.type === 'success';
        }
        catch (error)
        {
            const szErrorMessage = error instanceof Error ? error.message : '로그인 실패';
            setError(szErrorMessage);
            setIsLoading(false);
            return false;
        }
    }, [request, promptAsync]);

    // 로그아웃
    const signOutUser = useCallback(async (): Promise<void> =>
    {
        setIsLoading(true);
        try
        {
            await signOut();
            setUser(null);
            setBackupInfo(null);
            setError(null);
        }
        catch (error)
        {
            console.error('로그아웃 실패:', error);
        }
        finally
        {
            setIsLoading(false);
        }
    }, []);

    // 백업 정보 새로고침
    const refreshBackupInfo = useCallback(async (): Promise<void> =>
    {
        if (!stUser) return;

        try
        {
            const stInfo = await getBackupInfo();
            setBackupInfo(stInfo);
        }
        catch (error)
        {
            console.error('백업 정보 새로고침 실패:', error);
        }
    }, [stUser]);

    // 에러 초기화
    const clearError = useCallback(() =>
    {
        setError(null);
    }, []);

    const value: GoogleAuthContextType = {
        stUser,
        bIsAuthenticated: !!stUser,
        bIsLoading,
        szError,
        stBackupInfo,
        signIn,
        signOutUser,
        refreshBackupInfo,
        clearError,
    };

    return (
        <GoogleAuthContext.Provider value={value}>
            {children}
        </GoogleAuthContext.Provider>
    );
}

export function useGoogleAuthContext(): GoogleAuthContextType
{
    const context = useContext(GoogleAuthContext);
    if (context === undefined)
    {
        throw new Error('useGoogleAuthContext must be used within a GoogleAuthProvider');
    }
    return context;
}
