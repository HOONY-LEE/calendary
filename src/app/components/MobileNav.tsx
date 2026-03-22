import { Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Calendar, 
  ListTodo, 
  Repeat, 
  BarChart3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const navItems = [
  { path: '/', label: 'nav.calendar', icon: Calendar },
  { path: '/tasks', label: 'nav.tasks', icon: ListTodo },
  // 🚧 통계 페이지 임시 숨김
  // { path: '/analytics', label: 'nav.analytics', icon: BarChart3 },
];

export function MobileNav() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{t(item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}