import React, { useState, useRef, useEffect } from 'react';
import { Message, UserProfile } from '../types';
import { geminiService } from '../services/geminiService';
import GifStickerPicker from './GifStickerPicker';

interface ChatViewProps {
    channelId: string;
    channelName: string;
    channelAvatar: string | null;
    messages: Message[];
    currentUser: UserProfile;
    onSendMessage: (channelId: string, message: Message) => void;
    addMessage: (channelId: string, message: Message) => void;
    removeMessage: (channelId: string, messageId: string) => void;
    onStartCall: (type: 'voice' | 'video') => void;
    isDM: boolean;
    isAI: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({ channelId, channelName, channelAvatar, messages, currentUser, onSendMessage, addMessage, removeMessage, onStartCall, isDM, isAI }) => {
    const [input, setInput] = useState('');
    const [isAiResponding, setIsAiResponding] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [pickerRef]);


    const handleFileAttachment = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const fileContent = loadEvent.target?.result as string;
            const messageType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'text';

            if (messageType === 'image' || messageType === 'video') {
                const fileMessage: Message = {
                    id: Date.now().toString(),
                    author: 'user',
                    content: fileContent,
                    type: messageType,
                    timestamp: new Date().toISOString(),
                };
                onSendMessage(channelId, fileMessage);
            }
        };
        reader.readAsDataURL(file);
        
        // Reset file input
        event.target.value = '';
    };

     const handleSelectGif = (url: string) => {
        const gifMessage: Message = {
            id: Date.now().toString(),
            author: 'user',
            content: url,
            type: 'image',
            timestamp: new Date().toISOString(),
        };
        onSendMessage(channelId, gifMessage);
        setIsPickerOpen(false);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            author: 'user',
            content: input,
            type: 'text',
            timestamp: new Date().toISOString(),
        };

        onSendMessage(channelId, userMessage);
        const currentInput = input;
        setInput('');

        if (channelId === 'ai') {
            const loadingMessageId = (Date.now() + 1).toString();
            setIsAiResponding(true);
            try {
                if (currentInput.toLowerCase().startsWith('/image ')) {
                    const prompt = currentInput.substring(7);
                    addMessage(channelId, { id: loadingMessageId, author: 'ai', content: 'Генерирую изображение...', type: 'loading', timestamp: new Date().toISOString() });
                    const imageUrl = await geminiService.generateImage(prompt);
                    addMessage(channelId, { id: Date.now().toString(), author: 'ai', content: imageUrl, type: 'image', timestamp: new Date().toISOString() });
                } else if (currentInput.toLowerCase().startsWith('/video ')) {
                    const prompt = currentInput.substring(7);
                    addMessage(channelId, { id: loadingMessageId, author: 'ai', content: 'Генерирую видео (это может занять несколько минут)...', type: 'loading', timestamp: new Date().toISOString() });
                    const videoUrl = await geminiService.generateVideo(prompt);
                    addMessage(channelId, { id: Date.now().toString(), author: 'ai', content: videoUrl, type: 'video', timestamp: new Date().toISOString() });
                } else {
                    addMessage(channelId, { id: loadingMessageId, author: 'ai', content: 'Думаю...', type: 'loading', timestamp: new Date().toISOString() });
                    const aiResponseText = await geminiService.generateText(currentInput);
                    addMessage(channelId, { id: Date.now().toString(), author: 'ai', content: aiResponseText, type: 'text', timestamp: new Date().toISOString() });
                }
            } catch (error: any) {
                console.error("AI Error:", error);
                addMessage(channelId, { id: Date.now().toString(), author: 'ai', content: `Ошибка: ${error.message}`, type: 'error', timestamp: new Date().toISOString() });
            } finally {
                removeMessage(channelId, loadingMessageId);
                setIsAiResponding(false);
            }
        }
    };
    
    const renderMessageContent = (message: Message) => {
        switch (message.type) {
            case 'image':
                return <img src={message.content} alt="Generated content" className="chat-message-image cursor-pointer" onClick={() => window.open(message.content, '_blank')} />;
            case 'video':
                return <video src={message.content} controls className="chat-message-video" />;
            case 'loading':
                return <div className="flex items-center space-x-2 text-gray-400"><div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div><span>{message.content}</span></div>;
            case 'error':
                 return <p className="text-red-400">{message.content}</p>;
            case 'text':
            default:
                return <p className="chat-message-content whitespace-pre-wrap">{message.content}</p>;
        }
    }

    return (
        <div className="flex flex-col h-full">
            <header className="p-3 shadow-md h-12 flex items-center justify-between border-b border-black/20 shrink-0">
                <div className="flex items-center">
                    <span className="text-gray-500 text-2xl mr-2">@</span>
                    <h2 className="font-bold text-white text-lg">{channelName}</h2>
                </div>
                 {(isDM || isAI) && (
                    <div className="flex items-center space-x-4">
                        <button onClick={() => onStartCall('voice')} title="Начать голосовой звонок" className="text-gray-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.95 21q-3.125 0-6.2-.725-3.075-.725-5.55-2.225-2.475-1.5-4-3.25T1.7 9.55Q1 7.075.275 3.975.275.875 3 1q.925.075 2.95.8t3.8 1.85q.55.35.825.937.275.588.125 1.213L9.5 8.15q-.1.55-.55 1t-.9.5q-.45.05-1.025-.087-.575-.138-1.225-.388-.125-.05-.2-.025-.075.025-.1.125-.35.6-.488 1.1-.137.5-.137 1 0 .65.238 1.387.237.738.637 1.488.4.75.95 1.587.55.838 1.25 1.638.7.8 1.625 1.5t1.925 1.15q.9.45 1.8.712.9.263 1.7.263.45 0 .85-.112.4-.113.75-.438.125-.1.2-.125t.2.025q.35.05.738.012.387-.037.787-.062.5-.05 1 .3t.6 1.05l2.25 1.25q.4.25.813.25.412 0 .737-.25.5-.35.675-.987.175-.638-.025-1.262l-1.05-1.7-1.1-1.8q-.25-.45-.038-.913.213-.462.638-.687Z"/></svg>
                        </button>
                        {isDM && (
                             <button onClick={() => onStartCall('video')} title="Начать видеозвонок" className="text-gray-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18 14.5V9q0-1.25-.875-2.125T15 6H4q-1.25 0-2.125.875T1 9v10q0 1.25.875 2.125T4 22h11q1.25 0 2.125-.875T18 19v-4.5l4 4V5l-4 4Z"/></svg>
                            </button>
                        )}
                    </div>
                )}
            </header>
            <main className="flex-grow p-4 overflow-y-auto">
                {messages.map((message) => (
                    <div key={message.id} className="flex items-start p-2 hover:bg-black/10 rounded chat-message-group">
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                            <span className="text-lg font-bold text-white">{
                                message.author === 'user' ? currentUser.username.charAt(0).toUpperCase() : channelName.charAt(0).toUpperCase()
                            }</span>
                        </div>
                        <div className="flex-grow">
                            <div className="flex items-baseline space-x-2">
                                <span className="font-semibold text-white">
                                     {message.author === 'user' ? currentUser.displayName : channelName}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                           {renderMessageContent(message)}
                        </div>
                    </div>
                ))}
                 <div ref={endOfMessagesRef} />
            </main>
            <footer className="px-4 pb-4">
                <div className="bg-[#40444b] rounded-lg flex items-center p-1 relative" ref={pickerRef}>
                    {isPickerOpen && <GifStickerPicker onSelectGif={handleSelectGif} />}
                    <button type="button" onClick={handleFileAttachment} disabled={isAiResponding} className="p-2 rounded-full chat-input-button disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7v-2h4V7h2v4h4v2h-4v4h-2z"/></svg>
                    </button>
                    <form onSubmit={handleSendMessage} className="flex-grow flex items-center">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,video/mp4,video/webm"
                        />
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Сообщение для @${channelName}`}
                            disabled={isAiResponding}
                            className="w-full bg-transparent outline-none px-2 text-gray-200 disabled:opacity-50"
                        />
                         <button type="button" onClick={() => setIsPickerOpen(prev => !prev)} disabled={isAiResponding} className="p-2 rounded-full chat-input-button disabled:opacity-50 disabled:cursor-not-allowed">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-4.5h5v-2h-5v2zm.6-3.5h3.8l-1.9-3.15-1.9 3.15z"/></svg>
                        </button>
                        <button type="submit" disabled={isAiResponding || !input.trim()} className="text-purple-400 p-2 disabled:text-gray-500 disabled:cursor-not-allowed">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </form>
                </div>
            </footer>
        </div>
    );
};

export default ChatView;