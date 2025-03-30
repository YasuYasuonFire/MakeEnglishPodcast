declare module 'elevenlabs-node' {
  export interface VoiceOptions {
    apiKey: string;
  }

  export interface TranscriptionOptions {
    audioData: Buffer;
    language?: string;
  }

  export interface TextToSpeechOptions {
    text: string;
    voiceId: string;
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
  }

  export interface TranscriptionResult {
    text: string;
    language?: string;
  }

  export class Voice {
    constructor(options: VoiceOptions);
    transcribe(options: TranscriptionOptions): Promise<TranscriptionResult>;
    textToSpeech(options: TextToSpeechOptions): Promise<Buffer>;
  }
} 