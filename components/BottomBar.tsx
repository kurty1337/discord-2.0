
import React from 'react';

interface BottomBarProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isCameraAvailable: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  peerId: string;
}

const ControlButton: React.FC<{ onClick: () => void; enabledClass?: string; disabledClass?: string; children: React.ReactNode; title: string; disabled?: boolean; isEnabled: boolean;}> = 
({ onClick, children, title, disabled = false, isEnabled, enabledClass="bg-gray-600 hover:bg-gray-500", disabledClass="bg-purple-600 hover:bg-purple-500" }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 ${isEnabled ? enabledClass : disabledClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);


const BottomBar: React.FC<BottomBarProps> = ({ isMicOn, isCameraOn, isCameraAvailable, isScreenSharing, onToggleMic, onToggleCamera, onToggleScreenShare, onEndCall, peerId }) => {
    return (
        <div className="bg-[#292b2f] p-2 flex items-center justify-between text-white">
            {/* User Info */}
            <div className="flex items-center">
                <div className="relative">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xl font-bold">В</span>
                    </div>
                    <div className="absolute bottom-0 right-2 w-4 h-4 bg-green-500 border-2 border-[#292b2f] rounded-full"></div>
                </div>
                <div>
                    <p className="font-semibold text-sm">Вы</p>
                    <p className="text-xs text-gray-400 font-mono select-all" title="Ваш ID">{peerId.substring(0, 8)}...</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-3">
                <ControlButton onClick={onToggleMic} isEnabled={isMicOn} disabledClass="bg-red-600 hover:bg-red-500" title={isMicOn ? "Выключить микрофон" : "Включить микрофон"}>
                    {isMicOn ? <MicOnIcon /> : <MicOffIcon />}
                </ControlButton>
                <ControlButton onClick={onToggleCamera} isEnabled={isCameraOn} disabledClass="bg-red-600 hover:bg-red-500" title={isCameraOn ? "Выключить камеру" : "Включить камеру"} disabled={!isCameraAvailable}>
                    {isCameraOn ? <CameraOnIcon /> : <CameraOffIcon />}
                </ControlButton>
                 <ControlButton onClick={onToggleScreenShare} isEnabled={!isScreenSharing} title={isScreenSharing ? "Остановить демонстрацию" : "Демонстрация экрана"}>
                    <ScreenShareIcon />
                </ControlButton>
            </div>

            {/* End Call */}
            <div className="pr-2">
                 <button onClick={onEndCall} title="Завершить звонок" className="p-2 bg-red-600 hover:bg-red-500 rounded-full transition-colors duration-200 flex items-center justify-center">
                    <PhoneOffIcon />
                </button>
            </div>
        </div>
    );
};

const MicOnIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 0v-1.5a6 6 0 0 0-12 0v1.5m6 7.5a6 6 0 0 0 6-6v-1.5m-6 7.5v4.5m0-16.5v-2.25" /></svg>);
const MicOffIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m17.25 9-8.25 8.25m0 0L7.5 15.75m1.5 1.5L10.5 18m-3-3.75a3 3 0 1 1 6 0M12 12.75a3 3 0 0 0-3 2.25m6-4.5a3 3 0 0 0-3-2.25M12 6.75a3 3 0 0 0-3 2.25m6 0a3 3 0 0 0-3-2.25M3 3l18 18" /></svg>);
const CameraOnIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" /></svg>);
const CameraOffIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18m-3.372-3.372a9.75 9.75 0 0 0-1.498-1.824l-4.5 3.375c-.21.157-.453.274-.707.359m-5.332-4.332a9.753 9.753 0 0 1-1.423-4.283L.974 4.014M15.75 10.5l4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" /></svg>);
const ScreenShareIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-1.621-.871A3 3 0 0 1 14 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h9.75a2.25 2.25 0 0 1 2.25 2.25Z" /></svg>);
const PhoneOffIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.211-.998-.552-1.348l-5.114-5.114a1.125 1.125 0 0 0-1.591 0L10.5 11.25H9.75a7.5 7.5 0 0 1-7.5-7.5V3.75c0-.621.504-1.125 1.125-1.125H4.5A2.25 2.25 0 0 0 6.75 4.5v1.875c0 .621-.504 1.125-1.125 1.125H2.25Z" /></svg>);

export default BottomBar;
