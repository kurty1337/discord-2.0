import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Peer, MediaConnection, DataConnection } from 'peerjs';
import VideoPlayer from './components/VideoPlayer';
import ChatView from './components/ChatView';
import { UserProfile, Server, Channel, DirectMessageChannel, Message } from './types';
import BottomBar from './components/BottomBar';
import UserProfileModal from './components/UserProfileModal';
import CreateServerModal from './components/CreateServerModal';
import CreateChannelModal from './components/CreateChannelModal';
import ServerIcon from './components/ServerIcon';
import { audioService } from './services/audioService';
import { GeminiLiveService } from './services/geminiLiveService';
import { geminiService } from './services/geminiService';


declare global {
    interface Window {
        Peer: any;
    }
}

// Mock data for initial experience
const MOCK_AI_ASSISTANT: DirectMessageChannel = {
    id: 'ai',
    name: 'AI Assistant',
    avatarUrl: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_180424.gif'
};
const MOCK_FRIEND: DirectMessageChannel = {
    id: 'dc-clone-friend-123', // Example static Peer ID
    name: 'Sarah',
    avatarUrl: null,
};


const App: React.FC = () => {
    // Environment check
    if (window.location.protocol === 'file:') {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#36393f] p-8 text-center text-gray-200">
                <h1 className="text-4xl font-bold text-red-500 mb-4">Ошибка Запуска</h1>
                <p className="text-lg mb-2">Это приложение не может быть запущено напрямую из файловой системы.</p>
                <p className="text-gray-400 max-w-2xl">
                    Для корректной работы функций, таких как видеозвонки и обмен данными, браузер требует, чтобы страница была загружена с веб-сервера. 
                    Пожалуйста, запустите это приложение с помощью локального сервера, чтобы оно было доступно по адресу <code className="bg-gray-800 p-1 rounded font-mono">http://localhost:PORT</code>.
                </p>
            </div>
        );
    }
    
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [usernameInput, setUsernameInput] = useState<string>('');
    
    const [servers, setServers] = useState<Server[]>([]);
    const [activeServerId, setActiveServerId] = useState<string | null>(null);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    
    const [directMessageChannels] = useState<DirectMessageChannel[]>([MOCK_AI_ASSISTANT, MOCK_FRIEND]);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isCreateServerModalOpen, setIsCreateServerModalOpen] = useState(false);
    const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
    const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');

    const [callState, setCallState] = useState<{ type: 'none' | 'p2p' | 'ai', targetId: string | null }>({ type: 'none', targetId: null });
    const [peerId, setPeerId] = useState<string>('');
    
    const [messages, setMessages] = useState<Record<string, Message[]>>({
      [MOCK_AI_ASSISTANT.id]: [{
          id: '1',
          author: 'ai',
          content: "Привет! Я ваш ИИ-помощник Gemini. Вы можете задать мне вопрос, поговорить со мной голосом (нажмите 📞), или попросить создать изображение с помощью команды `/image <описание>` или видео с помощью `/video <описание>`.",
          type: 'text',
          timestamp: new Date().toISOString(),
      }],
      [MOCK_FRIEND.id]: [],
    });

    const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
    const [isDeafened, setIsDeafened] = useState<boolean>(false);
    const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
    const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    
    const [userStream, setUserStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const peerRef = useRef<Peer | null>(null);
    const mediaConnectionRef = useRef<MediaConnection | null>(null);
    const dataConnectionsRef = useRef<Record<string, DataConnection>>({});
    const aiLiveServiceRef = useRef<GeminiLiveService | null>(null);
    
    useEffect(() => {
        const savedUser = localStorage.getItem('discordCloneUser');
        if (savedUser) setUserProfile(JSON.parse(savedUser));
        
        const savedServers = localStorage.getItem('discordCloneServers');
        if (savedServers) {
            const parsedServers = JSON.parse(savedServers);
            setServers(parsedServers);
            if(parsedServers.length > 0) setActiveServerId(parsedServers[0].id);
        } else {
            const defaultServer: Server = {
                id: '1', name: "Мой первый сервер", imageUrl: null,
                channels: [ { id: 'c1', name: 'general', type: 'text' }, { id: 'c2', name: 'General', type: 'voice' } ]
            };
            setServers([defaultServer]);
            setActiveServerId('1');
        }
    }, []);
    
    useEffect(() => {
        if (servers.length > 0) localStorage.setItem('discordCloneServers', JSON.stringify(servers));
    }, [servers]);

    useEffect(() => {
        if (userProfile?.username && !peerRef.current) initializePeer(userProfile.username);
        return () => { peerRef.current?.destroy(); };
    }, [userProfile]);

    const handleSetActiveServer = (serverId: string) => {
        if (serverId !== activeServerId) {
            audioService.playSound('switch');
            setActiveServerId(serverId);
            setActiveChannelId(null); // Deselect channel when switching servers
        }
    };
    
    const handleSetActiveChannel = (channelId: string) => {
        if (channelId !== activeChannelId) {
            audioService.playSound('switch');
            setActiveChannelId(channelId);
        }
    }

    const initializePeer = (username: string) => {
        if (peerRef.current) peerRef.current.destroy();

        const sanitizedId = `dc-clone-${username.replace(/[^a-zA-Z0-9-]/g, '') || Date.now()}`;
        const peer = new window.Peer(sanitizedId);
        peerRef.current = peer;
        
        peer.on('open', (id) => setPeerId(id));

        peer.on('call', async (call) => {
            const stream = await getMediaStream({ video: true, audio: true });
            if (!stream) return;
            setUserStream(stream);
            call.answer(stream);
            mediaConnectionRef.current = call;
            call.on('stream', (rStream) => setRemoteStream(rStream));
            call.on('close', handleEndCall);
            setCallState({ type: 'p2p', targetId: call.peer });
        });

        peer.on('connection', (conn) => {
            dataConnectionsRef.current[conn.peer] = conn;
            conn.on('data', (data: any) => {
                if(data.type === 'message') addMessage(conn.peer, data.message);
            });
        });

        peer.on('error', (err: any) => console.error("PeerJS Error:", err));
    };

    const handleLogin = () => {
        if (usernameInput.trim()) {
            const newUserProfile: UserProfile = { 
                username: usernameInput.trim(), displayName: usernameInput.trim(), avatarUrl: null 
            };
            localStorage.setItem('discordCloneUser', JSON.stringify(newUserProfile));
            setUserProfile(newUserProfile);
        }
    };
    
    const handleUpdateProfile = (newProfile: UserProfile) => {
        localStorage.setItem('discordCloneUser', JSON.stringify(newProfile));
        setUserProfile(newProfile);
        setIsProfileModalOpen(false);
    };
    
    const handleCreateServer = (name: string, imageUrl: string | null) => {
        const newServer: Server = {
            id: Date.now().toString(), name, imageUrl,
            channels: [ { id: `${Date.now()}-c1`, name: 'general', type: 'text' }, { id: `${Date.now()}-c2`, name: 'General', type: 'voice' } ]
        };
        setServers(prev => [...prev, newServer]);
        setActiveServerId(newServer.id);
        setIsCreateServerModalOpen(false);
    };
    
    const handleCreateChannel = (name: string, type: 'text' | 'voice') => {
        const newChannel: Channel = { id: Date.now().toString(), name: name.toLowerCase().replace(/\s/g, '-'), type };
        setServers(servers.map(server => server.id === activeServerId ? { ...server, channels: [...server.channels, newChannel] } : server));
        setIsCreateChannelModalOpen(false);
    };
    
    const openCreateChannelModal = (type: 'text' | 'voice') => {
        setNewChannelType(type);
        setIsCreateChannelModalOpen(true);
    };

    const getMediaStream = useCallback(async (constraints: MediaStreamConstraints): Promise<MediaStream | null> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            stream.getAudioTracks().forEach(t => t.enabled = !isMicMuted);
            return stream;
        } catch (error: any) {
            console.error('Failed to get user media', error);
            if(error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                alert('Не удалось получить доступ к медиа-устройствам. Проверьте разрешения для браузера в настройках вашей системы.');
            }
            return null;
        }
    }, [isMicMuted]);

    const startP2PCall = async (targetId: string, type: 'video' | 'voice') => {
        audioService.playSound('switch');
        if (!peerRef.current || !targetId) return;

        const stream = await getMediaStream({ video: type === 'video', audio: true });
        if (stream) {
            setUserStream(stream);
            setIsCameraOn(type === 'video');
            const call = peerRef.current.call(targetId, stream);
            mediaConnectionRef.current = call;
            call.on('stream', (rStream) => setRemoteStream(rStream));
            call.on('close', handleEndCall);
            setCallState({ type: 'p2p', targetId });
        }
    };
    
    const startAICall = async () => {
        audioService.playSound('switch');
        const stream = await getMediaStream({ audio: true, video: false });
        if (!stream) return;

        setUserStream(stream);
        setCallState({ type: 'ai', targetId: 'ai' });

        aiLiveServiceRef.current = new GeminiLiveService();
        aiLiveServiceRef.current.connect({
            stream: stream,
            onAudio: () => setIsAiSpeaking(true),
            onAudioEnd: () => setIsAiSpeaking(false),
            onFunctionCall: async (name, args) => {
                if (name === 'generateVideo') {
                    handleEndCall(); // End call to show chat
                    const prompt = args.prompt || "случайное видео";
                    const loadingId = Date.now().toString();
                    addMessage('ai', { id: loadingId, author: 'ai', content: `Генерирую видео по вашему запросу: "${prompt}"...`, type: 'loading', timestamp: new Date().toISOString() });
                    try {
                        const videoUrl = await geminiService.generateVideo(prompt);
                         addMessage('ai', { id: Date.now().toString(), author: 'ai', content: videoUrl, type: 'video', timestamp: new Date().toISOString() });
                    } catch (e: any) {
                         addMessage('ai', { id: Date.now().toString(), author: 'ai', content: `Ошибка генерации видео: ${e.message}`, type: 'error', timestamp: new Date().toISOString() });
                    } finally {
                        removeMessage('ai', loadingId);
                    }
                }
            },
            onError: (e) => {
                console.error("AI Call Error:", e);
                handleEndCall();
            },
            onClose: () => {
                console.log("AI Call Closed.");
                handleEndCall();
            }
        });
    }

    const handleStartCall = (type: 'voice' | 'video') => {
        if (!activeChannelId) return;
        if (activeChannelId === 'ai') {
            startAICall();
        } else {
            startP2PCall(activeChannelId, type);
        }
    };

    const handleEndCall = useCallback(() => {
        if (callState.type === 'p2p') {
            mediaConnectionRef.current?.close();
        } else if (callState.type === 'ai') {
            aiLiveServiceRef.current?.close();
            aiLiveServiceRef.current = null;
        }
        userStream?.getTracks().forEach(track => track.stop());
        setCallState({ type: 'none', targetId: null });
        setUserStream(null);
        setRemoteStream(null);
        setIsScreenSharing(false);
        setIsCameraOn(true);
        setIsAiSpeaking(false);
    }, [userStream, callState.type]);

    const toggleMicMute = () => {
        const newMutedState = !isMicMuted;
        setIsMicMuted(newMutedState);
        userStream?.getAudioTracks().forEach(track => track.enabled = !newMutedState);
        if(newMutedState && isDeafened) setIsDeafened(false); // Un-deafen if muting
    };

    const toggleDeafen = () => {
        const newDeafenedState = !isDeafened;
        setIsDeafened(newDeafenedState);
        setIsMicMuted(newDeafenedState);
        userStream?.getAudioTracks().forEach(track => track.enabled = !newDeafenedState);
    };

    const toggleCamera = () => {
        if (isScreenSharing) return;
        const newState = !isCameraOn;
        setIsCameraOn(newState);
        userStream?.getVideoTracks().forEach(t => t.enabled = newState);
    };

    const toggleScreenShare = async () => {
        if (callState.type !== 'p2p' || !mediaConnectionRef.current) return;

        if (isScreenSharing) {
            const stream = await getMediaStream({ video: true, audio: true });
            if (stream && mediaConnectionRef.current) {
                const videoTrack = stream.getVideoTracks()[0];
                const sender = mediaConnectionRef.current.peerConnection.getSenders().find(s => s.track?.kind === 'video');
                sender?.replaceTrack(videoTrack);
                userStream?.getTracks().forEach(t => t.stop());
                setUserStream(stream);
                setIsScreenSharing(false);
                setIsCameraOn(true);
            }
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                const videoTrack = stream.getVideoTracks()[0];
                const sender = mediaConnectionRef.current.peerConnection.getSenders().find(s => s.track?.kind === 'video');
                sender?.replaceTrack(videoTrack);
                userStream?.getTracks().forEach(t => t.stop());
                setUserStream(stream);
                setIsScreenSharing(true);
                setIsCameraOn(false);
                // When screen sharing ends from browser UI
                videoTrack.onended = () => toggleScreenShare();
            } catch (err) {
                console.error("Error starting screen share:", err);
            }
        }
    };


    const addMessage = (channelId: string, message: Message) => {
        setMessages(prev => ({...prev, [channelId]: [...(prev[channelId] || []), message]}));
    };

    const removeMessage = (channelId: string, messageId: string) => {
        setMessages(prev => ({
            ...prev,
            [channelId]: (prev[channelId] || []).filter(m => m.id !== messageId),
        }));
    };

    const sendMessage = (channelId: string, message: Message) => {
        addMessage(channelId, message);
        if(channelId !== 'ai' && peerRef.current) {
            let conn = dataConnectionsRef.current[channelId];
            if (!conn) {
                conn = peerRef.current.connect(channelId);
                dataConnectionsRef.current[channelId] = conn;
                conn.on('open', () => conn.send({ type: 'message', message }));
            } else if (conn.open) {
                 conn.send({ type: 'message', message });
            }
        }
    };


    if (!userProfile) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#36393f] p-4 text-center text-gray-200">
                <h1 className="text-4xl font-bold text-purple-400 mb-2">Добро пожаловать</h1>
                <p className="text-gray-400 mb-6">Введите ваше имя пользователя, чтобы продолжить.</p>
                <div className="flex flex-col items-center w-full max-w-sm">
                    <input type="text" placeholder="Ваше имя" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full px-4 py-2 mb-4 bg-[#202225] border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                    <button onClick={handleLogin} disabled={!usernameInput.trim()} className="w-full px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100">Войти</button>
                </div>
            </div>
        );
    }
    
    const activeServer = servers.find(s => s.id === activeServerId);
    const activeDM = directMessageChannels.find(dm => dm.id === activeChannelId);
    const activeServerChannel = activeServer?.channels.find(c => c.id === activeChannelId);
    
    const getChannelName = () => {
        if(activeDM) return activeDM.name;
        if(activeServerChannel) return activeServerChannel.name;
        return "Выберите канал";
    }

    const renderCallView = () => {
        if (callState.type === 'p2p') {
            return (
                <main className="flex-grow flex flex-col bg-inherit overflow-hidden">
                    <div className="flex-grow p-2 min-h-0"><div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-full">
                        <VideoPlayer stream={userStream} isLocalPlayer={true} name={userProfile.username} avatarUrl={userProfile.avatarUrl} />
                        <VideoPlayer stream={remoteStream} name="friend" />
                    </div></div>
                    <BottomBar isMicOn={!isMicMuted} isCameraOn={isCameraOn} isScreenSharing={isScreenSharing} onToggleMic={toggleMicMute} onToggleCamera={toggleCamera} onToggleScreenShare={toggleScreenShare} onEndCall={handleEndCall}/>
                </main>
            );
        }
        if (callState.type === 'ai') {
             return (
                <main className="flex-grow flex flex-col bg-inherit overflow-hidden">
                    <div className="flex-grow p-2 min-h-0"><div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-full">
                        <VideoPlayer stream={userStream} isLocalPlayer={true} name={userProfile.username} avatarUrl={userProfile.avatarUrl} />
                        <VideoPlayer name="ai" isAiSpeaking={isAiSpeaking} avatarUrl={MOCK_AI_ASSISTANT.avatarUrl}/>
                    </div></div>
                    <BottomBar isMicOn={!isMicMuted} isCameraOn={false} isScreenSharing={false} onToggleMic={toggleMicMute} onToggleCamera={() => {}} onToggleScreenShare={() => {}} onEndCall={handleEndCall}/>
                </main>
            );
        }
        return null;
    }

    return (
        <div className="flex h-screen w-screen text-gray-300 font-sans">
            {isProfileModalOpen && <UserProfileModal user={userProfile} onSave={handleUpdateProfile} onClose={() => setIsProfileModalOpen(false)} />}
            {isCreateServerModalOpen && <CreateServerModal onCreate={handleCreateServer} onClose={() => setIsCreateServerModalOpen(false)} />}
            {isCreateChannelModalOpen && <CreateChannelModal type={newChannelType} onCreate={handleCreateChannel} onClose={() => setIsCreateChannelModalOpen(false)} />}
            
            <div className="w-20 bg-[#202225] p-2 flex flex-col items-center space-y-2 shrink-0">
                 {servers.map(server => <ServerIcon key={server.id} server={server} isActive={server.id === activeServerId} onClick={() => handleSetActiveServer(server.id)} />)}
                 <div className="w-full border-t border-gray-600/50 my-1"></div>
                 <button onClick={() => setIsCreateServerModalOpen(true)} className="server-icon bg-[#36393f] hover:bg-green-600 text-green-400 hover:text-white text-2xl" title="Создать сервер">+</button>
            </div>

            <div className="w-60 bg-[#2f3136] flex flex-col shrink-0">
                <div className="p-3 shadow-md h-12 flex items-center border-b border-black/20">
                    <h2 className="font-bold text-white text-lg truncate">{activeServer?.name ?? 'Личные сообщения'}</h2>
                </div>
                <div className="flex-grow p-2 overflow-y-auto channel-list">
                    <div className="channel-category"><span>Личные сообщения</span></div>
                    {directMessageChannels.map(dm => (
                         <div key={dm.id} className={`channel ${activeChannelId === dm.id ? 'active' : ''}`} onClick={() => handleSetActiveChannel(dm.id)}>
                             {dm.avatarUrl ? <img src={dm.avatarUrl} className="w-8 h-8 rounded-full mr-2"/> : <div className="w-8 h-8 bg-purple-800 rounded-full mr-2 flex items-center justify-center text-sm">{dm.name.charAt(0)}</div>}
                             {dm.name}
                        </div>
                    ))}
                    <div className="channel-category mt-4"><span>Текстовые каналы</span><button onClick={() => openCreateChannelModal('text')} className="add-channel-btn" title="Create Channel">+</button></div>
                    {activeServer?.channels.filter(c => c.type === 'text').map(channel => <div key={channel.id} className={`channel ${activeChannelId === channel.id ? 'active' : ''}`} onClick={() => handleSetActiveChannel(channel.id)}># {channel.name}</div>)}
                    
                    <div className="channel-category mt-4"><span>Голосовые каналы</span><button onClick={() => openCreateChannelModal('voice')} className="add-channel-btn" title="Create Channel">+</button></div>
                    {activeServer?.channels.filter(c => c.type === 'voice').map(channel => <button key={channel.id} className="channel voice w-full text-left" onClick={() => startP2PCall(MOCK_FRIEND.id, 'voice')}>🔊 {channel.name}</button>)}
                </div>

                <div className="p-2 bg-[#292b2f] flex items-center justify-between">
                     <div className="flex items-center" title="Изменить профиль" onClick={() => setIsProfileModalOpen(true)}>
                        <div className="relative cursor-pointer">
                           {userProfile.avatarUrl ? <img src={userProfile.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center"><span className="text-xl font-bold">{userProfile.username.charAt(0).toUpperCase()}</span></div>}
                           <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-[#292b2f] rounded-full"></div>
                       </div>
                       <div className="ml-2 text-left cursor-pointer">
                            <p className="font-semibold text-sm text-white truncate w-20">{userProfile.displayName || userProfile.username}</p>
                            <p className="text-xs text-gray-400 truncate w-20">{userProfile.username}</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-300">
                        <button onClick={toggleMicMute} title={isMicMuted ? "Включить микрофон" : "Выключить микрофон"} className="p-2 hover:bg-gray-700/50 rounded-full relative">{isMicMuted ? <MicOffIcon /> : <MicOnIcon />}</button>
                        <button onClick={toggleDeafen} title={isDeafened ? "Включить звук" : "Выключить звук"} className="p-2 hover:bg-gray-700/50 rounded-full relative">{isDeafened ? <DeafenedIcon /> : <HeadphonesIcon />}</button>
                        <button onClick={() => setIsProfileModalOpen(true)} title="Настройки" className="p-2 hover:bg-gray-700/50 rounded-full"><SettingsIcon /></button>
                    </div>
                </div>
            </div>

            <div className="flex-grow bg-[#36393f] flex flex-col">
                {callState.type !== 'none' ? (
                   renderCallView()
                ) : activeChannelId ? (
                    <ChatView
                        key={activeChannelId}
                        channelId={activeChannelId}
                        channelName={getChannelName()}
                        channelAvatar={activeDM?.avatarUrl}
                        messages={messages[activeChannelId] || []}
                        currentUser={userProfile}
                        onSendMessage={sendMessage}
                        addMessage={addMessage}
                        removeMessage={removeMessage}
                        onStartCall={handleStartCall}
                        isDM={activeChannelId === MOCK_FRIEND.id}
                        isAI={activeChannelId === MOCK_AI_ASSISTANT.id}
                    />
                ) : (
                    <div className="p-8">
                        <h1 className="text-2xl text-white font-bold mb-4">Добро пожаловать!</h1>
                        <p className="text-gray-400">Выберите канал или личное сообщение, чтобы начать общение.</p>
                        <p className="text-gray-500 mt-4 text-sm">Ваш Peer ID для звонков: <span className="font-mono bg-gray-800 p-1 rounded">{peerId}</span></p>
                    </div>
                )}
            </div>
        </div>
    );
};

const MicOnIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325T4 11H6q0 2.075 1.463 3.537T11 16v-1h2v1q2.075 0 3.538-1.463T18 11h2q0 2.925-1.7 4.9T13 17.925V21h-2Z"/></svg>;
const MicOffIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" ><path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M3 3l18 18"></path><path d="M9 5a3 3 0 016 0v5a3 3 0 01-6 0V5z"></path><path d="M5 10a7 7 0 0011.83 5M9 19v3m6-3v3"></path></svg>;
const HeadphonesIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 14v-4q0-.825.588-1.413T5 8h1v8H5q-.825 0-1.413-.588T3 14Zm18 0q0 .825-.588 1.413T19 16h-1V8h1q.825 0 1.413.588T21 10v4ZM7 18q-1.25 0-2.125-.875T4 15V9q0-1.25.875-2.125T7 6h3v12H7Zm7 0V6h3q1.25 0 2.125.875T20 9v6q0 1.25-.875 2.125T17 18h-3Z"/></svg>;
const DeafenedIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M3 3l18 18"></path><path fill="currentColor" d="M3 14v-4q0-.825.588-1.413T5 8h1v8H5q-.825 0-1.413-.588T3 14Zm14-6v12h3q1.25 0 2.125-.875T20 9v6q0 1.25-.875 2.125T17 18h-3Z M7 18q-1.25 0-2.125-.875T4 15V9q0-1.25.875-2.125T7 6h3v12H7Z"/></svg>;
const SettingsIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59,0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>;

export default App;