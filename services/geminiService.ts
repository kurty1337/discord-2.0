// Fix: Replaced LiveSession with LiveConnection as it is no longer exported.
// FIX: The type `LiveConnection` is not exported from `@google/genai`. It has been removed from the import.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

// --- Audio Encoding/Decoding Helpers ---

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


// --- Service Definition ---

export interface GeminiCallbacks {
  onopen: () => void;
  onmessage: (message: LiveServerMessage) => void;
  onerror: (e: ErrorEvent) => void;
  onclose: (e: CloseEvent) => void;
}

class GeminiService {
  private ai: GoogleGenAI;
  // Fix: Replaced LiveSession with LiveConnection.
  // FIX: Using an inferred type for the session promise, as `LiveConnection` is not an exported member.
  private sessionPromise: ReturnType<typeof this.ai.live.connect> | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  // Fix: Replaced LiveSession with LiveConnection.
  // FIX: Using an inferred return type, as `LiveConnection` is not an exported member.
  async connect(callbacks: GeminiCallbacks) {
    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: 'You are a helpful and friendly AI assistant.',
      }
    });
    return this.sessionPromise;
  }

  sendAudio(audioData: Float32Array) {
    if (!this.sessionPromise) return;
    const pcmBlob = this.createBlob(audioData);
    this.sessionPromise.then((session) => {
      session.sendRealtimeInput({ media: pcmBlob });
    });
  }
  
  private createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  close() {
    this.sessionPromise?.then(session => session.close());
    this.sessionPromise = null;
  }
}

export { GeminiService, decode, decodeAudioData };