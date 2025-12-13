import { useState, useCallback, useEffect } from 'react';
import { SessionView } from './components/SessionView';
import { useSocket } from './hooks/useSocket';
import { useSessionStore } from './stores/sessionStore';
import { User, Users, LogIn } from 'lucide-react';
import clsx from 'clsx';
import type { Role } from '@counseling-interpreter/shared';

function App() {
  const [sessionId, setSessionId] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const { joinSession } = useSocket();
  const { isConnected, role, setSession, reset } = useSessionStore();

  // Generate a random session ID
  const generateSessionId = useCallback(() => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setSessionId(id);
  }, []);

  // Generate session ID on mount
  useEffect(() => {
    generateSessionId();
  }, [generateSessionId]);

  const handleJoin = useCallback(() => {
    if (!sessionId || !selectedRole) return;

    setIsJoining(true);
    setSession(sessionId, selectedRole);
    joinSession(sessionId, selectedRole);
  }, [sessionId, selectedRole, setSession, joinSession]);

  const handleLeaveSession = useCallback(() => {
    reset();
    setIsJoining(false);
    setSelectedRole(null);
    generateSessionId();
  }, [reset, generateSessionId]);

  // Show session view if user has joined
  if (role && isJoining) {
    return (
      <div className="h-screen">
        <SessionView sessionId={sessionId} />
        <button
          onClick={handleLeaveSession}
          className="fixed bottom-4 left-4 px-4 py-2 text-sm text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
        >
          Leave Session
        </button>
      </div>
    );
  }

  // Show join screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Counseling Interpreter
          </h1>
          <p className="text-gray-500">
            Real-time bilingual interpretation for counseling sessions
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span
            className={clsx(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected to server' : 'Connecting...'}
          </span>
        </div>

        {/* Session ID Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value.toUpperCase())}
              placeholder="Enter session ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={generateSessionId}
              className="px-4 py-2 text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50"
            >
              New
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Share this ID with the other participant
          </p>
        </div>

        {/* Role Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select your role
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedRole('student')}
              className={clsx(
                'flex flex-col items-center gap-3 p-4 border-2 rounded-xl transition-all',
                selectedRole === 'student'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <User
                className={clsx(
                  'w-8 h-8',
                  selectedRole === 'student' ? 'text-primary-600' : 'text-gray-400'
                )}
              />
              <div className="text-center">
                <p className="font-medium text-gray-800">Student</p>
                <p className="text-xs text-gray-500">Speaks English</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedRole('counselor')}
              className={clsx(
                'flex flex-col items-center gap-3 p-4 border-2 rounded-xl transition-all',
                selectedRole === 'counselor'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <Users
                className={clsx(
                  'w-8 h-8',
                  selectedRole === 'counselor' ? 'text-primary-600' : 'text-gray-400'
                )}
              />
              <div className="text-center">
                <p className="font-medium text-gray-800">Counselor</p>
                <p className="text-xs text-gray-500">Speaks Chinese</p>
              </div>
            </button>
          </div>
        </div>

        {/* Join Button */}
        <button
          onClick={handleJoin}
          disabled={!sessionId || !selectedRole || !isConnected}
          className={clsx(
            'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
            sessionId && selectedRole && isConnected
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          <LogIn className="w-5 h-5" />
          Join Session
        </button>
      </div>
    </div>
  );
}

export default App;
