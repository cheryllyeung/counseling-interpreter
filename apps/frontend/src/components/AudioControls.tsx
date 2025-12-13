import { Mic, Square } from 'lucide-react';
import clsx from 'clsx';

interface AudioControlsProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function AudioControls({ isRecording, onStart, onStop, disabled }: AudioControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main Recording Button */}
      <button
        onClick={isRecording ? onStop : onStart}
        disabled={disabled}
        className={clsx(
          'relative w-20 h-20 rounded-full transition-all duration-200',
          'focus:outline-none focus:ring-4',
          isRecording
            ? 'bg-red-500 hover:bg-red-600 focus:ring-red-200'
            : 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-200',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Pulse animation when recording */}
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
        )}

        {/* Icon */}
        <span className="relative flex items-center justify-center">
          {isRecording ? (
            <Square className="w-8 h-8 text-white fill-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </span>
      </button>

      {/* Status Text */}
      <span
        className={clsx(
          'text-sm font-medium',
          isRecording ? 'text-red-600' : 'text-gray-600'
        )}
      >
        {isRecording ? 'Recording... Click to stop' : 'Click to start speaking'}
      </span>

      {/* Audio Wave Animation */}
      {isRecording && (
        <div className="flex items-center justify-center gap-1 h-8">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="wave-bar w-1"
              style={{
                height: '100%',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
