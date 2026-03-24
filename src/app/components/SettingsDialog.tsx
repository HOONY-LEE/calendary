import { useState, useEffect, useCallback, useRef } from "react";
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
  Clock,
  ChevronDown,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { projectId, publicAnonKey } from "../../lib/supabase-info";
import { getGoogleToken, getGoogleTokenAsync, isGoogleCalendarApiEnabled, setGoogleCalendarApiEnabled, clearAllGoogleData } from "../../lib/google-token";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "./ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";

// 경도 → SVG x 변환 (equirectangular, center=140°E, scale=75, svgWidth=540)
const MAP_CENTER = 140;
const MAP_SCALE_FACTOR = 90 * Math.PI / 180; // ~1.571
const MAP_SVG_CX = 270;
const lonToSvgX = (lon: number): number => {
  let rotated = lon - MAP_CENTER;
  if (rotated < -180) rotated += 360;
  if (rotated > 180) rotated -= 360;
  return MAP_SVG_CX + rotated * MAP_SCALE_FACTOR;
};
const svgXToOffset = (svgX: number): number => {
  const lon = (svgX - MAP_SVG_CX) / MAP_SCALE_FACTOR + MAP_CENTER;
  let norm = ((lon + 180) % 360 + 360) % 360 - 180;
  return Math.max(-12, Math.min(12, Math.round(norm / 15)));
};

// 세계 주요 도시 (세계시계 스타일)
const WORLD_CLOCK_CITIES: {
  tz: string;
  coords: [number, number];
  names: Record<string, string>;
  dx: number;
  dy: number;
  anchor: "start" | "end";
}[] = [
  { tz: "Europe/London", coords: [-0.1, 51.5], names: { ko: "런던", en: "London", zh: "伦敦" }, dx: 5, dy: -6, anchor: "start" },
  { tz: "Europe/Paris", coords: [2.3, 48.9], names: { ko: "파리", en: "Paris", zh: "巴黎" }, dx: -5, dy: 10, anchor: "end" },
  { tz: "Europe/Moscow", coords: [37.6, 55.8], names: { ko: "모스크바", en: "Moscow", zh: "莫斯科" }, dx: 5, dy: -4, anchor: "start" },
  { tz: "Asia/Dubai", coords: [55.3, 25.3], names: { ko: "두바이", en: "Dubai", zh: "迪拜" }, dx: 5, dy: 4, anchor: "start" },
  { tz: "Asia/Jakarta", coords: [106.8, -6.2], names: { ko: "자카르타", en: "Jakarta", zh: "雅加达" }, dx: 5, dy: 4, anchor: "start" },
  { tz: "Asia/Shanghai", coords: [116.4, 39.9], names: { ko: "베이징", en: "Beijing", zh: "北京" }, dx: -5, dy: -8, anchor: "end" },
  { tz: "Asia/Seoul", coords: [127.0, 37.5], names: { ko: "서울", en: "Seoul", zh: "首尔" }, dx: 5, dy: -4, anchor: "start" },
  { tz: "Asia/Tokyo", coords: [139.7, 35.7], names: { ko: "도쿄", en: "Tokyo", zh: "东京" }, dx: 5, dy: 12, anchor: "start" },
  { tz: "Australia/Sydney", coords: [151.2, -33.9], names: { ko: "시드니", en: "Sydney", zh: "悉尼" }, dx: 5, dy: 0, anchor: "start" },
  { tz: "America/Vancouver", coords: [-123.1, 49.3], names: { ko: "밴쿠버", en: "Vancouver", zh: "温哥华" }, dx: 5, dy: -6, anchor: "start" },
  { tz: "America/Los_Angeles", coords: [-118.2, 34.1], names: { ko: "LA", en: "Los Angeles", zh: "洛杉矶" }, dx: 5, dy: 4, anchor: "start" },
  { tz: "America/Mexico_City", coords: [-99.1, 19.4], names: { ko: "멕시코시티", en: "Mexico City", zh: "墨西哥城" }, dx: 5, dy: 4, anchor: "start" },
  { tz: "America/New_York", coords: [-74.0, 40.7], names: { ko: "뉴욕", en: "New York", zh: "纽约" }, dx: 5, dy: -6, anchor: "start" },
  { tz: "America/Sao_Paulo", coords: [-46.6, -23.6], names: { ko: "상파울루", en: "São Paulo", zh: "圣保罗" }, dx: 5, dy: 4, anchor: "start" },
  { tz: "Africa/Johannesburg", coords: [18.4, -33.9], names: { ko: "케이프타운", en: "Cape Town", zh: "开普敦" }, dx: -5, dy: 4, anchor: "end" },
];

