
import React from 'react';

interface VideoPlayerProps {
  stream?: MediaStream;
  isMuted?: boolean;
  name: string;
  isLocalPlayer?: boolean;
  onToggleMute?: () => void;
}


const UserAvatar: React.FC<{ name: string }> = ({ name }) => (
    <div className="w-full h-full flex items-center justify-center bg-gray-700">
        <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-4xl font-bold text-white">{name.charAt(0).toUpperCase()}</span>
        </div>
    </div>
);

const AIAvatar: React.FC = () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <div className="w-28 h-28 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8" />
                <rect x="4" y="12" width="16" height="8" rx="2" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="M12 12v-2" />
                <path d="M12 18v-2" />
                <path d="M9 16h6" />
            </svg>
        </div>
    </div>
);


const VideoPlayer: React.FC<VideoPlayerProps> = ({ stream, isMuted = false, name, isLocalPlayer = false, onToggleMute }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const hasVideoTrack = stream?.getVideoTracks().length > 0 && stream.getVideoTracks().some(t => t.enabled);

  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const remoteParticipantName = name === 'friend' ? 'Собеседник' : 'ИИ';

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden shadow-lg group">
      {hasVideoTrack ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocalPlayer || isMuted} className="w-full h-full object-cover" />
      ) : (
         name === 'ai' ? <AIAvatar /> : <UserAvatar name={isLocalPlayer ? 'Вы' : remoteParticipantName} />
      )}
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-3 py-1 rounded-lg text-sm">
        {isLocalPlayer ? 'Вы' : remoteParticipantName}
      </div>
      {!isLocalPlayer && onToggleMute && stream && (
         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onToggleMute}
              title={isMuted ? "Включить звук собеседника" : "Заглушить собеседника"}
              className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75"
            >
              {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </button>
         </div>
      )}
    </div>
  );
};

const VolumeUpIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>);
const VolumeOffIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>);


export default VideoPlayer;