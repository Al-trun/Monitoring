import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import logo from '../../assets/logo.png';
import logoDark from '../../assets/logo-dark.png';


export function Footer() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
      <div className="px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left - Brand & Copyright */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
              <img src={theme === 'dark' ? logoDark : logo} alt="Monitoring Logo" className="h-full w-full object-contain opacity-80 hover:opacity-100 transition-opacity" />

            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Monitoring
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                © {currentYear} {t('footer.rights')}
              </span>
            </div>
          </div>

          {/* Center - Links */}
          <nav className="flex items-center gap-6">
            <a
              href="#"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
            >
              {t('footer.documentation')}
            </a>
            <a
              href="#"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
            >
              {t('footer.apiReference')}
            </a>
            <a
              href="#"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
            >
              {t('footer.support')}
            </a>
            <a
              href="#"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
            >
              {t('footer.privacy')}
            </a>
          </nav>

          {/* Right - Status & Version */}
          <div className="flex items-center gap-4">
            {/* System Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {t('footer.systemOperational')}
              </span>
            </div>

            {/* Version */}
            <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              v1.0.0
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
