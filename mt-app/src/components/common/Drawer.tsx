import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MaterialIcon } from './MaterialIcon';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    centered?: boolean;
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full',
};

export function Drawer({
    isOpen,
    onClose,
    children,
    title,
    className = '',
    size = 'md',
    centered = false,
}: DrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);

    // Handle ESC key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (isOpen && e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer/Modal Panel */}
            {centered ? (
                /* Centered Modal */
                <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
                    <div
                        ref={drawerRef}
                        className={`pointer-events-auto w-full ${sizeClasses[size]} transform transition-all duration-300 ease-in-out animate-in zoom-in-95 fade-in`}
                    >
                        <div className={`flex flex-col max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl ${className}`}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {title}
                                </h2>
                                <button
                                    type="button"
                                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    onClick={onClose}
                                >
                                    <MaterialIcon name="close" className="text-xl" />
                                    <span className="sr-only">Close panel</span>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="relative flex-1 px-6 py-6 overflow-y-auto">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Side Drawer */
                <div className="absolute inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 pointer-events-none">
                    <div
                        ref={drawerRef}
                        className={`pointer-events-auto w-screen ${sizeClasses[size]} transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right sm:duration-300`}
                    >
                        <div className={`flex h-full flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl ${className}`}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {title}
                                </h2>
                                <button
                                    type="button"
                                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    onClick={onClose}
                                >
                                    <MaterialIcon name="close" className="text-xl" />
                                    <span className="sr-only">Close panel</span>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="relative flex-1 px-6 py-6 overflow-y-auto">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
