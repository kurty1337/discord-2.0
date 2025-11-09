import React from 'react';

interface BottomBarProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

const ControlButton: React.FC<{ onClick: () => void; enabledClass?: string; disabledClass?: string; children: React.ReactNode; title: string; disabled?: boolean; isEnabled: boolean;}> = 
({ onClick, children, title, disabled = false, isEnabled, enabledClass="bg-gray-600 hover:bg-gray-500", disabledClass="bg-red-600 hover:bg-red-500" }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`p-3 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 ${isEnabled ? enabledClass : disabledClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);


const BottomBar: React.FC<BottomBarProps> = ({ isMicOn, isCameraOn, isScreenSharing, onToggleMic, onToggleCamera, onToggleScreenShare, onEndCall }) => {
    // In AI call, camera and screenshare are not applicable
    const isAiCall = onToggleCamera === onToggleScreenShare;

    return (
        <div className="bg-[#292b2f] p-3 flex items-center justify-center space-x-4 text-white">
            <ControlButton onClick={onToggleMic} isEnabled={isMicOn} title={isMicOn ? "Выключить микрофон" : "Включить микрофон"}>
                {isMicOn ? <MicOnIcon /> : <MicOffIcon />}
            </ControlButton>
            <ControlButton 
                onClick={onToggleCamera} 
                isEnabled={isCameraOn}
                disabled={isScreenSharing || isAiCall}
                title={isCameraOn ? "Выключить камеру" : "Включить камеру"}>
                {isCameraOn ? <CameraOnIcon /> : <CameraOffIcon />}
            </ControlButton>
            <ControlButton 
              onClick={onToggleScreenShare} 
              isEnabled={!isScreenSharing}
              disabled={isAiCall}
              title={isScreenSharing ? "Остановить демонстрацию" : "Демонстрация экрана"}
              enabledClass="bg-gray-600 hover:bg-gray-500"
              disabledClass="bg-green-600 hover:bg-green-500"
            >
                <ScreenShareIcon />
            </ControlButton>
             <button onClick={onEndCall} title="Завершить звонок" className="p-3 bg-red-600 hover:bg-red-500 rounded-full transition-colors duration-200 flex items-center justify-center">
                <PhoneOffIcon />
            </button>
        </div>
    );
};

const MicOnIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325T4 11H6q0 2.075 1.463 3.537T11 16v-1h2v1q2.075 0 3.538-1.463T18 11h2q0 2.925-1.7 4.9T13 17.925V21h-2Z"/></svg>);
const MicOffIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="m12.4 16.1-1-1q-.15.125-.325.188T10.7 15.35v-1.8l-1.6-1.6q0 .175.025.338T9.15 12.6h-2q.05-1.05.438-2.012t.987-1.738l-1.45-1.45q-1.15 1.3-1.788 2.875T4.65 12.6h2q0-.175.025-.338T6.7 11.9l1.6 1.6q0 .225-.025.438T8.25 14.4h2.2l3.45 3.45q.225.225.55.225.325 0 .55-.225.225-.225.225-.55t-.225-.55l-1-1Zm8-3.5h2q0 1.525-.637 3.1T20.05 18.9l-1.45-1.45q.8-1.15 1.225-2.425T20.25 12.6Zm-1.8-8.2-1.45 1.45q.9 1.1 1.35 2.387T19.25 12.6h2q0-1.8-1-3.45T17.6 6.1l-1.4 1.3ZM2.8 4.2 1.65 3.05q-.225-.225-.225-.55t.225-.55q.225-.225.55-.225t.55.225L21.3 20.3q.225.225.225.55t-.225.55q-.225.225-.55.225t-.55-.225L18.4 19.3q-1.45 1.1-3.2 1.65T11.65 21.5v-3.1q-2.5-.4-4.225-2.288T5.65 12.6H4.6q0 .55.125 1.112T4.95 14.8L2.8 12.65V12q0-1.25.875-2.125T5.5 9h.85l-3.55-3.5Z"/></svg>);
const CameraOnIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18 14.5V9q0-1.25-.875-2.125T15 6H4q-1.25 0-2.125.875T1 9v10q0 1.25.875 2.125T4 22h11q1.25 0 2.125-.875T18 19v-4.5l4 4V5l-4 4Z"/></svg>);
const CameraOffIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="m18.4 19.3-1-1H4q-.425 0-.713-.288T3 17V9q0-.425.288-.713T4 8h5.9l-1.6-1.6H4q-1.25 0-2.125.875T1 9v8q0 1.25.875 2.125T4 20h11.2l-1 1H4q-1.25 0-2.125-.875T1 19v-1.6l-1.6-1.6V19q0 1.25.875 2.125T2.4 22H4v2h12v-2h1.6l-2.1-2.1Zm-2.6-4.8V10.2l-1-1V6.4l-1-1H8.8l-1-1H4q-.425 0-.713-.288T3 4q0-.425.288-.713T4 3h1.2l-1.6-1.6L2.45 2.55l18 18L19.3 21.65l-2.1-2.1Zm-2.6-8.2L11.75 4.85l1-1L15 6h.4l-2.2 2.2Z"/></svg>);
const PhoneOffIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.95 21.6q-.425.025-.8-.125t-.6-.525L3.4 4.8q-.375-.375-.538-.838T2.8 3q.1-.5.513-.85.412-.35.937-.35.45 0 .825.2l16.15 16.15q.35.35.5.813.15.462.05.962-.1.5-.5.85t-.95.375ZM5.3 8.2 8.1 11q-.35.5-.638 1.025T7.05 13.2q.2 1.35 1.2 2.35t2.35 1.2q.5.15 1.025-.137.525-.288 1.025-.638l2.8 2.8q-1.25.7-2.613.975T10 20q-4.55 0-8.275-3.288T.1 9.5q.2-1.6.975-2.95T3.4 4.25Z"/></svg>);
const ScreenShareIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21.65 18.85 23 17.5l-1.35-1.35q-.15-.15-.35-.15t-.35.15q-.15.15-.15.35t.15.35L22.3 17.5l-1.3 1.35q-.15.15-.15.35t.15.35q.15.15.35.15t.35-.15ZM20 20H4q-.825 0-1.413-.588T2 18V6q0-.825.588-1.413T4 4h16q.825 0 1.413.588T22 6v6.5q0 .225-.15.375T21.5 13q-.225 0-.375-.15t-.125-.35V6H4v12h16v-1.5q0-.225.15-.375t.35-.125q.225 0 .35.15t.15.35V18q0 .825-.588 1.413T20 20Zm-8.5-7.5-3-3L9.55 8.45l2.45 2.45 4.55-4.55 1.05 1.05-5.6 5.6Z"/></svg>);

export default BottomBar;