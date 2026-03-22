import { useState, useRef, useEffect } from 'react';
import { Settings, Moon, Sun, Monitor, Languages, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Link, useLocation } from 'react-router';

interface SettingsMenuProps {
  isCollapsed: boolean;
}

export function SettingsMenu({ isCollapsed }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const currentLanguage = i18n.language as 'ko' | 'en';
  const isActive = location.pathname === '/settings';

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const changeLanguage = (lang: 'ko' | 'en') => {
    i18n.changeLanguage(lang);
  };

  const settingsButton = (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={`flex items-center gap-3 rounded-md transition-colors ${
        isCollapsed
          ? 'w-10 h-10 justify-center p-0'
          : 'w-full px-[10px] py-[6px] h-10'
      } ${
        isActive || isOpen
          ? 'bg-[#F9FAFB] dark:bg-accent'
          : 'bg-transparent hover:bg-[#F9FAFB] dark:hover:bg-accent'
      }`}
    >
      <Settings className={`w-5 h-5 shrink-0 ${isActive || isOpen ? 'text-primary' : 'text-foreground/60'}`} strokeWidth={2} />
      {!isCollapsed && (
        <span className={`text-[15px] font-medium tracking-[0.48px] ${isActive || isOpen ? 'text-primary' : 'text-foreground/60'}`}>
          {t('nav.settings')}
        </span>
      )}
    </button>
  );

  return (
    <div className="relative" ref={menuRef}>
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {settingsButton}
          </TooltipTrigger>
          <TooltipContent side="right">
            {t('nav.settings')}
          </TooltipContent>
        </Tooltip>
      ) : (
        settingsButton
      )}

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div
          className={`absolute bottom-full mb-2 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50 ${
            isCollapsed ? 'left-0' : 'left-0'
          }`}
          style={{ minWidth: '200px' }}
        >
          {/* 테마 선택 */}
          <button
            onClick={() => setTheme('light')}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#F9FAFB] dark:hover:bg-accent transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Sun className="w-4 h-4 text-foreground/60" />
              <span className="text-sm text-foreground/80">{t('settings.lightMode')}</span>
            </div>
            {theme === 'light' && <Check className="w-4 h-4 text-primary" />}
          </button>
          <button
            onClick={() => setTheme('dark')}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#F9FAFB] dark:hover:bg-accent transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-foreground/60" />
              <span className="text-sm text-foreground/80">{t('settings.darkMode')}</span>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4 text-primary" />}
          </button>
          <button
            onClick={() => setTheme('system')}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#F9FAFB] dark:hover:bg-accent transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Monitor className="w-4 h-4 text-foreground/60" />
              <span className="text-sm text-foreground/80">{t('settings.systemTheme')}</span>
            </div>
            {theme === 'system' && <Check className="w-4 h-4 text-primary" />}
          </button>

          {/* 구분선 */}
          <div className="border-t border-border" />

          {/* 언어 선택 */}
          <div className="py-1">
            <button
              onClick={() => changeLanguage('ko')}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#F9FAFB] dark:hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Languages className="w-4 h-4 text-foreground/60" />
                <span className="text-sm text-foreground/80">한국어</span>
              </div>
              {currentLanguage === 'ko' && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </button>
            <button
              onClick={() => changeLanguage('en')}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#F9FAFB] dark:hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Languages className="w-4 h-4 text-foreground/60" />
                <span className="text-sm text-foreground/80">English</span>
              </div>
              {currentLanguage === 'en' && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </button>
          </div>

          {/* 구분선 */}
          <div className="border-t border-border" />

          {/* 앱 설정 링크 */}
          <Link
            to="/settings"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F9FAFB] dark:hover:bg-accent transition-colors"
          >
            <Settings className="w-4 h-4 text-foreground/60" />
            <span className="text-sm text-foreground/80">{t('nav.appSettings')}</span>
          </Link>
        </div>
      )}
    </div>
  );
}