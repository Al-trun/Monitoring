import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { MaterialIcon } from '../../../components/common';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { api, Service } from '../../../services/api';

interface IntegrationPanelProps {
  service: Service;
  onApiKeyRegenerated: (newKey: string) => void;
}

export function IntegrationPanel({ service, onApiKeyRegenerated }: IntegrationPanelProps) {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState<'curl' | 'node' | 'python'>('curl');

  const apiKey = service.apiKey ?? '';
  const maskedKey = apiKey ? `${apiKey.slice(0, 10)}${'•'.repeat(20)}` : '—';
  const ingestUrl = `${window.location.origin}/api/v1/logs/ingest`;

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setShowConfirm(false);
    try {
      const { apiKey: newKey } = await api.regenerateServiceApiKey(service.id);
      onApiKeyRegenerated(newKey);
      setIsKeyVisible(true);
      toast.success(t('services.integration.toast.regenerated'));
    } catch {
      toast.error(t('services.integration.toast.regenerateFailed'));
    } finally {
      setIsRegenerating(false);
    }
  };

  const snippets = {
    curl: `curl -X POST ${ingestUrl} \\
  -H "Authorization: Bearer ${isKeyVisible ? apiKey : '<YOUR_API_KEY>'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "결제 처리 실패",
    "level": "error",
    "metadata": { "orderId": "12345" }
  }'`,
    node: `const res = await fetch('${ingestUrl}', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${isKeyVisible ? apiKey : '<YOUR_API_KEY>'}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: '결제 처리 실패',
    level: 'error',
    metadata: { orderId: '12345' },
  }),
});`,
    python: `import requests

requests.post(
    '${ingestUrl}',
    headers={
        'Authorization': 'Bearer ${isKeyVisible ? apiKey : '<YOUR_API_KEY>'}',
        'Content-Type': 'application/json',
    },
    json={
        'message': '결제 처리 실패',
        'level': 'error',
        'metadata': {'orderId': '12345'},
    },
)`,
  };

  return (
    <div className="space-y-6">
      {/* API Key Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <MaterialIcon name="key" className="text-lg text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('services.integration.apiKey.title')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('services.integration.apiKey.description')}
            </p>
          </div>
        </div>

        {/* Key Display */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg font-mono text-sm mb-4">
          <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">
            {isKeyVisible ? apiKey : maskedKey}
          </span>
          <button
            onClick={() => setIsKeyVisible((v) => !v)}
            className="flex-shrink-0 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
            title={isKeyVisible ? t('services.integration.apiKey.hide') : t('services.integration.apiKey.show')}
          >
            <MaterialIcon name={isKeyVisible ? 'visibility_off' : 'visibility'} className="text-base" />
          </button>
          <button
            onClick={() => copy(apiKey)}
            className="flex-shrink-0 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
            title={t('services.integration.apiKey.copy')}
          >
            <MaterialIcon name="content_copy" className="text-base" />
          </button>
        </div>

        {/* Warning + Regenerate */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <MaterialIcon name="warning" className="text-sm" />
            {t('services.integration.apiKey.warning')}
          </p>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            {isRegenerating ? (
              <MaterialIcon name="sync" className="text-sm animate-spin" />
            ) : (
              <MaterialIcon name="refresh" className="text-sm" />
            )}
            {t('services.integration.apiKey.regenerate')}
          </button>
        </div>
      </div>

      {/* Endpoint Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30">
            <MaterialIcon name="upload" className="text-lg text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('services.integration.endpoint.title')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('services.integration.endpoint.description')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg font-mono text-sm">
          <span className="text-xs font-bold text-white bg-green-600 px-2 py-0.5 rounded">POST</span>
          <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">{ingestUrl}</span>
          <button
            onClick={() => copy(ingestUrl)}
            className="flex-shrink-0 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
          >
            <MaterialIcon name="content_copy" className="text-base" />
          </button>
        </div>

        {/* Level guide */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(['error', 'warn', 'info'] as const).map((level) => (
            <div key={level} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                level === 'error' ? 'bg-red-500' : level === 'warn' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
              <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Code Snippets */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <MaterialIcon name="code" className="text-lg text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('services.integration.snippets.title')}
          </h3>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 mb-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
          {(['curl', 'node', 'python'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSnippet(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeSnippet === tab
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab === 'node' ? 'Node.js' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className="relative">
          <pre className="p-4 bg-slate-900 dark:bg-slate-950 rounded-lg text-xs text-slate-300 overflow-x-auto leading-relaxed whitespace-pre">
            {snippets[activeSnippet]}
          </pre>
          <button
            onClick={() => copy(snippets[activeSnippet])}
            className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300"
            title={t('services.integration.snippets.copy')}
          >
            <MaterialIcon name="content_copy" className="text-sm" />
          </button>
        </div>
      </div>

      {/* Regenerate Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-red-100 dark:bg-red-900/30">
                <MaterialIcon name="warning" className="text-xl text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('services.integration.apiKey.confirmTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('services.integration.apiKey.confirmDesc')}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRegenerate}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                {t('services.integration.apiKey.confirmAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
