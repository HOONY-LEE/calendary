import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, Link as LinkIcon, Check, X, Moon, Sun, Monitor, Languages, RefreshCw, Info, ExternalLink, AlertTriangle, Download, Cloud } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { useTheme } from "../context/ThemeContext";
import { projectId, publicAnonKey } from "../../lib/supabase-info";
import { getGoogleToken } from "../../lib/google-token";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [tokenScopes, setTokenScopes] = useState<string[]>([]);
  const [loadingScopes, setLoadingScopes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false); // 🔥 마이그레이션 로딩 상태


  // 구글 연동 상태 확인
  useEffect(() => {
    checkGoogleConnection();
  }, []);

  // OAuth 콜백 후 연동 상태 다시 확인
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // migrate=true 또는 api_connect=true 파라미터 확인
      const urlParams = new URLSearchParams(window.location.search);
      const shouldMigrate = urlParams.get('migrate') === 'true';
      const isApiConnect = urlParams.get('api_connect') === 'true';

      // URL에 hash fragment가 있거나 파라미터가 있으면 OAuth 콜백 처리
      if (window.location.hash || shouldMigrate || isApiConnect) {
        console.log('[Settings] OAuth callback detected, checking connection...');
        // 약간의 딜레이 후 연동 상태 재확인
        setTimeout(async () => {
          await checkGoogleConnection();
          // 연동 성공 메시지
          const { data: { session } } = await supabase.auth.getSession();
          if (getGoogleToken(session)) {
            console.log('[Settings] ✅ Google Calendar connected successfully');
            console.log('[Settings] Provider token (first 30 chars):', getGoogleToken(session).substring(0, 30) + '...');

            if (shouldMigrate) {
              // migrate=true: 데이터 일회성 가져오기
              console.log('[Settings] 🔄 Auto-migration triggered');
              toast.success("구글 연동 완료! 데이터를 가져오는 중...");
              window.history.replaceState({}, '', window.location.pathname);
              setIsMigrating(true);
              await performMigration(getGoogleToken(session));
              setIsMigrating(false);
            } else if (isApiConnect) {
              // api_connect=true: API 실시간 연동 완료
              console.log('[Settings] 🔄 API Connect - syncing calendars...');
              window.history.replaceState({}, '', window.location.pathname);
              toast.success("✅ 구글 캘린더 API 연동 완료! 캘린더 페이지에서 구글 일정이 실시간으로 표시됩니다.", { duration: 5000 });
            } else {
              toast.success(t("settings.googleCalendar.connected"));
            }
            
            // 토큰 스코프 확인
            await checkTokenScopes(getGoogleToken(session));
          }
        }, 1000);
      }
      
      // URL 파라미터에서 권한 에러 확인
      const permissionError = urlParams.get('permission_error');
      if (permissionError === 'true') {
        toast.error('🚨 구글 캘린더 권한이 부족합니다. 아래 안내를 따라 재연결하세요.', {
          duration: 8000,
        });
        // URL에서 파라미터 제거
        window.history.replaceState({}, '', window.location.pathname);
      }
    };
    
    handleOAuthCallback();
  }, []);

  const checkTokenScopes = async (accessToken: string) => {
    setLoadingScopes(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
      );
      const data = await response.json();
      
      if (data.scope) {
        const scopes = data.scope.split(' ');
        setTokenScopes(scopes);
        console.log('[Settings] 🔑 Token scopes:', scopes);
        
        // 필요한 스코프 확인
        const hasFullCalendarAccess = scopes.some(
          (scope: string) => scope === 'https://www.googleapis.com/auth/calendar'
        );
        
        if (!hasFullCalendarAccess) {
          console.warn('[Settings] ⚠️ Missing full calendar access scope!');
          toast.warning('구글 캘린더 쓰기 권한이 없습니다. 재연결이 필요합니다.', {
            duration: 5000,
          });
        } else {
          console.log('[Settings] ✅ Full calendar access granted');
        }
      }
    } catch (error) {
      console.error('[Settings] Failed to check token scopes:', error);
    } finally {
      setLoadingScopes(false);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('[Settings] 🔍 Checking Google connection...');
      console.log('[Settings] Session exists?', !!session);
      console.log('[Settings] Provider token exists?', !!getGoogleToken(session));
      
      if (session) {
        // provider_token이 있는지 확인
        const { data: { user } } = await supabase.auth.getUser();
        
        console.log('[Settings] User:', user?.email);
        console.log('[Settings] Identities:', user?.identities?.map(i => i.provider));
        
        // Google identity 확인
        const googleIdentity = user?.identities?.find(
          (identity) => identity.provider === "google"
        );
        
        if (googleIdentity) {
          console.log('[Settings] ✅ Google identity found');
          setIsGoogleConnected(true);
          // provider_token은 세션에서 가져와야 함
          if (getGoogleToken(session)) {
            console.log('[Settings] ✅ Provider token exists (first 30 chars):', getGoogleToken(session).substring(0, 30) + '...');
            setGoogleAccessToken(getGoogleToken(session));
            // 토큰 스코프 확인
            await checkTokenScopes(getGoogleToken(session));
          } else {
            console.log('[Settings] ⚠️ Google identity exists but no provider token');
          }
        } else {
          console.log('[Settings] ❌ No Google identity found');
          setIsGoogleConnected(false);
          setGoogleAccessToken(null);
          setTokenScopes([]);
        }
      }
    } catch (error) {
      console.error("[Settings] Failed to check Google connection:", error);
    }
  };

  const handleConnectGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "openid email profile https://www.googleapis.com/auth/calendar",
          redirectTo: `${window.location.origin}/settings`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Google OAuth error:", error);
        toast.error(t("settings.googleCalendar.connectError"));
      }
    } catch (error) {
      console.error("Failed to connect Google:", error);
      toast.error(t("settings.googleCalendar.connectError"));
    } finally {
      setLoading(false);
    }
  };

  const handleReconnectGoogle = async () => {
    setLoading(true);
    try {
      // 먼저 기존 토큰 무효화 (Google에서)
      if (googleAccessToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${googleAccessToken}`, {
            method: 'POST',
          });
          console.log('[Settings] ✅ Google token revoked');
        } catch (error) {
          console.error('[Settings] Failed to revoke token:', error);
        }
      }

      // 새로운 OAuth 플로우 시작
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "openid email profile https://www.googleapis.com/auth/calendar",
          redirectTo: `${window.location.origin}/settings`,
          queryParams: {
            access_type: "offline",
            prompt: "consent", // 항상 동의 화면 표시
          },
        },
      });

      if (error) {
        console.error("Google OAuth error:", error);
        toast.error(t("settings.googleCalendar.connectError"));
      } else {
        toast.info('구글 로그인 페이지로 이동합니다...');
      }
    } catch (error) {
      console.error("Failed to reconnect Google:", error);
      toast.error(t("settings.googleCalendar.connectError"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setLoading(true);
    try {
      // 구글 토큰 무효화
      if (googleAccessToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${googleAccessToken}`, {
            method: 'POST',
          });
          console.log('[Settings] ✅ Google token revoked');
        } catch (error) {
          console.error('[Settings] Failed to revoke token:', error);
        }
      }

      // Supabase 로그아웃 (identity unlink는 현재 지원하지 않음)
      toast.info(t("settings.googleCalendar.disconnectInfo"));
      setIsGoogleConnected(false);
      setGoogleAccessToken(null);
      setTokenScopes([]);
    } catch (error) {
      console.error("Failed to disconnect Google:", error);
      toast.error(t("settings.googleCalendar.disconnectError"));
    } finally {
      setLoading(false);
    }
  };

  // 🔥 구글 캘린더 데이터 마이그레이션 (일회성)
  const handleMigrateGoogleCalendar = async () => {
    setIsMigrating(true);
    try {
      console.log('[Settings] 🔄 Starting Google Calendar migration...');
      
      // 1. 먼저 구글 OAuth 연동 (토큰이 없으면)
      if (!googleAccessToken) {
        console.log('[Settings] No Google token, initiating OAuth...');
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            scopes: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks",
            redirectTo: `${window.location.origin}/settings?migrate=true`,
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          },
        });

        if (error) {
          console.error('[Settings] OAuth failed:', error);
          toast.error("구글 연동에 실패했습니다.");
          setIsMigrating(false);
          return;
        }
        
        toast.info("구글 로그인 페이지로 이동합니다...");
        // OAuth 리다이렉트로 이동하므로 여기서 종료
        return;
      }

      // 2. 토큰이 있으면 스코프 확인
      console.log('[Settings] Checking token scopes for migration...');
      const hasCalendarScope = tokenScopes.some(
        scope => scope === 'https://www.googleapis.com/auth/calendar'
      );
      const hasTasksScope = tokenScopes.some(
        scope => scope === 'https://www.googleapis.com/auth/tasks'
      );
      
      console.log('[Settings] Has calendar scope:', hasCalendarScope);
      console.log('[Settings] Has tasks scope:', hasTasksScope);
      
      // 3. 필요한 스코프가 없으면 재인증
      if (!hasCalendarScope || !hasTasksScope) {
        console.log('[Settings] Missing required scopes, requesting re-authentication...');
        toast.warning('마이그레이션을 위해 추가 권한이 필요합니다. 구글 로그인 페이지로 이동합니다...', {
          duration: 3000,
        });
        
        // 기존 토큰 무효화
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${googleAccessToken}`, {
            method: 'POST',
          });
          console.log('[Settings] ✅ Old token revoked');
        } catch (error) {
          console.error('[Settings] Failed to revoke token:', error);
        }
        
        // 새로운 OAuth 플로우 시작
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            scopes: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks",
            redirectTo: `${window.location.origin}/settings?migrate=true`,
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          },
        });

        if (error) {
          console.error('[Settings] OAuth failed:', error);
          toast.error("구글 재연동에 실패했습니다.");
          setIsMigrating(false);
          return;
        }
        
        // OAuth 리다이렉트로 이동
        return;
      }

      // 4. 스코프가 모두 있으면 바로 마이그레이션 실행
      console.log('[Settings] ✅ All scopes present, proceeding with migration');
      await performMigration(googleAccessToken);
    } catch (error) {
      console.error('[Settings] Migration error:', error);
      toast.error("마이그레이션 중 오류가 발생했습니다.");
    } finally {
      setIsMigrating(false);
    }
  };

  // 실제 마이그레이션 수행
  const performMigration = async (accessToken: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
      return;
    }

    // 서버에 마이그레이션 요청
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-calendar/migrate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-JWT': session.access_token,
          'X-Google-Access-Token': accessToken,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Settings] Migration failed:', errorData);
      toast.error("마이그레이션에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    const result = await response.json();
    console.log('[Settings] ✅ Migration complete:', result);

    toast.success(
      `✅ 마이그레이션 완료!\n이벤트 ${result.eventsCount || 0}개, 태스크 ${result.tasksCount || 0}개를 가져왔습니다.`,
      { duration: 5000 }
    );
  };

  // 🔥 구글 캘린더 API 연동 (실시간 동기화)
  const handleConnectGoogleAPI = async () => {
    setLoading(true);
    try {
      // 이미 토큰이 있으면 OAuth 없이 바로 연동 완료
      if (googleAccessToken) {
        const hasCalendarScope = tokenScopes.some(
          scope => scope === 'https://www.googleapis.com/auth/calendar'
        );

        if (hasCalendarScope) {
          console.log('[Settings] ✅ Already has calendar scope, API connect complete');
          toast.success("✅ 구글 캘린더 API 연동 완료! 캘린더 페이지에서 구글 일정이 실시간으로 표시됩니다.", { duration: 5000 });
          setLoading(false);
          return;
        }
      }

      // 토큰이 없거나 스코프가 부족하면 OAuth 실행
      console.log('[Settings] No valid token, initiating OAuth...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks",
          redirectTo: `${window.location.origin}/settings?api_connect=true`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Google OAuth error:", error);
        toast.error("구글 연동에 실패했습니다.");
      } else {
        toast.info("구글 로그인 페이지로 이동합니다...");
      }
    } catch (error) {
      console.error("Failed to connect Google API:", error);
      toast.error("구글 연동에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 스코프 검사 결과
  const hasFullCalendarAccess = tokenScopes.some(
    scope => scope === 'https://www.googleapis.com/auth/calendar'
  );
  const hasReadOnlyAccess = tokenScopes.some(
    scope => scope === 'https://www.googleapis.com/auth/calendar.readonly'
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">
          {t("settings.title")}
        </h1>

        {/* 🔥 구글 캘린더 연동 방식 선택 섹션 */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            구글 캘린더 연동 방식
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            원하는 연동 방식을 선택하세요.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* 데이터 마이그레이션 */}
            <div className="border rounded-lg p-5 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">
                    구글 캘린더 데이터 가져오기
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    일회성 마이그레이션
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/80">
                    구글 캘린더의 모든 이벤트와 태스크를 한 번에 가져옵니다
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/80">
                    가져온 후에는 Calendary에서만 독립적으로 관리됩니다
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/80">
                    구글과 실시간 동기화되지 않으며, 이후 구글 연동이 필요 없습니다
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    <strong>추천:</strong> 구글에서 완전히 독립하여 사용하고 싶은 경우
                  </p>
                </div>
              </div>

              <Button
                onClick={handleMigrateGoogleCalendar}
                disabled={isMigrating}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    데이터 가져오는 중...
                  </>
                ) : !isGoogleConnected ? (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    구글 연동 후 데이터 가져오기
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    데이터 가져오기
                  </>
                )}
              </Button>
            </div>

            {/* API 실시간 연동 */}
            <div className="border rounded-lg p-5 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">
                    구글 캘린더 API 연동하기
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    실시간 동기화
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/80">
                    구글 캘린더 및 Tasks와 실시간으로 동기화됩니다
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/80">
                    Calendary에서 수정하면 구글에도 자동으로 반영됩니다
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/80">
                    구글에서 수정한 내용도 Calendary에 실시간 반영됩니다
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    <strong>추천:</strong> 구글과 계속 동기화하며 사용하고 싶은 경우
                  </p>
                </div>
              </div>

              <Button
                onClick={handleConnectGoogleAPI}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Cloud className="w-4 h-4 mr-2" />
                API 연동하기
              </Button>
              
              {isGoogleConnected && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center">
                  ✅ 이미 구글과 연동되어 있습니다
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* 테마 설정 섹션 */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("settings.theme.title")}
          </h2>
          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? "default" : "outline"}
              onClick={() => setTheme('light')}
            >
              <Sun className="w-4 h-4 mr-2" />
              {t("settings.theme.light")}
            </Button>
            <Button
              variant={theme === 'dark' ? "default" : "outline"}
              onClick={() => setTheme('dark')}
            >
              <Moon className="w-4 h-4 mr-2" />
              {t("settings.theme.dark")}
            </Button>
            <Button
              variant={theme === 'system' ? "default" : "outline"}
              onClick={() => setTheme('system')}
            >
              <Monitor className="w-4 h-4 mr-2" />
              {t("settings.systemTheme")}
            </Button>
          </div>
        </Card>

        {/* 언어 설정 섹션 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("settings.language.title")}
          </h2>
          <div className="flex gap-2">
            <Button
              variant={i18n.language === "ko" ? "default" : "outline"}
              onClick={() => i18n.changeLanguage("ko")}
            >
              <Languages className="w-4 h-4 mr-2" />
              한국어
            </Button>
            <Button
              variant={i18n.language === "en" ? "default" : "outline"}
              onClick={() => i18n.changeLanguage("en")}
            >
              <Languages className="w-4 h-4 mr-2" />
              English
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}