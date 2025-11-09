
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Peer, DataConnection, MediaConnection } from 'peerjs';
import VideoPlayer from './components/VideoPlayer';
import Transcription from './components/Transcription';
import { ConnectionState, TranscriptionEntry } from './types';
import BottomBar from './components/BottomBar';

// FIX: Add type definitions for browser-specific APIs (SpeechRecognition) and external libraries (PeerJS) to the global window object to resolve TypeScript errors.
// FIX: Define SpeechRecognition interfaces to avoid circular references and provide types for the API.
declare global {
    interface SpeechRecognition {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (event: any) => void;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
    }

    interface SpeechRecognitionStatic {
        new (): SpeechRecognition;
    }

    interface Window {
        SpeechRecognition: SpeechRecognitionStatic;
        webkitSpeechRecognition: SpeechRecognitionStatic;
        Peer: any;
    }
}

// Polyfill for SpeechRecognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
// FIX: Use the globally defined SpeechRecognition interface and remove 'globalThis' to resolve the type error.
let recognition: SpeechRecognition | null = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ru-RU';
}

const App: React.FC = () => {
    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
    const [useCamera, setUseCamera] = useState<boolean>(true);
    const [isMicOn, setIsMicOn] = useState<boolean>(true);
    const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
    const [hasCamera, setHasCamera] = useState<boolean>(false);
    const [isRemoteMuted, setIsRemoteMuted] = useState<boolean>(false);
    const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
    const [peerId, setPeerId] = useState<string>('');
    const [remotePeerId, setRemotePeerId] = useState<string>('');
    
    const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
    
    const peerRef = useRef<Peer | null>(null);
    const userStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const dataConnectionRef = useRef<DataConnection | null>(null);
    const mediaConnectionRef = useRef<MediaConnection | null>(null);
    
    // Initialize PeerJS
    useEffect(() => {
        if (!window.Peer) {
            console.error("PeerJS is not loaded");
            setConnectionState(ConnectionState.ERROR);
            return;
        }
        const peer = new (window.Peer as any)();
        peerRef.current = peer;

        peer.on('open', (id) => {
            setPeerId(id);
        });

        peer.on('call', (call) => {
            // Answer incoming call
            getMediaStream(useCamera).then(stream => {
                 if (!stream) return;
                 userStreamRef.current = stream;
                 const videoTracks = stream.getVideoTracks();
                 const cameraAvailable = videoTracks.length > 0;
                 setIsCameraOn(cameraAvailable);
                 setHasCamera(cameraAvailable);

                 call.answer(stream);
                 mediaConnectionRef.current = call;
                 
                 call.on('stream', (remoteStream) => {
                     remoteStreamRef.current = remoteStream;
                     setConnectionState(ConnectionState.CONNECTED);
                 });
                 
                 call.on('close', handleEndCall);
            });
        });

        peer.on('connection', (conn) => {
            dataConnectionRef.current = conn;
            conn.on('data', (data) => {
                 const message = data as TranscriptionEntry;
                 if(message.speaker === 'friend' && message.text) {
                     setTranscriptions(prev => [...prev, message]);
                 }
            });
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            setConnectionState(ConnectionState.ERROR);
        });

        return () => {
            peer.destroy();
        };
    }, [useCamera]);
    
    // Initialize SpeechRecognition
    useEffect(() => {
        if (!recognition) return;
        
        let finalTranscript = '';
        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
        };

        recognition.onend = () => {
             if (finalTranscript) {
                 const newEntry: TranscriptionEntry = { speaker: 'user', text: finalTranscript };
                 setTranscriptions(prev => [...prev, newEntry]);
                 if (dataConnectionRef.current && dataConnectionRef.current.open) {
                     dataConnectionRef.current.send({ ...newEntry, speaker: 'friend' }); // Send as friend to the other side
                 }
                 finalTranscript = '';
             }
             // Restart recognition if call is active
             if(connectionState === ConnectionState.CONNECTED) {
                recognition.start();
             }
        };

        return () => {
            recognition?.stop();
        };
    }, [connectionState]);


    const getMediaStream = async (video: boolean): Promise<MediaStream | null> => {
        try {
            let stream: MediaStream;
            const constraints = { audio: true, video };
            
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err) {
                console.warn(`getUserMedia with constraints ${JSON.stringify(constraints)} failed, falling back to audio only.`, err);
                if (video) {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                } else {
                    throw err;
                }
            }
            return stream;
        } catch (error) {
            console.error('Failed to get user media', error);
            setConnectionState(ConnectionState.ERROR);
            return null;
        }
    }


    const handleStartCall = async () => {
        if (!remotePeerId || !peerRef.current) return;
        setConnectionState(ConnectionState.CONNECTING);
        
        const stream = await getMediaStream(useCamera);
        if (!stream) return;
        
        userStreamRef.current = stream;
        const videoTracks = stream.getVideoTracks();
        const cameraAvailable = videoTracks.length > 0;
        setIsCameraOn(cameraAvailable);
        setHasCamera(cameraAvailable);

        const call = peerRef.current.call(remotePeerId, stream);
        mediaConnectionRef.current = call;
        const conn = peerRef.current.connect(remotePeerId);
        dataConnectionRef.current = conn;

        call.on('stream', (remoteStream) => {
            remoteStreamRef.current = remoteStream;
            setConnectionState(ConnectionState.CONNECTED);
            recognition?.start();
        });

        call.on('close', handleEndCall);
        call.on('error', (err) => {
            console.error("Call error:", err);
            setConnectionState(ConnectionState.ERROR);
        });
        
        conn.on('open', () => {
             console.log("Data connection opened");
        });
    };

    const handleEndCall = useCallback(() => {
        mediaConnectionRef.current?.close();
        dataConnectionRef.current?.close();
        userStreamRef.current?.getTracks().forEach(track => track.stop());
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        userStreamRef.current = null;
        screenStreamRef.current = null;
        remoteStreamRef.current = null;
        recognition?.stop();
        setConnectionState(ConnectionState.IDLE);
        setTranscriptions([]);
        setHasCamera(false);
    }, []);

    const toggleMic = () => {
        if (userStreamRef.current) {
            userStreamRef.current.getAudioTracks().forEach(track => track.enabled = !isMicOn);
            setIsMicOn(!isMicOn);
        }
    };

    const toggleCamera = () => {
        if (userStreamRef.current && hasCamera) {
            userStreamRef.current.getVideoTracks().forEach(track => track.enabled = !isCameraOn);
            setIsCameraOn(!isCameraOn);
        }
    };
    
    const toggleRemoteMute = () => {
        setIsRemoteMuted(!isRemoteMuted);
    };

    const toggleScreenShare = async () => {
        alert("Демонстрация экрана в разработке!");
    };


    if (connectionState === ConnectionState.IDLE || connectionState === ConnectionState.ERROR) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#36393f] p-4 text-center text-gray-200">
                <h1 className="text-4xl font-bold text-purple-400 mb-2">P2P Видеозвонок</h1>
                <p className="text-gray-400 mb-6">Общайтесь с другом напрямую, используя WebRTC.</p>

                <div className="bg-[#2f3136] p-4 rounded-lg mb-4 w-full max-w-sm">
                    <p className="text-sm text-gray-400">Ваш ID для звонка:</p>
                    <p className="text-lg font-mono bg-[#202225] px-2 py-1 rounded select-all">{peerId || 'Загрузка...'}</p>
                </div>
                
                <div className="flex flex-col items-center w-full max-w-sm">
                    <input
                        type="text"
                        placeholder="Введите ID собеседника"
                        value={remotePeerId}
                        onChange={(e) => setRemotePeerId(e.target.value)}
                        className="w-full px-4 py-2 mb-4 bg-[#202225] border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                     <div className="flex items-center mb-4">
                        <input
                            id="use-camera"
                            type="checkbox"
                            checked={useCamera}
                            onChange={(e) => setUseCamera(e.target.checked)}
                            className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 ring-offset-[#36393f] focus:ring-2"
                        />
                        <label htmlFor="use-camera" className="ml-2 text-sm font-medium text-gray-300">Использовать камеру</label>
                    </div>
                    <button
                        onClick={handleStartCall}
                        disabled={!remotePeerId || !peerId}
                        className="w-full px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        Позвонить
                    </button>
                </div>
                {connectionState === ConnectionState.ERROR && <p className="text-red-500 mt-4">Произошла ошибка. Проверьте консоль или разрешения.</p>}
            </div>
        );
    }
    
    if (connectionState === ConnectionState.CONNECTING) {
        return (
             <div className="w-screen h-screen flex items-center justify-center bg-[#36393f]">
                <p className="text-xl animate-pulse text-gray-300">Соединение...</p>
             </div>
        );
    }

    return (
        <main className="w-screen h-screen flex flex-col bg-[#36393f] text-gray-200 font-sans">
            <div className="flex-grow flex flex-col p-2 overflow-hidden">
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-2 min-h-0">
                    <VideoPlayer stream={userStreamRef.current!} isLocalPlayer={true} name="Вы" />
                    <VideoPlayer stream={remoteStreamRef.current!} isMuted={isRemoteMuted} name="Собеседник" onToggleMute={toggleRemoteMute} />
                </div>
                <div className="w-full h-1/3 max-h-64 pt-2">
                     <Transcription entries={transcriptions} />
                </div>
            </div>
            <BottomBar 
                isMicOn={isMicOn}
                isCameraOn={isCameraOn}
                isCameraAvailable={hasCamera}
                isScreenSharing={isScreenSharing}
                onToggleMic={toggleMic}
                onToggleCamera={toggleCamera}
                onToggleScreenShare={toggleScreenShare}
                onEndCall={handleEndCall}
                peerId={peerId}
            />
        </main>
    );
};

export default App;