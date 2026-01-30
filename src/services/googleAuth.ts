/**
 * @file googleAuth.ts
 * @brief Google OAuth 2.0 인증 서비스
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleUser, AuthTokens } from '../types/backup';

// OAuth 설정
const GOOGLE_CLIENT_ID_WEB = '__GOOGLE_CLIENT_ID_WEB__';  // Google Cloud Console에서 발급
const GOOGLE_CLIENT_ID_ANDROID = '__GOOGLE_CLIENT_ID_ANDROID__';  // Android용
const GOOGLE_CLIENT_ID_IOS = '__GOOGLE_CLIENT_ID_IOS__';  // iOS용

// AsyncStorage 키
const STORAGE_KEY_TOKENS = 'google_auth_tokens';
const STORAGE_KEY_USER = 'google_user_info';

// OAuth 스코프
const SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/drive.appdata',  // appDataFolder 접근
];

// 브라우저 결과 처리 완료
WebBrowser.maybeCompleteAuthSession();

// Discovery document
const discovery: AuthSession.DiscoveryDocument = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * @brief 플랫폼별 클라이언트 ID 반환
 */
const getClientId = (): string =>
{
    // Expo Go에서 테스트할 때는 Web 클라이언트 ID 사용
    return GOOGLE_CLIENT_ID_WEB;
};

/**
 * @brief 저장된 토큰 로드
 */
export const loadStoredTokens = async (): Promise<AuthTokens | null> =>
{
    try
    {
        const szTokensJson = await AsyncStorage.getItem(STORAGE_KEY_TOKENS);
        if (szTokensJson)
        {
            return JSON.parse(szTokensJson) as AuthTokens;
        }
    }
    catch (error)
    {
        console.error('토큰 로드 실패:', error);
    }
    return null;
};

/**
 * @brief 토큰 저장
 */
export const saveTokens = async (stTokens: AuthTokens): Promise<void> =>
{
    try
    {
        await AsyncStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(stTokens));
    }
    catch (error)
    {
        console.error('토큰 저장 실패:', error);
    }
};

/**
 * @brief 저장된 토큰 삭제
 */
export const clearTokens = async (): Promise<void> =>
{
    try
    {
        await AsyncStorage.removeItem(STORAGE_KEY_TOKENS);
        await AsyncStorage.removeItem(STORAGE_KEY_USER);
    }
    catch (error)
    {
        console.error('토큰 삭제 실패:', error);
    }
};

/**
 * @brief 저장된 사용자 정보 로드
 */
export const loadStoredUser = async (): Promise<GoogleUser | null> =>
{
    try
    {
        const szUserJson = await AsyncStorage.getItem(STORAGE_KEY_USER);
        if (szUserJson)
        {
            return JSON.parse(szUserJson) as GoogleUser;
        }
    }
    catch (error)
    {
        console.error('사용자 정보 로드 실패:', error);
    }
    return null;
};

/**
 * @brief 사용자 정보 저장
 */
export const saveUser = async (stUser: GoogleUser): Promise<void> =>
{
    try
    {
        await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(stUser));
    }
    catch (error)
    {
        console.error('사용자 정보 저장 실패:', error);
    }
};

/**
 * @brief 토큰 만료 확인
 */
export const isTokenExpired = (stTokens: AuthTokens): boolean =>
{
    const dtExpiry = new Date(stTokens.dtExpiry);
    const dtNow = new Date();
    // 5분 여유를 두고 만료 확인
    return dtExpiry.getTime() - dtNow.getTime() < 5 * 60 * 1000;
};

/**
 * @brief Google 사용자 정보 조회
 */
