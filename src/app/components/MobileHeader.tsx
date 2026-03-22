import { Settings, Menu } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import calendaryIcon from "@/assets/e735c8e5404257a8d70b2c1243da5c30fde7a306.png";

export function MobileHeader() {
  const { t } = useTranslation();

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={calendaryIcon} alt="Calendary" className="w-7 h-7" />
          <h1 className="text-lg font-semibold">{t('common.appName')}</h1>
        </div>
        <Link
          to="/settings"
          className="p-2 hover:bg-accent rounded-lg transition-all duration-200"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}