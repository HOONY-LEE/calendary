import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { SettingsDialog } from './SettingsDialog';

interface SettingsMenuProps {
  isCollapsed: boolean;
}

export function SettingsMenu({ isCollapsed }: SettingsMenuProps) {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const { t } = useTranslation();

  const settingsButton = (
    <button
      onClick={() => setSettingsDialogOpen(true)}
      className={`flex items-center gap-3 rounded-md transition-colors ${
        isCollapsed
          ? 'w-10 h-10 justify-center p-0'
          : 'w-full px-[10px] py-[6px] h-10'
      } ${
        settingsDialogOpen
          ? 'bg-[#F9FAFB] dark:bg-accent'
          : 'bg-transparent hover:bg-[#F9FAFB] dark:hover:bg-accent'
      }`}
    >
      <Settings className={`w-5 h-5 shrink-0 ${settingsDialogOpen ? 'text-primary' : 'text-foreground/60'}`} strokeWidth={2} />
      {!isCollapsed && (
        <span className={`text-[15px] font-medium tracking-[0.48px] ${settingsDialogOpen ? 'text-primary' : 'text-foreground/60'}`}>
          {t('nav.settings')}
        </span>
      )}
    </button>
  );

  return (
    <>
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

      <SettingsDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen} />
    </>
  );
}
