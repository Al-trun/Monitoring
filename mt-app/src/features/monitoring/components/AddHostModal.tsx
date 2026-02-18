import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { MaterialIcon } from '../../../components/common';
import { api, type SSHTestResult } from '../../../services/api';

const hostSchema = z.object({
  id: z.string().min(2, 'ID is too short').regex(/^[a-z0-9-]+$/, 'Lower case letters, numbers, and hyphens only'),
  name: z.string().min(2, 'Name is too short'),
  type: z.enum(['local', 'remote']),
  resourceCategory: z.enum(['server', 'database', 'container']).optional(),
  ip: z.string().min(1, 'IP is required'),
  port: z.number().optional(),
  group: z.string().optional(),
  description: z.string().optional(),
  sshUser: z.string().optional(),
  sshPort: z.number().optional(),
  sshAuthType: z.enum(['password', 'key', 'key_file']).optional(),
  sshPassword: z.string().optional(),
  sshKey: z.string().optional(),
  sshKeyPath: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'remote') {
    if (!data.sshUser || data.sshUser.trim() === '') {
      ctx.addIssue({ code: 'custom', message: 'SSH User is required', path: ['sshUser'] });
    }
    if (!data.sshAuthType) {
      ctx.addIssue({ code: 'custom', message: 'Auth type is required', path: ['sshAuthType'] });
    }
    if (data.sshAuthType === 'password' && (!data.sshPassword || data.sshPassword.trim() === '')) {
      ctx.addIssue({ code: 'custom', message: 'Password is required', path: ['sshPassword'] });
    }
    if (data.sshAuthType === 'key' && (!data.sshKey || data.sshKey.trim() === '')) {
      ctx.addIssue({ code: 'custom', message: 'SSH Key is required', path: ['sshKey'] });
    }
    if (data.sshAuthType === 'key_file' && (!data.sshKeyPath || data.sshKeyPath.trim() === '')) {
      ctx.addIssue({ code: 'custom', message: 'Key file path is required', path: ['sshKeyPath'] });
    }
  }
});

type HostFormValues = z.infer<typeof hostSchema>;

