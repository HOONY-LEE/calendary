import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

interface UserMenuProps {
  isCollapsed: boolean;
}

export function UserMenu({ isCollapsed }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // 메뉴 위치 계산
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      if (isCollapsed) {
        // 접힌 상태: 버튼 오른쪽 하단에 표시
        setMenuPosition({
          top: rect.bottom,
          left: rect.right + 8,
        });
      } else {
        // 펼친 상태: 버튼 위에 표시
        setMenuPosition({
          top: rect.top,
          left: rect.left,
        });
      }
    }
  }, [isOpen, isCollapsed]);

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

  const handleSignOut = async () => {
    try {
      console.log('[UserMenu] 🚪 Sign out button clicked');
      await signOut();
      console.log('[UserMenu] ✅ Sign out successful');
      setIsOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('[UserMenu] ❌ Sign out failed:', error);
    }
  };

  const userButton = (
    <button
      ref={buttonRef}
      onClick={() => setIsOpen(!isOpen)}
      className={`flex items-center gap-3 rounded-md transition-colors cursor-pointer ${
        isCollapsed
          ? 'w-10 h-10 justify-center p-0'
          : 'w-full px-[10px] py-[6px] h-10'
      } hover:bg-[#F9FAFB] dark:hover:bg-accent`}
    >
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-medium overflow-hidden">
        {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
          <img
            src={user.user_metadata.avatar_url || user.user_metadata.picture}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
        )}
      </div>
      {!isCollapsed && (
        <div className="flex flex-col flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-foreground leading-tight truncate">
            {user?.user_metadata?.name || 'User'}
          </p>
          <p className="text-xs text-foreground/60 leading-tight truncate">
            {user?.email || 'user@email.com'}
          </p>
        </div>
      )}
    </button>
  );

  return (
    <div ref={menuRef} className="relative">
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {userButton}
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex flex-col">
              <p className="text-sm font-medium">
                {user?.user_metadata?.name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.email || 'user@email.com'}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        userButton
      )}

      {/* 콘텍스트 메뉴 */}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed w-56 bg-card border border-border rounded-lg shadow-lg py-2 z-50"
          style={{ 
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            transform: isCollapsed ? 'translateY(-100%)' : 'translateY(-100%)',
          }}
        >
          {/* 유저 정보 */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">
              {user?.user_metadata?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {user?.email || 'user@email.com'}
            </p>
          </div>

          {/* 로그아웃 버튼 */}
          <div className="px-2 py-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-foreground/60 hover:text-foreground cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">
                {t('common.signOut') || 'Sign Out'}
              </span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}