// GMT offset 계산
const getGmtOffsetNum = (tz: string): number => {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(now);
    const offset = parts.find((p) => p.type === "timeZoneName")?.value || "";
    if (offset === "GMT") return 0;
    const m = offset.match(/GMT([+-])(\d+)(?::(\d+))?/);
    if (m) return (m[1] === "+" ? 1 : -1) * (parseInt(m[2]) + parseInt(m[3] || "0") / 60);
    return 0;
  } catch { return 0; }
};

// 텍스트 폭 추정 (AM/PM 배지 위치용)
const estimateTextWidth = (text: string, fontSize: number): number => {
  let w = 0;
  for (const c of text) {
    if (/[\u3000-\u9FFF\uAC00-\uD7AF]/.test(c)) w += fontSize * 0.95;
    else if (/[A-Z]/.test(c)) w += fontSize * 0.65;
    else if (/[a-z0-9]/.test(c)) w += fontSize * 0.52;
    else if (c === ":") w += fontSize * 0.3;
    else if (c === " ") w += fontSize * 0.28;
    else w += fontSize * 0.5;
  }
  return w;
};

type SettingsTab = "google" | "timezone" | "theme" | "language" | "account";

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

  // 공휴일 설정
  const [holidayEnabled, setHolidayEnabled] = useState<boolean>(() => {
    return localStorage.getItem("holiday_enabled") === "true";
  });
  const [holidayCountry, setHolidayCountry] = useState<string>(() => {
    return localStorage.getItem("holiday_country") || "KR";
  });
  const [availableCountries, setAvailableCountries] = useState<{ countryCode: string; name: string }[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // 국가 드롭다운 외부 클릭 감지
  useEffect(() => {
    if (!countryDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
        setCountrySearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [countryDropdownOpen]);

  // 국가 목록 로드
  useEffect(() => {
    if (open && availableCountries.length === 0) {
      setLoadingCountries(true);
      fetch("https://date.nager.at/api/v3/AvailableCountries")
        .then((res) => res.json())
        .then((data) => setAvailableCountries(data))
        .catch(() => {})
        .finally(() => setLoadingCountries(false));
    }
  }, [open]);

  // 국가 이름 현지화: Intl.DisplayNames 사용
  const getLocalizedCountryName = useCallback((countryCode: string, englishName: string): string => {
    const lang = i18n.language;
    try {
      const displayNames = new Intl.DisplayNames([lang], { type: "region" });
      const localName = displayNames.of(countryCode);
      if (!localName || localName === countryCode) return englishName;

      if (lang === "en") {
        // 영어: English Name (CC)
        return `${englishName} (${countryCode})`;
      }
      // 기타 언어: 현지이름 (English Name)
      if (localName !== englishName) {
        return `${localName} (${englishName})`;
      }
      return englishName;
    } catch {
      return englishName;
    }
  }, [i18n.language]);

  // 주요 국가 목록 (검색 없을 때 기본 표시)
  const popularCountryCodes = [
    "US", "KR", "GB", "FR", "DE", "JP", "CN", "ES", "IT", "CA",
    "IN", "MX", "BR", "AU", "CH", "NZ", "TH", "VN", "SG",
  ];

  const filteredCountries = countrySearch
    ? availableCountries.filter((c) => {
        const q = countrySearch.toLowerCase();
        const localDisplay = getLocalizedCountryName(c.countryCode, c.name).toLowerCase();
        return localDisplay.includes(q) || c.countryCode.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
      })
    : availableCountries.filter((c) => popularCountryCodes.includes(c.countryCode));

  const handleHolidayToggle = () => {
    const newEnabled = !holidayEnabled;
    setHolidayEnabled(newEnabled);
    localStorage.setItem("holiday_enabled", String(newEnabled));
    toast.success(newEnabled ? t("settings.holiday.enabledToast") : t("settings.holiday.disabledToast"));
    // 캘린더 이벤트 새로고침을 위해 커스텀 이벤트 발행
    window.dispatchEvent(new CustomEvent("holiday-settings-changed"));
  };

  const handleCountryChange = (code: string) => {
    setHolidayCountry(code);
    setCountryDropdownOpen(false);
    setCountrySearch("");
    localStorage.setItem("holiday_country", code);
    if (holidayEnabled) {
      window.dispatchEvent(new CustomEvent("holiday-settings-changed"));
    }
  };

  // 시간대 설정
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [timezone, setTimezone] = useState<string>(() => {
    return localStorage.getItem("app_timezone") || browserTimezone;
  });
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // 지도 마우스 호버 → 시간대 계산
  const handleMapMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * 540;
    setHoveredOffset(svgXToOffset(svgX));
  }, []);

  // 도시 시간 포맷
  const formatCityTime = useCallback((tz: string) => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(now);
    const hour = parts.find((p) => p.type === "hour")?.value || "";
    const minute = parts.find((p) => p.type === "minute")?.value || "";
    const period = parts.find((p) => p.type === "dayPeriod")?.value || "";
    return { time: `${hour}:${minute}`, period };
  }, []);

  // 지도에 표시된 도시들로 시간대 목록 구성
  const mapTimezones = WORLD_CLOCK_CITIES.map((city) => ({
    tz: city.tz,
    names: city.names,
  }));

  const filteredTimezones = timezoneSearch
    ? mapTimezones.filter((item) => {
        const q = timezoneSearch.toLowerCase();
        return (
          item.tz.toLowerCase().includes(q) ||
          Object.values(item.names).some((n) => n.toLowerCase().includes(q))
        );
      })
    : mapTimezones;

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem("app_timezone", tz);
    toast.success(
      ({ ko: "시간대가 변경되었습니다.", en: "Timezone updated.", zh: "时区已更新。" } as Record<string, string>)[i18n.language] || "Timezone updated."
    );
  };

  const handleResetTimezone = () => {
    setTimezone(browserTimezone);
    localStorage.removeItem("app_timezone");
    setTimezoneSearch("");
    toast.success(
      ({ ko: "브라우저 시간대로 복원되었습니다.", en: "Reset to browser timezone.", zh: "已恢复为浏览器时区。" } as Record<string, string>)[i18n.language] || "Reset to browser timezone."
    );
  };

  // 시간대 표시 포맷
  const formatTimezoneOffset = (tz: string) => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      });
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find((p) => p.type === "timeZoneName");
      return offsetPart?.value || "";
    } catch {
      return "";
    }
  };

  // 다이얼로그 열릴 때 구글 연동 상태 확인
  useEffect(() => {
    if (open) {
      checkGoogleConnection();
    }
  }, [open]);

  const checkTokenScopes = async (accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
      );
      if (!response.ok) {
        // 토큰 만료 또는 무효
        console.warn("[Settings] Token invalid or expired");
        return false;
      }
      const data = await response.json();
      if (data.scope) {
        const scopes = data.scope.split(" ");
        setTokenScopes(scopes);
        return true;
      }
      return false;
    } catch (error) {
      console.error("[Settings] Failed to check token scopes:", error);
      return false;
    }
  };

  const checkGoogleConnection = async () => {
    try {
      // 1. 먼저 플래그 기반으로 연결 상태 표시 (빠른 UI 반영)
      if (isGoogleCalendarApiEnabled()) {
        setIsGoogleConnected(true);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // 2. 실제 토큰 확인 (refresh token으로 자동 갱신 포함)
        const token = await getGoogleTokenAsync(session);
        if (token) {
          const isValid = await checkTokenScopes(token);
          if (isValid) {
            setIsGoogleConnected(true);
            setGoogleAccessToken(token);
            return;
          }
        }
        // 3. 토큰 갱신 실패했지만 플래그가 켜져있으면 → 연결 상태 유지 (재시도 가능)
        if (isGoogleCalendarApiEnabled()) {
          console.warn("[Settings] Google Calendar API enabled but token temporarily unavailable");
          setIsGoogleConnected(true); // 플래그 기반으로 연결 상태 유지
          return;
        }
        setIsGoogleConnected(false);
        setGoogleAccessToken(null);
        setTokenScopes([]);
      }
    } catch (error) {
      console.error("[Settings] Failed to check Google connection:", error);
      // 플래그가 켜져있으면 연결 상태 유지
      setIsGoogleConnected(isGoogleCalendarApiEnabled());
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
      // 이미 연결된 상태에서 토글 → 연동 해제 (완전 초기화)
      if (isGoogleConnected) {
        clearAllGoogleData();
        setIsGoogleConnected(false);
        setGoogleAccessToken(null);
        setTokenScopes([]);
        toast.success(
          ({ ko: "구글 캘린더 API 연동이 해제되었습니다.", en: "Google Calendar API disconnected.", zh: "Google日历API已断开连接。" } as Record<string, string>)[i18n.language] || "Google Calendar API disconnected."
        );
        setLoading(false);
        return;
      }

      if (googleAccessToken) {
        const hasCalendarScope = tokenScopes.some(
          (scope) => scope === "https://www.googleapis.com/auth/calendar"
        );
        if (hasCalendarScope) {
          setGoogleCalendarApiEnabled(true);
          toast.success("구글 캘린더 API 연동 완료! 캘린더 페이지에서 구글 일정이 실시간으로 표시됩니다.", { duration: 5000 });
          setLoading(false);
          return;
        }
      }

      // 연동 플래그 먼저 설정 (OAuth 리다이렉트 후에도 기억하기 위해)
      setGoogleCalendarApiEnabled(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks",
          redirectTo: `${window.location.origin}/calendar?api_connect=true`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) {
        setGoogleCalendarApiEnabled(false);
        toast.error("구글 연동에 실패했습니다.");
      } else {
        toast.info("구글 로그인 페이지로 이동합니다...");
      }
    } catch (error) {
      setGoogleCalendarApiEnabled(false);
      toast.error("구글 연동에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "google", label: t("settings.tabs.calendar"), Icon: CalendarIcon },
    { id: "timezone", label: t("settings.tabs.timezone"), Icon: Clock },
    { id: "theme", label: t("settings.tabs.theme"), Icon: Palette },
    { id: "language", label: t("settings.tabs.language"), Icon: Globe },
    { id: "account", label: t("settings.tabs.account"), Icon: User },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%] bg-background border rounded-xl shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200 w-[90vw] max-w-[880px]"
        >
          {/* Close button */}
          <DialogPrimitive.Close className="absolute top-3.5 left-3.5 rounded-sm opacity-70 hover:opacity-100 transition-opacity z-10">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <DialogTitle className="sr-only">
            {t("settings.appSettings")}
          </DialogTitle>

          {/* Content */}
          <div className="flex h-[580px]">
            {/* Left nav - full height divider like Apple Calendar */}
            <nav className="w-[180px] flex-shrink-0 pt-14 pb-6 px-3 border-r border-border">
              <div className="space-y-0.5">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[15px] transition-colors ${
                      isActive
                        ? "bg-primary font-medium text-white"
                        : "text-muted-foreground hover:bg-[#FBFBFC] dark:hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <tab.Icon className={`w-4.5 h-4.5 ${isActive ? "text-white" : "text-primary"}`} />
                    {tab.label}
                  </button>
                  );
                })}
              </div>
            </nav>

            {/* Right content */}
            <div className="flex-1 px-6 pt-12 pb-4 overflow-y-auto">
              {activeTab === "google" && (
                <div className="space-y-6">
                  {/* 1. 공휴일 표시 */}
                  <div>
                    <h2 className="text-base font-semibold mb-1">
                      {t("settings.holiday.title")}
                    </h2>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("settings.holiday.description")}
                    </p>

                    <div className="border rounded-lg p-4 space-y-3">
                      {/* 토글 + 상태 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {holidayEnabled ? t("settings.holiday.enabled") : t("settings.holiday.disabled")}
                          </span>
                        </div>
                        <button
                          onClick={handleHolidayToggle}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            holidayEnabled ? "bg-[#0C8CE9]" : "bg-muted-foreground/30"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              holidayEnabled ? "translate-x-4.5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>

                      {/* 국가 선택 드롭다운 */}
                      {holidayEnabled && (
                        <div className="relative" ref={countryDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                            className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-border bg-transparent text-sm transition-colors hover:bg-[#FBFBFC] dark:hover:bg-accent"
                          >
                            <span>
                              {availableCountries.find((c) => c.countryCode === holidayCountry)
                                ? getLocalizedCountryName(holidayCountry, availableCountries.find((c) => c.countryCode === holidayCountry)!.name)
                                : holidayCountry}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${countryDropdownOpen ? "rotate-180" : ""}`} />
                          </button>

                          {countryDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-md shadow-lg">
                              <div className="p-2">
                                <Input
                                  type="text"
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  placeholder={t("settings.holiday.searchPlaceholder")}
                                  className="h-8"
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-[180px] overflow-y-auto px-1 pb-1">
                                {loadingCountries ? (
                                  <p className="text-xs text-muted-foreground text-center py-3">{t("settings.holiday.loading")}</p>
                                ) : filteredCountries.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-3">{t("settings.timezone.noResults")}</p>
                                ) : (
                                  filteredCountries.map((country) => (
                                    <button
                                      key={country.countryCode}
                                      onClick={() => handleCountryChange(country.countryCode)}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-sm transition-colors ${
                                        holidayCountry === country.countryCode
                                          ? "bg-[#FBFBFC] dark:bg-accent font-medium"
                                          : "hover:bg-[#FBFBFC] dark:hover:bg-accent"
                                      }`}
                                    >
                                      <span>{getLocalizedCountryName(country.countryCode, country.name)}</span>
                                      {holidayCountry === country.countryCode && (
                                        <Check className="w-3.5 h-3.5 text-primary" />
                                      )}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div className="border-t border-border" />

                  {/* 2 & 3. 구글 캘린더 연동 (상호 배타적 선택) */}
                  <div>
                    <h2 className="text-base font-semibold mb-1">
                      {t("settings.googleCalendar.integrationMethod")}
                    </h2>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("settings.googleCalendar.chooseMethod")}
                    </p>

                    <div className="space-y-3">
                      {/* 데이터 가져오기 */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-green-50 dark:bg-green-950 rounded-lg">
                              {isMigrating ? (
                                <RefreshCw className="w-4 h-4 text-green-600 dark:text-green-400 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium text-sm mb-0.5">
                                {t("settings.googleCalendar.importTitle")}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {isMigrating ? t("settings.googleCalendar.importing") : t("settings.googleCalendar.importDesc")}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleMigrateGoogleCalendar}
                            disabled={isMigrating}
                            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-muted-foreground/30 hover:bg-muted-foreground/40 flex-shrink-0 ml-3"
                          >
                            <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                          </button>
                        </div>
                      </div>

                      {/* API 연동 */}
                      <div className={`border rounded-lg p-4 ${isGoogleConnected ? "border-[#0C8CE9]/40" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-950 rounded-lg">
                              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm mb-0.5">
                                {t("settings.googleCalendar.apiTitle")}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {t("settings.googleCalendar.apiDesc")}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleConnectGoogleAPI}
                            disabled={loading}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ml-3 ${
                              isGoogleConnected ? "bg-[#0C8CE9]" : "bg-muted-foreground/30 hover:bg-muted-foreground/40"
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                isGoogleConnected ? "translate-x-4.5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
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

              {activeTab === "timezone" && (
                <div className="flex flex-col gap-2">
                  {/* 현재 시간대 */}
                  <div className="bg-muted/50 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("settings.timezone.current")}</p>
                      <p className="text-sm font-medium">
                        {WORLD_CLOCK_CITIES.find((c) => c.tz === timezone)?.names[i18n.language] || timezone.replace(/_/g, " ")} ({formatTimezoneOffset(timezone)})
                      </p>
                    </div>
                    {timezone !== browserTimezone && (
                      <Button variant="ghost" size="sm" onClick={handleResetTimezone} className="text-xs h-7">
                        {t("settings.timezone.reset")}
                      </Button>
                    )}
                  </div>

                  {/* 세계시계 지도 (Apple style) */}
                  <div
                    ref={mapContainerRef}
                    className="rounded-lg overflow-hidden border border-border bg-white dark:bg-[#1a1a1e] cursor-crosshair"
                    onMouseMove={handleMapMouseMove}
                    onMouseLeave={() => setHoveredOffset(null)}
                    onClick={() => {
                      if (hoveredOffset !== null) {
                        // 호버된 시간대에서 가장 가까운 대표 도시의 timezone 선택
                        const match = WORLD_CLOCK_CITIES.find((c) => Math.round(getGmtOffsetNum(c.tz)) === Math.round(hoveredOffset));
                        if (match) handleTimezoneChange(match.tz);
                      }
                    }}
                  >
                    <ComposableMap
                      projection="geoEquirectangular"
                      projectionConfig={{ rotate: [-140, -10, 0], scale: 90 }}
                      width={540}
                      height={280}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    >
                      {/* 대륙 (추상화 - 국경선 없음) */}
                      <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                          geographies.map((geo) => (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              style={{
                                default: { fill: "#DCDCDC", stroke: "none", outline: "none" },
                                hover: { fill: "#DCDCDC", stroke: "none", outline: "none" },
                                pressed: { fill: "#DCDCDC", outline: "none" },
                              }}
                            />
                          ))
                        }
                      </Geographies>

                      {/* 호버된 시간대 밴드 하이라이트 (지도 위에 표시) */}
                      {hoveredOffset !== null && (() => {
                        const bandX = lonToSvgX(hoveredOffset * 15);
                        const bandW = 15 * MAP_SCALE_FACTOR;
                        return (
                          <rect
                            x={bandX - bandW / 2}
                            y={-20}
                            width={bandW}
                            height={300}
                            fill="rgba(227, 0, 0, 0.10)"
                            pointerEvents="none"
                          />
                        );
                      })()}

                      {/* 도시 마커 */}
                      {WORLD_CLOCK_CITIES.map((city) => {
                        const { time, period } = formatCityTime(city.tz);
                        const displayName = city.names[i18n.language] || city.names.en;
                        const cityOffset = getGmtOffsetNum(city.tz);
                        const isHighlighted = hoveredOffset !== null && Math.round(cityOffset) === Math.round(hoveredOffset);
                        const isCurrentTz = timezone === city.tz;
                        const active = isHighlighted || isCurrentTz;
                        const FS = 9.5;

                        return (
                          <Marker key={city.tz} coordinates={city.coords}>
                            <circle
                              r={active ? 3 : 2}
                              fill={isCurrentTz ? "var(--primary)" : active ? "#E30000" : "#aaa"}
                              style={{ transition: "all 0.15s" }}
                            />
                            <g
                              transform={`translate(${city.dx}, ${city.dy})`}
                              style={{ cursor: "pointer", opacity: hoveredOffset !== null && !active ? 0.2 : 1, transition: "opacity 0.15s" }}
                              onClick={() => handleTimezoneChange(city.tz)}
                              onMouseEnter={() => setHoveredOffset(Math.round(cityOffset))}
                            >
                              {/* 도시명 */}
                              <text
                                fontSize={FS}
                                fill={active ? "#111" : "#777"}
                                textAnchor={city.anchor}
                                dominantBaseline="auto"
                                fontWeight={active ? "600" : "400"}
                                style={{ fontFamily: "var(--font-family)" }}
                              >
                                {displayName}
                              </text>
                              {/* 시간 */}
                              <text
                                fontSize={FS}
                                fill={active ? "#111" : "#999"}
                                textAnchor={city.anchor}
                                dominantBaseline="auto"
                                y={12}
                                fontWeight="600"
                                style={{ fontFamily: "var(--font-family)" }}
                              >
                                {time}
                                <tspan fontSize={FS * 0.7} fontWeight="700" dx="1">{period}</tspan>
                              </text>
                            </g>
                          </Marker>
                        );
                      })}
                    </ComposableMap>

                    {/* GMT offset 바 - 지도 x좌표에 맞춰 배치 */}
                    <div className="relative h-5 border-t border-border/50 bg-muted/20 overflow-hidden">
                      {[-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,-11,-10,-9,-8,-7,-6,-5,-4,-3].map((offset) => {
                        const isActive = hoveredOffset !== null && Math.round(hoveredOffset) === offset;
                        const xPct = (lonToSvgX(offset * 15) / 540) * 100;
                        return (
                          <span
                            key={offset}
                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[7px] leading-none transition-colors ${
                              isActive ? "text-primary font-bold" : "text-muted-foreground/50"
                            }`}
                            style={{ left: `${xPct}%` }}
                          >
                            {offset === 0 ? "GMT" : offset > 0 ? `+${offset}` : `${offset}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* 검색 */}
                  <Input
                    type="text"
                    value={timezoneSearch}
                    onChange={(e) => setTimezoneSearch(e.target.value)}
                    placeholder={t("settings.timezone.searchPlaceholder")}
                    className="h-8 text-sm"
                  />

                  {/* 시간대 목록 */}
                  <div className="space-y-0.5 overflow-y-auto max-h-[120px]">
                    {filteredTimezones.map((item) => (
                      <button
                        key={item.tz}
                        onClick={() => handleTimezoneChange(item.tz)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          timezone === item.tz ? "bg-muted font-medium" : "hover:bg-muted/50"
                        }`}
                      >
                        <span>{item.names[i18n.language] || item.names.en}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatTimezoneOffset(item.tz)}</span>
                          {timezone === item.tz && <Check className="w-4 h-4 text-primary" />}
                        </div>
                      </button>
                    ))}
                    {filteredTimezones.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("settings.timezone.noResults")}
                      </p>
                    )}
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
