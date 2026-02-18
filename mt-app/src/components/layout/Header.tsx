import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialIcon } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import logoDark from '../../assets/logo-dark.png';
import { NotificationDropdown } from './NotificationDropdown';


export function Header() {
    const { theme, toggleTheme } = useTheme();
    const { t, i18n } = useTranslation();
    const [notifOpen, setNotifOpen] = useState(false);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <header className="h-16 border-b border-slate-200 dark:border-ui-border-dark bg-white dark:bg-bg-main-dark flex items-center justify-between px-4 shrink-0 transition-colors duration-200 z-30 relative">
            {/* 1. Left: Logo Area */}
            <Link to="/" className="flex items-center gap-2 group shrink-0 z-10 transition-transform active:scale-95">
                <div className="flex items-center justify-center h-10 w-10 overflow-hidden">
                    <img src={theme === 'dark' ? logoDark : logo} alt="Monitoring Logo" className="h-full w-full object-contain" />

                </div>
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-primary transition-colors">Monitoring</h1>
                </div>
            </Link>

            {/* 2. Center: Search (Absolute Positioned) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md hidden md:block">
                <div className="relative w-full">
                    <MaterialIcon
                        name="search"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-text-muted-dark text-lg"
                    />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        className="w-full bg-slate-100 dark:bg-bg-surface-dark border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary transition-colors shadow-sm dark:text-white dark:placeholder-text-muted-dark"
                    />
                </div>
            </div>

            {/* 3. Right: Actions */}
            <div className="flex items-center gap-6 z-10">
                {/* Language Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-bg-surface-dark p-1 rounded-lg">
                    <button
                        onClick={() => changeLanguage('ko')}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${i18n.language.startsWith('ko')
                            ? 'bg-white dark:bg-ui-hover-dark text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-text-muted-dark dark:hover:text-white'
                            }`}
                    >
                        KO
                    </button>
                    <button
                        onClick={() => changeLanguage('en')}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${i18n.language.startsWith('en')
                            ? 'bg-white dark:bg-ui-hover-dark text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-text-muted-dark dark:hover:text-white'
                            }`}
                    >
                        EN
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-ui-hover-dark text-slate-500 dark:text-text-muted-dark dark:hover:text-white transition-colors"
                        aria-label="Toggle theme"
                    >
                        <MaterialIcon name={theme === 'light' ? 'dark_mode' : 'light_mode'} />
                    </button>
                    <NotificationDropdown
                        open={notifOpen}
                        onToggle={() => setNotifOpen(v => !v)}
                        onClose={() => setNotifOpen(false)}
                    />
                </div>
            </div>
        </header>
    );
}