interface AddHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddHostModal({ isOpen, onClose, onSuccess }: AddHostModalProps) {
  const { t } = useTranslation();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SSHTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [ppkWarning, setPpkWarning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<HostFormValues>({
    resolver: zodResolver(hostSchema),
    defaultValues: {
      type: 'remote',
      resourceCategory: 'server',
      group: 'default',
      sshAuthType: 'password',
    },
  });

  const selectedType = watch('type');
  const selectedAuthType = watch('sshAuthType');

  const handleKeyFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content.includes('PuTTY-User-Key-File')) {
        setPpkWarning(true);
        return;
      }
      setPpkWarning(false);
      setValue('sshKey', content.trim());
    };
    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleKeyFile(file);
  }, [handleKeyFile]);

  const handleTestConnection = async () => {
    const values = getValues();
    if (!values.ip || !values.sshUser) {
      toast.error('IP and SSH User are required');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const result = await api.testSSHConnection({
        ip: values.ip,
        sshPort: values.sshPort || 22,
        sshUser: values.sshUser,
        sshAuthType: values.sshAuthType,
        sshPassword: values.sshPassword,
        sshKey: values.sshKey,
        sshKeyPath: values.sshKeyPath,
      });
      setTestResult(result);
      toast.success(t('monitoring.modal.connectionSuccess'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('monitoring.modal.connectionFailed');
      setTestError(msg);
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = async (data: HostFormValues) => {
    try {
      await api.createHost(data);
      toast.success(t('monitoring.toast.updated'));
      reset();
      setTestResult(null);
      setTestError(null);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('monitoring.toast.updateFailed'));
    }
  };

  const handleClose = () => {
    reset();
    setTestResult(null);
    setTestError(null);
    setPpkWarning(false);
    setIsDragging(false);
    onClose();
  };

  if (!isOpen) return null;

  const inputClass = (hasError?: boolean) =>
    `w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border ${hasError ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MaterialIcon name="add_circle" className="text-primary" />
            {t('monitoring.addResource')}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.id')}</label>
              <input
                {...register('id')}
                placeholder={t('monitoring.modal.hostIdPlaceholder')}
                className={inputClass(!!errors.id)}
              />
              {errors.id ? (
                <p className="text-[10px] text-red-500 font-medium">{errors.id.message}</p>
              ) : (
                <p className="text-[10px] text-slate-400">{t('monitoring.modal.idHint')}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.name')}</label>
              <input
                {...register('name')}
                placeholder={t('monitoring.modal.hostNamePlaceholder')}
                className={inputClass(!!errors.name)}
              />
              {errors.name ? (
                <p className="text-[10px] text-red-500 font-medium">{errors.name.message}</p>
              ) : (
                <p className="text-[10px] text-slate-400">{t('monitoring.modal.displayName')}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.type')}</label>
            <div className="flex gap-2">
              <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer transition-all ${selectedType === 'local' ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                <input {...register('type')} type="radio" value="local" className="hidden" />
                <MaterialIcon name="computer" className="text-lg" />
                Local
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer transition-all ${selectedType === 'remote' ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                <input {...register('type')} type="radio" value="remote" className="hidden" />
                <MaterialIcon name="cloud" className="text-lg" />
                Remote
              </label>
            </div>
            <p className="text-[10px] text-slate-400">{t('monitoring.modal.localAutoManaged')}</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitoring.modal.resourceCategory')}</label>
            <div className="flex gap-2">
              {([
                { value: 'server',    icon: 'dns',           label: t('monitoring.resourceTypes.server') },
                { value: 'database',  icon: 'storage',       label: t('monitoring.resourceTypes.database') },
                { value: 'container', icon: 'deployed_code', label: t('monitoring.resourceTypes.container') },
              ] as const).map(({ value, icon, label }) => (
                <label
                  key={value}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer transition-all text-sm ${watch('resourceCategory') === value ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                >
                  <input {...register('resourceCategory')} type="radio" value={value} className="hidden" />
                  <MaterialIcon name={icon} className="text-lg" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitoring.modal.ipAddress')}</label>
              <input
                {...register('ip')}
                placeholder={t('monitoring.modal.ipPlaceholder')}
                className={inputClass(!!errors.ip)}
              />
              {errors.ip && <p className="text-[10px] text-red-500 font-medium">{errors.ip.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitoring.modal.port')}</label>
              <input
                {...register('port', { valueAsNumber: true })}
                type="number"
                placeholder={t('monitoring.modal.portPlaceholder')}
                className={inputClass(!!errors.port)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitoring.modal.group')}</label>
            <input
              {...register('group')}
              placeholder={t('monitoring.modal.groupPlaceholder')}
              className={inputClass(!!errors.group)}
            />
            <p className="text-[10px] text-slate-400">{t('monitoring.modal.groupHint')}</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitoring.modal.description')}</label>
            <textarea
              {...register('description')}
              placeholder={t('monitoring.modal.descriptionPlaceholder')}
              rows={2}
              className={`${inputClass(!!errors.description)} resize-none`}
            />
          </div>

          {/* SSH Settings — only for remote hosts */}
          {selectedType === 'remote' && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
                <MaterialIcon name="key" className="text-lg text-primary" />
                {t('monitoring.modal.sshSettings')}
              </h3>

              <div className="space-y-4">
                {/* SSH User + SSH Port */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitoring.modal.sshUser')}</label>
                    <input
                      {...register('sshUser')}
                      placeholder={t('monitoring.modal.sshUserPlaceholder')}
                      className={inputClass(!!errors.sshUser)}
                    />
                    {errors.sshUser && <p className="text-[10px] text-red-500 font-medium">{errors.sshUser.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitoring.modal.sshPort')}</label>
                    <input
                      {...register('sshPort', { valueAsNumber: true })}
                      type="number"
                      placeholder="22"
                      className={inputClass(!!errors.sshPort)}
                    />
                  </div>
                </div>

                {/* Auth Type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitoring.modal.authType')}</label>
                  <div className="flex gap-2">
                    {(['password', 'key', 'key_file'] as const).map((authType) => (
                      <label
                        key={authType}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border cursor-pointer transition-all text-xs ${
                          selectedAuthType === authType
                            ? 'bg-primary/10 border-primary text-primary font-bold'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <input {...register('sshAuthType')} type="radio" value={authType} className="hidden" />
                        <MaterialIcon
                          name={authType === 'password' ? 'password' : authType === 'key' ? 'vpn_key' : 'folder'}
                          className="text-sm"
                        />
                        {t(`monitoring.modal.auth${authType === 'password' ? 'Password' : authType === 'key' ? 'Key' : 'KeyFile'}`)}
                      </label>
                    ))}
                  </div>
                  {errors.sshAuthType && <p className="text-[10px] text-red-500 font-medium">{errors.sshAuthType.message}</p>}
                </div>

                {/* Conditional auth fields */}
                {selectedAuthType === 'password' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitoring.modal.password')}</label>
                    <input
                      {...register('sshPassword')}
                      type="password"
                      placeholder={t('monitoring.modal.passwordPlaceholder')}
                      className={inputClass(!!errors.sshPassword)}
                    />
                    {errors.sshPassword && <p className="text-[10px] text-red-500 font-medium">{errors.sshPassword.message}</p>}
                  </div>
                )}

                {selectedAuthType === 'key' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitoring.modal.sshKey')}</label>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        <MaterialIcon name="upload_file" className="text-sm" />
                        {t('monitoring.modal.sshKeyBrowse')}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pem,.ppk,.key,.pub,.id_rsa"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleKeyFile(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative rounded-lg border-2 border-dashed transition-all ${
                        isDragging
                          ? 'border-primary bg-primary/5'
                          : errors.sshKey ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <textarea
                        {...register('sshKey')}
                        placeholder={t('monitoring.modal.sshKeyPlaceholder')}
                        rows={4}
                        className="w-full px-4 py-2 bg-transparent outline-none resize-none font-mono text-xs"
                      />
                      {!watch('sshKey') && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-[10px] text-slate-400 mt-8">{t('monitoring.modal.sshKeyDragDrop')}</p>
                        </div>
                      )}
                    </div>
                    {ppkWarning && (
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                        <MaterialIcon name="warning" className="text-sm text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">{t('monitoring.modal.sshKeyPpkDetected')}</p>
                      </div>
                    )}
                    {errors.sshKey && <p className="text-[10px] text-red-500 font-medium">{errors.sshKey.message}</p>}
                  </div>
                )}

                {selectedAuthType === 'key_file' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitoring.modal.sshKeyPath')}</label>
                    <input
                      {...register('sshKeyPath')}
                      placeholder={t('monitoring.modal.sshKeyPathPlaceholder')}
                      className={inputClass(!!errors.sshKeyPath)}
                    />
                    {errors.sshKeyPath ? (
                      <p className="text-[10px] text-red-500 font-medium">{errors.sshKeyPath.message}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MaterialIcon name="info" className="text-xs" />
                        {t('monitoring.modal.sshKeyPathHint')}
                      </p>
                    )}
                  </div>
                )}

                {/* Test Connection */}
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                      {t('monitoring.modal.testing')}
                    </>
                  ) : (
                    <>
                      <MaterialIcon name="cable" className="text-lg" />
                      {t('monitoring.modal.testConnection')}
                    </>
                  )}
                </button>

                {/* Test Result */}
                {testResult && (
                  <div className="p-3 rounded-lg bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 text-sm">
                    <div className="flex items-center gap-2 text-lime-700 dark:text-lime-400 font-bold mb-1">
                      <MaterialIcon name="check_circle" className="text-lg" />
                      {t('monitoring.modal.connectionSuccess')}
                    </div>
                    <div className="text-xs text-lime-600 dark:text-lime-500 space-y-0.5">
                      {testResult.hostname && <p>Hostname: {testResult.hostname}</p>}
                      {testResult.platform && <p>OS: {testResult.platform}</p>}
                      <p>{t('monitoring.modal.latency')}: {testResult.latencyMs}ms</p>
                    </div>
                  </div>
                )}

                {testError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold mb-1">
                      <MaterialIcon name="error" className="text-lg" />
                      {t('monitoring.modal.connectionFailed')}
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-500">{testError}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
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
