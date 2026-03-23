import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar as CalendarIcon,
  Check,
  X,
  Moon,
  Sun,
  Monitor,
  Languages,
  RefreshCw,
  Info,
  Download,
  Cloud,
  Palette,
  Globe,
  User,
} from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { projectId, publicAnonKey } from "../../lib/supabase-info";
import { getGoogleToken } from "../../lib/google-token";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "./ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

type SettingsTab = "google" | "theme" | "language" | "account";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("google");
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [tokenScopes, setTokenScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // 다이얼로그 열릴 때 구글 연동 상태 확인
  useEffect(() => {
    if (open) {
      checkGoogleConnection();
    }
  }, [open]);

  const checkTokenScopes = async (accessToken: string) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
      );
      const data = await response.json();
      if (data.scope) {
        const scopes = data.scope.split(" ");
        setTokenScopes(scopes);
      }
    } catch (error) {
      console.error("[Settings] Failed to check token scopes:", error);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        const googleIdentity = user?.identities?.find(
          (identity) => identity.provider === "google"
        );
        if (googleIdentity) {
          setIsGoogleConnected(true);
          if (getGoogleToken(session)) {
            setGoogleAccessToken(getGoogleToken(session));
            await checkTokenScopes(getGoogleToken(session)!);
          }
        } else {
          setIsGoogleConnected(false);
          setGoogleAccessToken(null);
          setTokenScopes([]);
        }
      }
    } catch (error) {
      console.error("[Settings] Failed to check Google connection:", error);
    }
  };

  const handleMigrateGoogleCalendar = async () => {
    setIsMigrating(true);
    try {
      if (!googleAccessToken) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            scopes: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks",
            redirectTo: `${window.location.origin}/calendar?migrate=true`,
            queryParams: { access_type: "offline", prompt: "consent" },
          },
        });
        if (error) toast.error("구글 연동에 실패했습니다.");
        else toast.info("구글 로그인 페이지로 이동합니다...");
        setIsMigrating(false);
        return;
      }

      const hasCalendarScope = tokenScopes.some(
        (scope) => scope === "https://www.googleapis.com/auth/calendar"
      );
      const hasTasksScope = tokenScopes.some(
        (scope) => scope === "https://www.googleapis.com/auth/tasks"
      );

      if (!hasCalendarScope || !hasTasksScope) {
        if (googleAccessToken) {
          try {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${googleAccessToken}`, { method: "POST" });
          } catch {}
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            scopes: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks",
            redirectTo: `${window.location.origin}/calendar?migrate=true`,
            queryParams: { access_type: "offline", prompt: "consent" },
          },
        });
        if (error) toast.error("구글 재연동에 실패했습니다.");
        setIsMigrating(false);
        return;
      }

      await performMigration(googleAccessToken);
    } catch (error) {
      console.error("[Settings] Migration error:", error);
      toast.error("마이그레이션 중 오류가 발생했습니다.");
    } finally {
      setIsMigrating(false);
    }
  };

  const performMigration = async (accessToken: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
      return;
    }
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-calendar/migrate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-JWT": session.access_token,
          "X-Google-Access-Token": accessToken,
        },
      }
    );
    if (!response.ok) {
      toast.error("마이그레이션에 실패했습니다. 다시 시도해주세요.");
      return;
    }
    const result = await response.json();
    toast.success(
      `마이그레이션 완료! 이벤트 ${result.eventsCount || 0}개, 태스크 ${result.tasksCount || 0}개를 가져왔습니다.`,
      { duration: 5000 }
    );
  };

  const handleConnectGoogleAPI = async () => {
    setLoading(true);
    try {
      if (googleAccessToken) {
        const hasCalendarScope = tokenScopes.some(
          (scope) => scope === "https://www.googleapis.com/auth/calendar"
        );
        if (hasCalendarScope) {
          toast.success("구글 캘린더 API 연동 완료! 캘린더 페이지에서 구글 일정이 실시간으로 표시됩니다.", { duration: 5000 });
          setLoading(false);
          return;
        }
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks",
          redirectTo: `${window.location.origin}/calendar?api_connect=true`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) toast.error("구글 연동에 실패했습니다.");
      else toast.info("구글 로그인 페이지로 이동합니다...");
    } catch (error) {
      toast.error("구글 연동에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "google", label: t("settings.tabs.googleCalendar"), icon: <CalendarIcon className="w-4 h-4" /> },
    { id: "theme", label: t("settings.tabs.theme"), icon: <Palette className="w-4 h-4" /> },
    { id: "language", label: t("settings.tabs.language"), icon: <Globe className="w-4 h-4" /> },
    { id: "account", label: t("settings.tabs.account"), icon: <User className="w-4 h-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%] bg-background border rounded-xl shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200 w-[90vw] max-w-[680px]"
        >
          {/* Close button */}
          <DialogPrimitive.Close className="absolute top-4 left-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <DialogTitle className="sr-only">
            {t("settings.appSettings")}
          </DialogTitle>

          {/* Content */}
          <div className="flex min-h-[420px] pt-12 pb-6">
            {/* Left nav */}
            <nav className="w-[170px] flex-shrink-0 px-4 border-r border-border">
              <div className="space-y-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeTab === tab.id
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Right content */}
            <div className="flex-1 px-6 overflow-y-auto">
              {activeTab === "google" && (
                <div>
                  <h2 className="text-base font-semibold mb-4">
                    {t("settings.googleCalendar.integrationMethod")}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    {t("settings.googleCalendar.chooseMethod")}
                  </p>

                  <div className="space-y-4">
                    {/* 데이터 가져오기 */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-1.5 bg-green-50 dark:bg-green-950 rounded-lg">
                          <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-sm mb-0.5">
                            {t("settings.googleCalendar.importTitle")}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {t("settings.googleCalendar.importDesc")}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-3 ml-0">
                        {[
                          t("settings.googleCalendar.importFeature1"),
                          t("settings.googleCalendar.importFeature2"),
                          t("settings.googleCalendar.importFeature3"),
                        ].map((text, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-foreground/80">{text}</p>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={handleMigrateGoogleCalendar}
                        disabled={isMigrating}
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isMigrating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                            {t("settings.googleCalendar.importing")}
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 mr-2" />
                            {!isGoogleConnected ? t("settings.googleCalendar.connectAndImport") : t("settings.googleCalendar.importData")}
                          </>
                        )}
                      </Button>
                    </div>

                    {/* API 연동 */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-sm mb-0.5">
                            {t("settings.googleCalendar.apiTitle")}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {t("settings.googleCalendar.apiDesc")}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-3 ml-0">
                        {[
                          t("settings.googleCalendar.apiFeature1"),
                          t("settings.googleCalendar.apiFeature2"),
                          t("settings.googleCalendar.apiFeature3"),
                        ].map((text, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-foreground/80">{text}</p>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={handleConnectGoogleAPI}
                        disabled={loading}
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Cloud className="w-3.5 h-3.5 mr-2" />
                        {t("settings.googleCalendar.connectApi")}
                      </Button>
                      {isGoogleConnected && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center">
                          {t("settings.googleCalendar.alreadyConnected")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "theme" && (
                <div>
                  <h2 className="text-base font-semibold mb-4">
                    {t("settings.theme.title")}
                  </h2>
                  <div className="space-y-1">
                    {([
                      { value: "light" as const, icon: <Sun className="w-4 h-4" />, label: t("settings.theme.light") },
                      { value: "dark" as const, icon: <Moon className="w-4 h-4" />, label: t("settings.theme.dark") },
                      { value: "system" as const, icon: <Monitor className="w-4 h-4" />, label: t("settings.systemTheme") },
                    ]).map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setTheme(item.value)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          theme === item.value
                            ? "bg-muted font-medium"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          {item.label}
                        </div>
                        {theme === item.value && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "language" && (
                <div>
                  <h2 className="text-base font-semibold mb-4">
                    {t("settings.language.title")}
                  </h2>
                  <div className="space-y-1">
                    {([
                      { value: "ko", label: "한국어" },
                      { value: "en", label: "English" },
                      { value: "zh", label: "中文" },
                    ]).map((item) => (
                      <button
                        key={item.value}
                        onClick={() => i18n.changeLanguage(item.value)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          i18n.language === item.value
                            ? "bg-muted font-medium"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Languages className="w-4 h-4" />
                          {item.label}
                        </div>
                        {i18n.language === item.value && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "account" && (
                <div>
                  <h2 className="text-base font-semibold mb-4">
                    {t("settings.tabs.account")}
                  </h2>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      onOpenChange(false);
                      await signOut();
                    }}
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                  >
                    {t("settings.signOut")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
