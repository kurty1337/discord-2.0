import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Peer, DataConnection, MediaConnection } from 'peerjs';
import VideoPlayer from './components/VideoPlayer';
import Transcription from './components/Transcription';
import { ConnectionState, TranscriptionEntry } from './types';
import BottomBar from './components/BottomBar';

declare global {
    interface Window {
        Peer: any;
    }
}

const App: React.FC = () => {
    const [username, setUsername] = useState<string | null>(null);
    const [usernameInput, setUsernameInput] = useState<string>('');
    const [inCall, setInCall] = useState(false);
    const [peerId, setPeerId] = useState<string>('');
    const [remotePeerId, setRemotePeerId] = useState('');
    const [isCalling, setIsCalling] = useState(false);

    const [isMicOn, setIsMicOn] = useState<boolean>(true);
    const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
    const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
    
    const [userStream, setUserStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const peerRef = useRef<Peer | null>(null);
    const mediaConnectionRef = useRef<MediaConnection | null>(null);
    
    // Check for saved username on initial load
    useEffect(() => {
        const savedUser = localStorage.getItem('discordCloneUser');
        if (savedUser) {
            setUsername(savedUser);
        }
    }, []);

    // Initialize PeerJS connection when username is set
    useEffect(() => {
        if (username && !peerRef.current) {
            // A simple but effective way to create a user-specific but stable peer ID
            const sanitizedId = username.replace(/[^a-zA-Z0-9]/g, '');
            const peer = new window.Peer(`dc-clone-${sanitizedId}`);
            peerRef.current = peer;
            
            peer.on('open', (id) => {
                setPeerId(id);
            });

            peer.on('call', async (call) => {
                const stream = await getMediaStream(true, false);
                setUserStream(stream);
                call.answer(stream);
                mediaConnectionRef.current = call;
                call.on('stream', (rStream) => {
                    setRemoteStream(rStream);
                });
                setInCall(true);
            });
            
            peer.on('error', (err: any) => {
                console.error("PeerJS Error:", err);
                // Simple reconnect logic
                if (!peer.destroyed) {
                    peer.reconnect();
                }
            });
        }
         // Cleanup on component unmount
        return () => {
            peerRef.current?.destroy();
        };
    }, [username]);

    const handleLogin = () => {
        if (usernameInput.trim()) {
            localStorage.setItem('discordCloneUser', usernameInput.trim());
            setUsername(usernameInput.trim());
        }
    };

    const getMediaStream = useCallback(async (video: boolean, screen: boolean): Promise<MediaStream | null> => {
        try {
            if (screen) {
                return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            }
            return await navigator.mediaDevices.getUserMedia({ audio: true, video });
        } catch (error) {
            console.error('Failed to get user media', error);
            return null;
        }
    }, []);

    const replaceStreamTrack = (newStream: MediaStream | null, kind: 'video' | 'audio') => {
        if (!mediaConnectionRef.current || !newStream) return;
        const sender = mediaConnectionRef.current.peerConnection.getSenders().find(s => s.track?.kind === kind);
        const newTrack = kind === 'video' ? newStream.getVideoTracks()[0] : newStream.getAudioTracks()[0];
        if (sender && newTrack) {
            sender.replaceTrack(newTrack);
        }
    }

    const handleCall = async () => {
        if (!remotePeerId.trim() || !peerRef.current) {
            alert("Please enter a friend's ID to call.");
            return;
        }
        setIsCalling(true);
        const stream = await getMediaStream(true, false);
        if (stream) {
            setUserStream(stream);
            const call = peerRef.current.call(remotePeerId, stream);
            mediaConnectionRef.current = call;
            call.on('stream', (rStream) => {
                setRemoteStream(rStream);
                setInCall(true);
            });
             call.on('close', handleEndCall);
        }
        setIsCalling(false);
    };

    const handleEndCall = useCallback(() => {
        mediaConnectionRef.current?.close();
        userStream?.getTracks().forEach(track => track.stop());
        setInCall(false);
        setUserStream(null);
        setRemoteStream(null);
        setIsScreenSharing(false);
        setIsCameraOn(true);
    }, [userStream]);

    const toggleMic = () => {
        if (userStream) {
            userStream.getAudioTracks().forEach(track => track.enabled = !isMicOn);
            setIsMicOn(!isMicOn);
        }
    };

    const toggleCamera = async () => {
        if (isScreenSharing) {
             // If screen sharing, stop it and revert to camera
            await toggleScreenShare();
            return;
        }
        if (userStream) {
            userStream.getVideoTracks().forEach(track => track.enabled = !isCameraOn);
            setIsCameraOn(!isCameraOn);
        }
    };

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            const screenStream = await getMediaStream(false, true);
            if (screenStream) {
                // When user stops sharing via browser UI
                screenStream.getVideoTracks()[0].onended = () => {
                    toggleScreenShare(); // Revert back to camera
                };
                
                // Replace video track
                userStream?.getVideoTracks().forEach(track => track.stop());
                const newStream = new MediaStream([...userStream?.getAudioTracks() || [], ...screenStream.getVideoTracks()]);
                replaceStreamTrack(screenStream, 'video');
                setUserStream(newStream);
                setIsScreenSharing(true);
                setIsCameraOn(true); // Visually, the "camera" is on (it's the screen)
            }
        } else {
            const cameraStream = await getMediaStream(true, false);
            if (cameraStream) {
                 userStream?.getTracks().forEach(track => track.stop());
                 replaceStreamTrack(cameraStream, 'video');
                 setUserStream(cameraStream);
                 setIsScreenSharing(false);
                 setIsCameraOn(true);
            }
        }
    };


    if (!username) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#36393f] p-4 text-center text-gray-200">
                <h1 className="text-4xl font-bold text-purple-400 mb-2">Добро пожаловать</h1>
                <p className="text-gray-400 mb-6">Введите ваше имя пользователя, чтобы продолжить.</p>
                <div className="flex flex-col items-center w-full max-w-sm">
                    <input
                        type="text"
                        placeholder="Ваше имя"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        className="w-full px-4 py-2 mb-4 bg-[#202225] border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                        onClick={handleLogin}
                        disabled={!usernameInput.trim()}
                        className="w-full px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        Войти
                    </button>
                </div>
            </div>
        );
    }
    
    // Main App Layout
    return (
        <div className="flex h-screen w-screen text-gray-300 font-sans">
            {/* Server List */}
            <div className="w-16 bg-[#202225] p-2 flex flex-col items-center space-y-2">
                 <div className="server-icon bg-purple-600">D</div>
                 <div className="server-icon">S1</div>
                 <div className="server-icon">S2</div>
                 <div className="server-icon text-green-400 text-2xl">+</div>
            </div>

            {/* Channel List & User Panel */}
            <div className="w-60 bg-[#2f3136] flex flex-col">
                <div className="p-3 shadow-md">
                    <h2 className="font-bold text-white text-lg">My Server</h2>
                </div>
                <div className="flex-grow p-2 overflow-y-auto channel-list">
                    <div className="channel-category">TEXT CHANNELS</div>
                    <div className="channel active"># general</div>
                    <div className="channel"># announcements</div>
                    <div className="channel-category mt-4">VOICE CHANNELS</div>
                    <button className="channel w-full text-left" onClick={() => !inCall && setInCall(true)}>General</button>
                </div>
                <div className="p-2 bg-[#292b2f] flex items-center">
                     <div className="relative">
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-xl font-bold">{username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="absolute bottom-0 right-2 w-4 h-4 bg-green-500 border-2 border-[#292b2f] rounded-full"></div>
                    </div>
                    <div>
                         <p className="font-semibold text-sm text-white">{username}</p>
                         <p className="text-xs text-gray-400 font-mono select-all" title={peerId}>{peerId.substring(0, 15)}...</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow bg-[#36393f] flex flex-col">
                {!inCall ? (
                    <div className="p-4">
                        <h1 className="text-2xl text-white font-bold mb-4">Welcome to #general!</h1>
                         <p className="text-gray-400 mb-6">Это начало. Вы можете позвонить другу, введя его ID и нажав "Позвонить".</p>
                         <div className="flex items-center space-x-2 max-w-md">
                            <input
                                type="text"
                                placeholder="Введите ID друга для звонка"
                                value={remotePeerId}
                                onChange={(e) => setRemotePeerId(e.target.value)}
                                className="w-full px-4 py-2 bg-[#202225] border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                             <button
                                onClick={handleCall}
                                disabled={isCalling || !remotePeerId.trim()}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg disabled:bg-gray-600"
                            >
                                {isCalling ? 'Звонок...' : 'Позвонить'}
                            </button>
                         </div>
                    </div>
                ) : (
                   <main className="flex-grow flex flex-col bg-inherit overflow-hidden">
                       <div className="flex-grow p-2 min-h-0">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-full">
                               <VideoPlayer stream={userStream} isLocalPlayer={true} name={username} />
                               <VideoPlayer stream={remoteStream} name="friend" />
                           </div>
                       </div>
                       <BottomBar
                           isMicOn={isMicOn}
                           isCameraOn={isCameraOn}
                           isScreenSharing={isScreenSharing}
                           onToggleMic={toggleMic}
                           onToggleCamera={toggleCamera}
                           onToggleScreenShare={toggleScreenShare}
                           onEndCall={handleEndCall}
                       />
                   </main>
                )}
            </div>
        </div>
    );
};

export default App;