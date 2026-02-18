import React from 'react';
import { MaterialIcon } from './MaterialIcon';

export interface TimelineEvent {
    id: string;
    time: string;
    icon: string;
    iconColorClass: string;
    content: React.ReactNode;
}

interface TimelineProps {
    title: string;
    events: TimelineEvent[];
    emptyMessage?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function Timeline({ title, events, emptyMessage = 'No events found', action }: TimelineProps) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
                {action && (
                    <span
                        onClick={action.onClick}
                        className="text-xs text-primary font-medium cursor-pointer hover:underline"
                    >
                        {action.label}
                    </span>
                )}
            </div>

            {/* Event List */}
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {events.length > 0 ? (
                    events.map((event) => (
                        <div key={event.id} className="px-6 py-4 flex items-center gap-4">
                            <span className="text-xs text-slate-500 font-mono w-24">{event.time}</span>
                            <MaterialIcon name={event.icon} className={`${event.iconColorClass} text-lg`} />
                            <div className="text-sm text-slate-700 dark:text-slate-300">
                                {event.content}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="px-6 py-8 text-center text-slate-500 text-sm">
                        {emptyMessage}
                    </div>
                )}
            </div>
        </div>
    );
}
