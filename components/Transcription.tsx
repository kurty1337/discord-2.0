
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
            <UserAvatar name={entry.speaker === 'user' ? 'Вы' : 'Собеседник'} />
            <div className="ml-4">
              <p className="font-semibold text-purple-300">{entry.speaker === 'user' ? 'Вы' : 'Собеседник'}</p>
              <p className="text-gray-200">{entry.text}</p>
            </div>
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
};

export default Transcription;
