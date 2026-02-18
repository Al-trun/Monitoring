/**
 * Utility for combining class names conditionally
 * Useful for dynamic styling with theme tokens
 *
 * @example
 * cn('base-class', isActive && 'active-class', 'another-class')
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Common component style patterns using theme system
 * Provides consistent styling across the application
 */
export const stylePresets = {
  // Card components
  card: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl',
  cardDark: 'bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl',

  // Input fields
  input: 'bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary',
  inputWithBorder: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary',

  // Buttons
  button: 'px-4 py-2 rounded-lg font-bold text-sm transition-colors',
  buttonPrimary: 'px-4 py-2 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-colors',
  buttonSecondary: 'px-4 py-2 rounded-lg font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
  buttonGhost: 'px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',

  // Text colors
  textMuted: 'text-slate-500 dark:text-slate-400',
  textSecondary: 'text-slate-600 dark:text-slate-300',
  textPrimary: 'text-slate-900 dark:text-slate-100',

  // Borders
  border: 'border-slate-200 dark:border-slate-800',
  borderBottom: 'border-b border-slate-200 dark:border-slate-800',

  // Backgrounds
  bgMuted: 'bg-slate-50 dark:bg-slate-800/50',
  bgSecondary: 'bg-slate-100 dark:bg-slate-800',
  bgHover: 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
} as const;
