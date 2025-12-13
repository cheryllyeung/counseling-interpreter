# 心理諮商即時口譯系統

Real-time Bilingual Interpretation System for Psychological Counseling

---

## 目錄

1. [系統概述](#系統概述)
2. [系統架構](#系統架構)
3. [技術棧](#技術棧)
4. [核心流程](#核心流程)
5. [專案結構](#專案結構)
6. [套件功能說明](#套件功能說明)
7. [服務模組詳解](#服務模組詳解)
8. [安裝與執行](#安裝與執行)
9. [API 費用估算](#api-費用估算)

---

## 系統概述

本系統專為心理諮商場景設計，提供外籍學生（英語）與諮商師（中文）之間的即時雙向口譯服務。

### 核心功能

- **即時語音辨識**：將說話者的語音即時轉換為文字
- **專業翻譯**：針對心理諮商術語優化的雙向翻譯
- **語音合成**：將翻譯結果轉換為自然語音播放
- **雙語逐字稿**：即時顯示原文與翻譯對照

### 延遲目標

```
總延遲 < 900ms
├── 語音辨識 (STT)    : ~300ms
├── 翻譯處理          : ~200-300ms
├── 語音合成 (TTS)    : ~100ms
└── 網路傳輸          : ~100ms
```

---

## 系統架構

```
┌─────────────────────────────────────────────────────────────────┐
│                        使用者介面 (React)                        │
│  ┌─────────────────┐                    ┌─────────────────┐     │
│  │   外籍學生       │                    │    諮商師        │     │
│  │   🎤 英文輸入    │                    │   🎤 中文輸入    │     │
│  │   🔊 中文輸出    │                    │   🔊 英文輸出    │     │
│  └────────┬────────┘                    └────────┬────────┘     │
└───────────┼──────────────────────────────────────┼──────────────┘
            │              WebSocket               │
            │            (Socket.IO)               │
            ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      後端伺服器 (Node.js)                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    音訊處理管線                          │    │
│  │                                                         │    │
│  │   音訊輸入 ──▶ Deepgram STT ──▶ GPT-4o 翻譯            │    │
│  │                                      │                  │    │
│  │                                      ▼                  │    │
│  │   音訊輸出 ◀── TTS 合成 ◀────────────┘                  │    │
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

---

## 技術棧

### 後端 (Backend)

| 技術 | 版本 | 用途 |
|------|------|------|
| Node.js | 20+ | 執行環境 |
| Fastify | 5.x | HTTP 伺服器框架 |
| Socket.IO | 4.x | WebSocket 即時通訊 |
| TypeScript | 5.x | 型別安全 |

### 前端 (Frontend)

| 技術 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| Vite | 6.x | 建置工具 |
| Tailwind CSS | 3.x | 樣式框架 |
| Zustand | 5.x | 狀態管理 |
| Socket.IO Client | 4.x | WebSocket 客戶端 |

### AI 服務

| 服務 | 功能 | 特點 |
|------|------|------|
| Deepgram Nova-2 | 語音轉文字 | 串流處理、低延遲、高準確度 |
| OpenAI GPT-4o | 翻譯 | 理解語境、保留情緒、專業術語 |
| Azure Speech | 中文語音合成 | 台灣腔、自然語調 |
| ElevenLabs | 英文語音合成 | 高品質、自然流暢 |

---

## 核心流程

### 英文 → 中文（學生說話，諮商師聽）

```
1. 學生對麥克風說英文
          │
          ▼
2. 瀏覽器透過 Web Audio API 擷取音訊
          │
          ▼
3. 音訊串流透過 WebSocket 傳送到後端
          │
          ▼
4. Deepgram 即時將英文語音轉為文字
          │
          ▼
5. GPT-4o 將英文翻譯成繁體中文（台灣用語）
          │
          ▼
6. Azure TTS 將中文文字轉為語音（台灣腔）
          │
          ▼
7. 音訊透過 WebSocket 傳送到諮商師端播放
```

### 中文 → 英文（諮商師說話，學生聽）

```
1. 諮商師對麥克風說中文
          │
          ▼
2. 瀏覽器透過 Web Audio API 擷取音訊
          │
          ▼
3. 音訊串流透過 WebSocket 傳送到後端
          │
          ▼
4. Deepgram 即時將中文語音轉為文字
          │
          ▼
5. GPT-4o 將中文翻譯成英文
          │
          ▼
6. ElevenLabs TTS 將英文文字轉為語音
          │
          ▼
7. 音訊透過 WebSocket 傳送到學生端播放
```

---

## 專案結構

```
counseling-interpreter/
│
├── apps/
│   │
│   ├── backend/                      # 後端應用程式
│   │   ├── src/
│   │   │   ├── index.ts              # 程式進入點
│   │   │   ├── app.ts                # Fastify 應用設定
│   │   │   │
│   │   │   ├── config/
│   │   │   │   └── env.ts            # 環境變數驗證與載入
│   │   │   │
│   │   │   ├── services/             # AI 服務整合
│   │   │   │   ├── deepgram.service.ts    # 語音辨識服務
│   │   │   │   ├── translation.service.ts # 翻譯服務
│   │   │   │   ├── azure-tts.service.ts   # Azure 語音合成
│   │   │   │   └── elevenlabs.service.ts  # ElevenLabs 語音合成
│   │   │   │
│   │   │   ├── socket/               # WebSocket 處理
│   │   │   │   ├── index.ts          # Socket.IO 設定
│   │   │   │   └── handlers/
│   │   │   │       ├── audio.handler.ts   # 音訊串流處理
│   │   │   │       └── session.handler.ts # 會話管理
│   │   │   │
│   │   │   ├── pipelines/            # 音訊處理管線
│   │   │   │   └── audio-pipeline.ts # 核心處理邏輯
│   │   │   │
│   │   │   └── utils/
│   │   │       └── logger.ts         # 日誌工具
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                     # 前端應用程式
│       ├── src/
│       │   ├── main.tsx              # 程式進入點
│       │   ├── App.tsx               # 根元件
│       │   │
│       │   ├── components/           # UI 元件
│       │   │   ├── SessionView.tsx   # 主要會話介面
│       │   │   ├── AudioControls.tsx # 錄音控制按鈕
│       │   │   ├── TranscriptPanel.tsx # 逐字稿面板
│       │   │   └── StatusIndicator.tsx # 狀態指示器
│       │   │
│       │   ├── hooks/                # React Hooks
│       │   │   ├── useSocket.ts      # WebSocket 連線管理
│       │   │   ├── useAudioRecorder.ts # 麥克風錄音
│       │   │   └── useAudioPlayer.ts # 音訊播放
│       │   │
│       │   ├── stores/               # 狀態管理
│       │   │   └── sessionStore.ts   # Zustand 狀態庫
│       │   │
│       │   └── services/
│       │       └── socket.service.ts # Socket.IO 客戶端封裝
│       │
│       ├── package.json
│       ├── vite.config.ts
│       └── tailwind.config.js
│
├── packages/
│   └── shared/                       # 共用程式碼
│       └── src/
│           └── types/
│               └── socket-events.ts  # Socket 事件型別定義
│
├── .env                              # 環境變數（API 金鑰）
├── .env.example                      # 環境變數範本
├── package.json                      # 根專案設定
├── pnpm-workspace.yaml               # pnpm 工作區設定
└── tsconfig.base.json                # 基礎 TypeScript 設定
```

---

## 套件功能說明

### 後端套件

| 套件 | 功能說明 |
|------|----------|
| `fastify` | 高效能 HTTP 伺服器框架，處理 REST API 請求 |
| `socket.io` | WebSocket 函式庫，實現即時雙向通訊 |
| `@deepgram/sdk` | Deepgram 官方 SDK，用於串流語音辨識 |
| `openai` | OpenAI 官方 SDK，用於 GPT-4o 翻譯 |
| `microsoft-cognitiveservices-speech-sdk` | Azure 語音服務 SDK，用於中文 TTS |
| `elevenlabs` | ElevenLabs SDK，用於英文 TTS |
| `zod` | 執行時型別驗證，確保環境變數正確 |
| `pino` | 高效能日誌函式庫 |
| `uuid` | 產生唯一識別碼 |

### 前端套件

| 套件 | 功能說明 |
|------|----------|
| `react` | UI 元件框架 |
| `react-dom` | React DOM 渲染 |
| `socket.io-client` | Socket.IO 客戶端，與後端 WebSocket 連線 |
| `zustand` | 輕量級狀態管理，管理會話和音訊狀態 |
| `clsx` | 條件式 CSS 類別名稱工具 |
| `lucide-react` | 圖示元件庫 |

### 開發工具

| 套件 | 功能說明 |
|------|----------|
| `typescript` | TypeScript 編譯器，提供型別安全 |
| `vite` | 前端建置工具，快速開發伺服器 |
| `tailwindcss` | 原子化 CSS 框架 |
| `tsx` | TypeScript 執行器，用於開發模式 |
| `pnpm` | 高效能套件管理器，支援 monorepo |

---

## 服務模組詳解

### 1. Deepgram 語音辨識服務

**檔案**: `apps/backend/src/services/deepgram.service.ts`

**功能**: 將即時語音串流轉換為文字

**特點**:
- 使用 Nova-2 模型，支援中英文
- 串流處理，低延遲（~300ms）
- 支援中間結果（interim results）即時回饋
- 自動偵測語音結束（endpointing）

**設定參數**:
```typescript
{
  model: 'nova-2',           // 使用 Nova-2 模型
  language: 'en-US' | 'zh-TW', // 語言設定
  punctuate: true,           // 自動加標點
  interim_results: true,     // 回傳中間結果
  endpointing: 300,          // 300ms 靜音偵測
  sample_rate: 16000,        // 取樣率 16kHz
}
```

### 2. 翻譯服務

**檔案**: `apps/backend/src/services/translation.service.ts`

**功能**: 使用 GPT-4o 進行專業心理諮商翻譯

**特點**:
- 針對心理諮商術語優化
- 保留說話者的情緒和語氣
- 支援串流輸出，降低延遲
- 雙向翻譯（英→中、中→英）

**專業術語對照** (部分):
| English | 繁體中文 |
|---------|----------|
| anxiety | 焦慮 |
| depression | 憂鬱 |
| trauma | 創傷 |
| attachment | 依附關係 |
| cognitive behavioral therapy | 認知行為治療 |
| mindfulness | 正念 |
| empathy | 同理心 |

### 3. Azure TTS 語音合成服務

**檔案**: `apps/backend/src/services/azure-tts.service.ts`

**功能**: 將中文翻譯結果轉為自然語音

**特點**:
- 使用台灣中文神經語音
- 自然語調和發音
- 支援 SSML 調整語速和語調

**預設語音**: `zh-TW-HsiaoChenNeural`（女聲）

### 4. ElevenLabs TTS 語音合成服務

**檔案**: `apps/backend/src/services/elevenlabs.service.ts`

**功能**: 將英文翻譯結果轉為自然語音

**特點**:
- 使用 Turbo v2.5 模型，低延遲
- 高品質自然英文語音
- 支援串流輸出

### 5. 音訊處理管線

**檔案**: `apps/backend/src/pipelines/audio-pipeline.ts`

**功能**: 整合所有服務，處理完整的翻譯流程

**架構**:
```
AudioPipeline (抽象類別)
    │
    ├── EnglishToChinese   # 英文輸入 → 中文輸出
    │   └── 使用 Azure TTS
    │
    └── ChineseToEnglish   # 中文輸入 → 英文輸出
        └── 使用 ElevenLabs TTS
```

**處理流程**:
1. 接收音訊串流
2. 傳送至 Deepgram 進行語音辨識
3. 收到最終文字後，傳送至 GPT-4o 翻譯
4. 將翻譯結果傳送至 TTS 服務
5. 將合成語音傳送回客戶端

---

## 安裝與執行

### 前置需求

- Node.js 20+
- pnpm 9+
- 各服務 API 金鑰

### 安裝步驟

```bash
# 1. 進入專案目錄
cd counseling-interpreter

# 2. 安裝依賴
pnpm install

# 3. 建置共用套件
pnpm --filter @counseling-interpreter/shared build

# 4. 設定環境變數
cp .env.example .env
# 編輯 .env 填入 API 金鑰
```

### 啟動開發伺服器

**終端機 1 - 後端**:
```bash
cd apps/backend
pnpm dev
```

**終端機 2 - 前端**:
```bash
cd apps/frontend
pnpm dev
```

### 存取應用程式

開啟瀏覽器前往: http://localhost:5173

### 使用方式

1. 輸入或產生一個 Session ID
2. 選擇角色（Student 或 Counselor）
3. 點擊加入會話
4. 點擊麥克風按鈕開始說話
5. 系統會自動進行翻譯並播放給對方

---

## API 費用估算

### 每小時諮商費用

| 服務 | 計費單位 | 預估用量 | 單價 | 小計 |
|------|----------|----------|------|------|
| Deepgram | 每分鐘 | 60 min × 2 | $0.0043/min | ~$0.52 |
| OpenAI GPT-4o | 每千 tokens | ~20K tokens | $0.01/1K | ~$0.20 |
| Azure TTS | 每百萬字元 | ~15K 字元 | $16/1M | ~$0.24 |
| ElevenLabs | 每千字元 | ~10K 字元 | $0.30/1K | ~$3.00 |

**每小時總成本**: 約 **$4 USD**（約 NT$130）

### 免費額度

| 服務 | 免費額度 |
|------|----------|
| Deepgram | 新帳號 $200 credits |
| Azure Speech | 每月 500K 字元 (F0 tier) |
| ElevenLabs | 每月 10K 字元 |

---

## WebSocket 事件

### 客戶端 → 伺服器

| 事件 | 說明 |
|------|------|
| `session:join` | 加入諮商會話 |
| `session:leave` | 離開會話 |
| `audio:start` | 開始傳送音訊 |
| `audio:chunk` | 傳送音訊片段 |
| `audio:stop` | 停止傳送音訊 |

### 伺服器 → 客戶端

| 事件 | 說明 |
|------|------|
| `transcript:interim` | 即時轉錄中間結果 |
| `transcript:final` | 最終轉錄結果 |
| `translation:complete` | 翻譯完成 |
| `tts:chunk` | TTS 音訊片段 |
| `status:latency` | 延遲統計資訊 |

---

## 授權

本專案僅供心理諮商使用。
