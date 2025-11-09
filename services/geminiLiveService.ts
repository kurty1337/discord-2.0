import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';

// --- Audio Encoding/Decoding ---
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Fix: Updated decodeAudioData to be more robust and match guideline implementation.
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


function createBlob(data: Float32Array): Blob {
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

// --- Function Declaration ---
const generateVideoFunctionDeclaration: FunctionDeclaration = {
    name: 'generateVideo',
    parameters: {
        type: Type.OBJECT,
        description: 'Generates a video based on a user-provided text prompt.',
        properties: {
            prompt: {
                type: Type.STRING,
                description: 'A detailed description of the video to be generated.',
            },
        },
        required: ['prompt'],
    },
};

// --- Service ---
interface ConnectOptions {
    stream: MediaStream;
    onAudio: () => void;
    onAudioEnd: () => void;
    onFunctionCall: (name: string, args: any) => void;
    onError: (e: any) => void;
    onClose: (e: CloseEvent) => void;
}

export class GeminiLiveService {
    private ai: GoogleGenAI;
    private sessionPromise: Promise<any> | null = null;
    private inputAudioContext: AudioContext | null = null;
    private outputAudioContext: AudioContext | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private mediaStreamSource: MediaStreamAudioSourceNode | null = null;

    private outputNode: GainNode | null = null;
    private sources = new Set<AudioBufferSourceNode>();
    private nextStartTime = 0;

    constructor() {
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    }

    async connect(options: ConnectOptions) {
        // Fix: Use `(window as any).webkitAudioContext` to support vendor-prefixed API and avoid TypeScript error.
        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        // Fix: Use `(window as any).webkitAudioContext` to support vendor-prefixed API and avoid TypeScript error.
        this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        this.outputNode = this.outputAudioContext.createGain();

        this.sessionPromise = this.ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    this.mediaStreamSource = this.inputAudioContext!.createMediaStreamSource(options.stream);
                    this.scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
                    this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        this.sessionPromise?.then((session) => {
                           session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    this.mediaStreamSource.connect(this.scriptProcessor);
                    this.scriptProcessor.connect(this.inputAudioContext.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            options.onFunctionCall(fc.name, fc.args);
                            this.sessionPromise?.then((session) => {
                                session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } } });
                            });
                        }
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (base64Audio) {
                        options.onAudio();
                        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext!.currentTime);
                        // Fix: Call updated decodeAudioData with correct parameters.
                        const audioBuffer = await decodeAudioData(decode(base64Audio), this.outputAudioContext!, 24000, 1);
                        const source = this.outputAudioContext!.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(this.outputNode!);
                        source.addEventListener('ended', () => {
                            this.sources.delete(source);
                            if (this.sources.size === 0) options.onAudioEnd();
                        });
                        source.start(this.nextStartTime);
                        this.nextStartTime += audioBuffer.duration;
                        this.sources.add(source);
                    }
                },
                onerror: options.onError,
                onclose: options.onClose,
            },
            config: {
                responseModalities: [Modality.AUDIO],
                tools: [{ functionDeclarations: [generateVideoFunctionDeclaration] }],
                systemInstruction: "You are a friendly and helpful AI assistant. You can generate videos if the user asks for it. Be concise and conversational.",
            },
        });
        await this.sessionPromise;
    }

    close() {
        this.sessionPromise?.then(session => session.close());
        this.scriptProcessor?.disconnect();
        this.mediaStreamSource?.disconnect();
        this.inputAudioContext?.close();
        this.outputAudioContext?.close();
        this.sources.forEach(s => s.stop());
        this.sources.clear();
        this.sessionPromise = null;
    }
}
