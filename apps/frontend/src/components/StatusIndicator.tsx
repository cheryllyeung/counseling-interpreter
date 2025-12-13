import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import clsx from 'clsx';

export function StatusIndicator() {
  const { isConnected, isProcessing, processingStage, latencyMetrics } = useSessionStore();

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white border-t">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">Disconnected</span>
          </>
        )}
      </div>

      {/* Processing Status */}
      {isProcessing && processingStage && (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
          <span className="text-sm text-primary-600">
            {processingStage === 'stt' && 'Transcribing...'}
            {processingStage === 'translation' && 'Translating...'}
            {processingStage === 'tts' && 'Generating audio...'}
          </span>
        </div>
      )}

      {/* Latency Metrics */}
      {latencyMetrics && (
        <div className="flex items-center gap-3 ml-auto text-xs text-gray-500">
          <span>STT: {latencyMetrics.stt}ms</span>
          <span>Translation: {latencyMetrics.translation}ms</span>
          <span>TTS: {latencyMetrics.tts}ms</span>
          <span
            className={clsx(
              'font-medium',
              latencyMetrics.total < 900 ? 'text-green-600' : 'text-orange-600'
            )}
          >
            Total: {latencyMetrics.total}ms
          </span>
        </div>
      )}
    </div>
  );
}
