import { useRef, useEffect } from 'react';
import { User, Users } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import clsx from 'clsx';
import type { Role } from '@counseling-interpreter/shared';

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function SpeakerIcon({ role }: { role: Role }) {
  return role === 'student' ? (
    <User className="w-4 h-4" />
  ) : (
    <Users className="w-4 h-4" />
  );
}

export function TranscriptPanel() {
  const { transcriptHistory, currentTranscript, role } = useSessionStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptHistory, currentTranscript]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <h2 className="text-lg font-semibold text-gray-800">Transcript</h2>
        <span className="text-sm text-gray-500">{transcriptHistory.length} messages</span>
      </div>

      {/* Transcript List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {transcriptHistory.length === 0 && !currentTranscript ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Mic className="w-12 h-12 mb-2 opacity-50" />
            <p>Start speaking to see the transcript</p>
          </div>
        ) : (
          <>
            {transcriptHistory.map((entry) => (
              <div
                key={entry.id}
                className={clsx(
                  'flex flex-col gap-2 p-3 rounded-lg',
                  entry.speaker === role
                    ? 'bg-primary-50 ml-8'
                    : 'bg-white border mr-8'
                )}
              >
                {/* Header */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <SpeakerIcon role={entry.speaker} />
                  <span className="font-medium">
                    {entry.speaker === 'student' ? 'Student' : 'Counselor'}
                  </span>
                  <span className="ml-auto">{formatTime(entry.timestamp)}</span>
                </div>

                {/* Original Text */}
                <div className="text-sm">
                  <span
                    className={clsx(
                      'inline-block px-2 py-0.5 rounded text-xs mr-2',
                      entry.sourceLanguage === 'en'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    )}
                  >
                    {entry.sourceLanguage === 'en' ? 'EN' : 'ZH'}
                  </span>
                  {entry.originalText}
                </div>

                {/* Translation */}
                {entry.translatedText && (
                  <div className="text-sm text-gray-600 border-t pt-2 mt-1">
                    <span
                      className={clsx(
                        'inline-block px-2 py-0.5 rounded text-xs mr-2',
                        entry.sourceLanguage === 'en'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {entry.sourceLanguage === 'en' ? 'ZH' : 'EN'}
                    </span>
                    {entry.translatedText}
                  </div>
                )}
              </div>
            ))}

            {/* Current (interim) transcript */}
            {currentTranscript && (
              <div className="p-3 rounded-lg bg-gray-100 border border-dashed border-gray-300 ml-8">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <Loader className="w-3 h-3 animate-spin" />
                  <span>Transcribing...</span>
                </div>
                <p className="text-sm text-gray-600">{currentTranscript}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Mic(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function Loader(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
