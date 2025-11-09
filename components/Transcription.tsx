
import React, { useRef, useEffect } from 'react';
import { TranscriptionEntry } from '../types';

interface TranscriptionProps {
  entries: TranscriptionEntry[];
}

const UserAvatar: React.FC<{ name: string }> = ({ name }) => (
    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-lg font-bold text-white">{name.charAt(0).toUpperCase()}</span>
    </div>
);

const AIAvatar: React.FC = () => (
    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
         <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8" /><rect x="4" y="12" width="16" height="8" rx="2" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M12 12v-2" />
        </svg>
    </div>
);

const SpeakerInfo: React.FC<{ speaker: TranscriptionEntry['speaker'] }> = ({ speaker }) => {
    switch (speaker) {
        case 'user':
            return <><UserAvatar name="Вы" /><p className="ml-4 font-semibold text-purple-300">Вы</p></>;
        case 'friend':
            return <><UserAvatar name="С" /><p className="ml-4 font-semibold text-green-300">Собеседник</p></>;
        case 'ai':
            return <><AIAvatar /><p className="ml-4 font-semibold text-indigo-300">ИИ</p></>;
        default:
            return null;
    }
};


const Transcription: React.FC<TranscriptionProps> = ({ entries }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="w-full h-full bg-[#2f3136] p-2 rounded-lg flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {entries.map((entry, index) => (
          <div key={index} className="flex items-start p-2 hover:bg-black/10 rounded">
            <div className="flex items-center w-full">
                <SpeakerInfo speaker={entry.speaker} />
                <p className="text-gray-200 ml-4">{entry.text}</p>
            </div>
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
};

export default Transcription;