export const fetchUserInfo = async (szAccessToken: string): Promise<GoogleUser | null> =>
{
    try
    {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${szAccessToken}`,
            },
        });

        if (!response.ok)
        {
            throw new Error(`사용자 정보 조회 실패: ${response.status}`);
        }

        const data = await response.json();

        const stUser: GoogleUser = {
            szId: data.id,
            szEmail: data.email,
            szName: data.name,
            szPicture: data.picture,
        };

        await saveUser(stUser);
        return stUser;
    }
    catch (error)
    {
        console.error('사용자 정보 조회 실패:', error);
        return null;
    }
};

/**
 * @brief 액세스 토큰 갱신
 */
export const refreshAccessToken = async (szRefreshToken: string): Promise<AuthTokens | null> =>
{
    try
    {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: getClientId(),
                grant_type: 'refresh_token',
                refresh_token: szRefreshToken,
            }).toString(),
        });

        if (!response.ok)
        {
            throw new Error(`토큰 갱신 실패: ${response.status}`);
        }

        const data = await response.json();

        const dtExpiry = new Date();
        dtExpiry.setSeconds(dtExpiry.getSeconds() + data.expires_in);

        const stNewTokens: AuthTokens = {
            szAccessToken: data.access_token,
            szRefreshToken: szRefreshToken,  // 갱신 토큰은 유지
            dtExpiry: dtExpiry.toISOString(),
        };

        await saveTokens(stNewTokens);
        return stNewTokens;
    }
    catch (error)
    {
        console.error('토큰 갱신 실패:', error);
        return null;
    }
};

/**
 * @brief 유효한 액세스 토큰 가져오기 (필요시 갱신)
 */
export const getValidAccessToken = async (): Promise<string | null> =>
{
    const stTokens = await loadStoredTokens();
    if (!stTokens)
    {
        return null;
    }

    // 토큰이 만료되었으면 갱신
    if (isTokenExpired(stTokens))
    {
        if (stTokens.szRefreshToken)
        {
            const stNewTokens = await refreshAccessToken(stTokens.szRefreshToken);
            if (stNewTokens)
            {
                return stNewTokens.szAccessToken;
            }
        }
        return null;
    }

    return stTokens.szAccessToken;
};

/**
 * @brief Google OAuth 인증 요청 생성
 */
export const useGoogleAuth = () =>
{
    const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'hsk-vocab',
    });

    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: getClientId(),
            scopes: SCOPES,
            redirectUri,
            usePKCE: true,
            extraParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
        discovery
    );

    /**
     * @brief 인증 코드를 토큰으로 교환
     */
    const exchangeCodeForTokens = async (szCode: string, szCodeVerifier: string): Promise<AuthTokens | null> =>
    {
        try
        {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: getClientId(),
                    code: szCode,
                    code_verifier: szCodeVerifier,
                    grant_type: 'authorization_code',
                    redirect_uri: redirectUri,
                }).toString(),
            });

            if (!response.ok)
            {
                const errorData = await response.text();
                throw new Error(`토큰 교환 실패: ${response.status} - ${errorData}`);
            }

            const data = await response.json();

            const dtExpiry = new Date();
            dtExpiry.setSeconds(dtExpiry.getSeconds() + data.expires_in);

            const stTokens: AuthTokens = {
                szAccessToken: data.access_token,
                szRefreshToken: data.refresh_token,
                dtExpiry: dtExpiry.toISOString(),
            };

            await saveTokens(stTokens);
            return stTokens;
        }
        catch (error)
        {
            console.error('토큰 교환 실패:', error);
            return null;
        }
    };

    return {
        request,
        response,
        promptAsync,
        exchangeCodeForTokens,
        redirectUri,
    };
};

/**
 * @brief 로그아웃 (토큰 폐기)
 */
export const signOut = async (): Promise<void> =>
{
    try
    {
        const stTokens = await loadStoredTokens();
        if (stTokens)
        {
            // Google에 토큰 폐기 요청
            await fetch(`https://oauth2.googleapis.com/revoke?token=${stTokens.szAccessToken}`, {
                method: 'POST',
            });
        }
    }
    catch (error)
    {
        console.error('토큰 폐기 실패:', error);
    }
    finally
    {
        await clearTokens();
    }
};
