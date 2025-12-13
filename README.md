# Counseling Interpreter

A real-time bilingual interpretation system designed for psychological counseling sessions. This application enables seamless communication between English-speaking students and Chinese-speaking counselors through live speech-to-text, translation, and text-to-speech.

## Features

- **Real-time Speech Recognition**: Powered by Deepgram's Nova-2 model for fast and accurate transcription
- **Instant Translation**: GPT-4o powered streaming translation between English and Chinese
- **Natural Text-to-Speech**: Azure Neural TTS for Chinese, ElevenLabs for English
- **Low Latency**: Optimized pipeline with ~1-2 second end-to-end latency
- **Dual-participant Sessions**: Student (English) and Counselor (Chinese) can join the same session
- **Live Transcript Display**: Real-time display of both original speech and translations

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Interface (React)                      │
│  ┌─────────────────┐                    ┌─────────────────┐     │
│  │     Student     │                    │    Counselor    │     │
│  │  🎤 English In  │                    │  🎤 Chinese In  │     │
│  │  🔊 Chinese Out │                    │  🔊 English Out │     │
│  └────────┬────────┘                    └────────┬────────┘     │
└───────────┼──────────────────────────────────────┼──────────────┘
            │              WebSocket               │
            │            (Socket.IO)               │
            ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Server (Node.js)                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Audio Pipeline                         │    │
│  │                                                         │    │
│  │   Audio In ──▶ Deepgram STT ──▶ GPT-4o Translation     │    │
│  │                                        │                │    │
│  │                                        ▼                │    │
│  │   Audio Out ◀── TTS Synthesis ◀────────┘                │    │
│  │              (Azure/ElevenLabs)                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
            │                                      │
            ▼                                      ▼
┌─────────────────┐  ┌─────────────┐  ┌─────────────────────────┐
│    Deepgram     │  │   OpenAI    │  │    Azure / ElevenLabs   │
│   Nova-2 STT    │  │   GPT-4o    │  │         TTS             │
└─────────────────┘  └─────────────┘  └─────────────────────────┘
```

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for development and building
- Tailwind CSS for styling
- Zustand for state management
- Socket.IO client for real-time communication

### Backend
- Node.js with Fastify
- Socket.IO for WebSocket connections
- Deepgram SDK for speech-to-text
- OpenAI SDK for translation
- Azure Cognitive Services for Chinese TTS
- ElevenLabs SDK for English TTS

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- API keys for:
  - [Deepgram](https://console.deepgram.com/) - Speech-to-text
  - [OpenAI](https://platform.openai.com/api-keys) - Translation
  - [Azure Speech Services](https://portal.azure.com/) - Chinese TTS
  - [ElevenLabs](https://elevenlabs.io/) - English TTS

## Installation

1. Clone the repository:
```bash
git clone https://github.com/cheryllyeung/counseling-interpreter.git
cd counseling-interpreter
```

2. Install dependencies:
```bash
pnpm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your API keys in `.env`:
```env
# Deepgram (Speech-to-Text)
DEEPGRAM_API_KEY=your_deepgram_api_key

# OpenAI (Translation)
OPENAI_API_KEY=your_openai_api_key

# Azure Speech Services (Chinese TTS)
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=eastasia

# ElevenLabs (English TTS)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

## Usage

### Development

Start the development server:
```bash
pnpm dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Starting a Session

1. Open the application in your browser
2. Enter or generate a Session ID
3. Select your role:
   - **Student**: Speaks English, hears Chinese translation
   - **Counselor**: Speaks Chinese, hears English translation
4. Click "Join Session"
5. Share the Session ID with the other participant
6. Click the microphone button to start speaking

### Two-participant Testing

Open two browser windows:
1. Window 1: Join as Student with Session ID (e.g., `ABC123`)
2. Window 2: Join as Counselor with the same Session ID

## Project Structure

```
counseling-interpreter/
├── apps/
│   ├── frontend/              # React frontend application
│   │   └── src/
│   │       ├── components/    # UI components
│   │       ├── hooks/         # Custom React hooks
│   │       ├── services/      # Socket service
│   │       └── stores/        # Zustand stores
│   │
│   └── backend/               # Fastify backend server
│       └── src/
│           ├── config/        # Environment configuration
│           ├── pipelines/     # Audio processing pipeline
│           ├── services/      # External API services
│           ├── socket/        # Socket.IO handlers
│           └── utils/         # Utilities
│
├── packages/
│   └── shared/                # Shared types and utilities
│
├── .env.example               # Environment variables template
├── package.json               # Root project configuration
└── pnpm-workspace.yaml        # pnpm workspace configuration
```

## API Cost Estimation

### Per Hour of Counseling

| Service | Unit | Est. Usage | Price | Subtotal |
|---------|------|------------|-------|----------|
| Deepgram | per minute | 60 min × 2 | $0.0043/min | ~$0.52 |
| OpenAI GPT-4o | per 1K tokens | ~20K tokens | $0.01/1K | ~$0.20 |
| Azure TTS | per 1M chars | ~15K chars | $16/1M | ~$0.24 |
| ElevenLabs | per 1K chars | ~10K chars | $0.30/1K | ~$3.00 |

**Total per hour**: ~$4 USD

### Free Tiers

| Service | Free Quota |
|---------|------------|
| Deepgram | $200 credits for new accounts |
| Azure Speech | 500K chars/month (F0 tier) |
| ElevenLabs | 10K chars/month |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development servers |
| `pnpm build` | Build for production |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm clean` | Clean build artifacts |

## License

MIT
