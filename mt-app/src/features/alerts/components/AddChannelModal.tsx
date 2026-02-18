import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { MaterialIcon } from '../../../components/common';
import { api, type CreateNotificationChannelData, type NotificationChannel, type TelegramConfig, type DiscordConfig } from '../../../services/api';

const channelSchema = z.object({
    name: z.string().min(2, 'Name is too short'),
    type: z.enum(['telegram', 'discord']),
    // Telegram fields
    botToken: z.string().optional(),
    chatId: z.string().optional(),
    // Discord fields
    webhookUrl: z.string().url('Invalid URL').optional(),
}).refine(data => {
    if (data.type === 'telegram' && (!data.botToken || !data.chatId)) return false;
    if (data.type === 'discord' && !data.webhookUrl) return false;
    return true;
}, {
    message: 'Please fill in all required fields',
    path: ['botToken'],
});

type ChannelFormValues = z.infer<typeof channelSchema>;

interface AddChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    channel?: NotificationChannel;
}

export function AddChannelModal({ isOpen, onClose, onSuccess, channel }: AddChannelModalProps) {
    const { t } = useTranslation();
    const [isTesting, setIsTesting] = useState(false);
    const isEditMode = !!channel;

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChannelFormValues>({
        resolver: zodResolver(channelSchema),
        defaultValues: {
            type: 'telegram',
        },
    });

    // Populate form when editing
    useEffect(() => {
        if (isOpen && channel) {
            let config: TelegramConfig | DiscordConfig | null = null;
            try {
                config = typeof channel.config === 'string'
                    ? JSON.parse(channel.config)
                    : channel.config;
            } catch {
                config = null;
            }

            reset({
                name: channel.name,
                type: channel.type,
                botToken: channel.type === 'telegram' && config ? (config as TelegramConfig).botToken : '',
                chatId: channel.type === 'telegram' && config ? (config as TelegramConfig).chatId : '',
                webhookUrl: channel.type === 'discord' && config ? (config as DiscordConfig).webhookUrl : '',
            });
        } else if (isOpen && !channel) {
            reset({ type: 'telegram', name: '', botToken: '', chatId: '', webhookUrl: '' });
        }
    }, [isOpen, channel, reset]);

    const selectedType = watch('type');

    const onSubmit = async (data: ChannelFormValues) => {
        try {
            const payload: CreateNotificationChannelData = {
                name: data.name,
                type: data.type,
                config: data.type === 'telegram'
                    ? { botToken: data.botToken!, chatId: data.chatId! }
                    : { webhookUrl: data.webhookUrl! },
            };

            if (isEditMode) {
                await api.updateNotificationChannel(channel.id, payload);
                toast.success(t('alerts.channelUpdated', { defaultValue: 'Channel updated' }));
            } else {
                const created = await api.createNotificationChannel(payload);
                toast.success(t('alerts.channelAdded'));

                // Test the channel
                if (created.id) {
                    setIsTesting(true);
                    try {
                        await api.testNotificationChannel(created.id);
                        toast.success(t('alerts.testSent'));
                    } catch (error) {
                        toast.error(t('alerts.testFailed'));
                    } finally {
                        setIsTesting(false);
                    }
                }
            }

            reset();
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('alerts.addFailed'));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MaterialIcon name={isEditMode ? 'edit' : 'notifications'} className="text-primary" />
                        {isEditMode
                            ? t('alerts.modal.editTitle', { defaultValue: 'Edit Channel' })
                            : t('alerts.modal.title')
                        }
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <MaterialIcon name="close" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {t('common.name')}
                        </label>
                        <input
                            {...register('name')}
                            placeholder={t('alerts.modal.namePlaceholder')}
                            className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border ${errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm`}
                        />
                        {errors.name && <p className="text-[10px] text-red-500 font-medium">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {t('common.type')}
                        </label>
                        <div className="flex gap-2">
                            <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer transition-all ${selectedType === 'telegram' ? 'bg-[#26A5E4]/10 border-[#26A5E4] text-[#26A5E4] font-bold' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                <input {...register('type')} type="radio" value="telegram" className="hidden" />
                                <MaterialIcon name="send" className="text-lg" />
                                {t('alerts.modal.telegram')}
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer transition-all ${selectedType === 'discord' ? 'bg-[#5865F2]/10 border-[#5865F2] text-[#5865F2] font-bold' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                <input {...register('type')} type="radio" value="discord" className="hidden" />
                                <MaterialIcon name="sports_esports" className="text-lg" />
                                {t('alerts.modal.discord')}
                            </label>
                        </div>
                    </div>

                    {selectedType === 'telegram' ? (
                        <>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('alerts.modal.botToken')}</label>
                                <input
                                    {...register('botToken')}
                                    placeholder={t('alerts.modal.botTokenPlaceholder')}
                                    className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border ${errors.botToken ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-mono`}
                                />
                                {errors.botToken && <p className="text-[10px] text-red-500 font-medium">{errors.botToken.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('alerts.modal.chatId')}</label>
                                <input
                                    {...register('chatId')}
                                    placeholder={t('alerts.modal.chatIdPlaceholder')}
                                    className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border ${errors.chatId ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-mono`}
                                />
                                <p className="text-[10px] text-slate-500">
                                    {t('alerts.modal.chatIdHelp')} <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('alerts.modal.webhookUrl')}</label>
                            <input
                                {...register('webhookUrl')}
                                placeholder={t('alerts.modal.webhookUrlPlaceholder')}
                                className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border ${errors.webhookUrl ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-mono`}
                            />
                            {errors.webhookUrl && <p className="text-[10px] text-red-500 font-medium">{errors.webhookUrl.message}</p>}
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isTesting}
                            className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                        >
                            {isSubmitting || isTesting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <MaterialIcon name="save" className="text-lg" />
                                    {t('common.save')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
