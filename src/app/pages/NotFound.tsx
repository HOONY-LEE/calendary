import { Link } from 'react-router';
import { Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">{t('notFound.title')}</h2>
        <p className="text-muted-foreground mb-8">
          {t('notFound.message')}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all duration-200"
        >
          <Home className="w-5 h-5" />
          <span>{t('notFound.backHome')}</span>
        </Link>
      </div>
    </div>
  );
}