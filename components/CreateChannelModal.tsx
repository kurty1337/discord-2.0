import React, { useState } from 'react';

interface CreateChannelModalProps {
  type: 'text' | 'voice';
  onCreate: (name: string, type: 'text' | 'voice') => void;
  onClose: () => void;
}

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ type, onCreate, onClose }) => {
  const [name, setName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'voice'>(type);

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), channelType);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-white">Создать канал</h2>
        
        <div className="mb-4">
            <label className="block text-sm font-bold text-gray-400 mb-2">ТИП КАНАЛА</label>
            <div className="flex bg-[#202225] p-1 rounded-lg">
                <button 
                    className={`flex-1 p-2 rounded ${channelType === 'text' ? 'bg-purple-600 text-white' : 'hover:bg-gray-600/50'}`}
                    onClick={() => setChannelType('text')}
                >
                    # Текстовый
                </button>
                <button 
                    className={`flex-1 p-2 rounded ${channelType === 'voice' ? 'bg-purple-600 text-white' : 'hover:bg-gray-600/50'}`}
                    onClick={() => setChannelType('voice')}
                >
                    🔊 Голосовой
                </button>
            </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-400 mb-2" htmlFor="channel-name">НАЗВАНИЕ КАНАЛА</label>
          <div className="relative">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{channelType === 'text' ? '#' : '🔊'}</span>
             <input
                id="channel-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="new-channel"
                className="w-full pl-8 pr-4 py-2 bg-[#202225] border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
             />
          </div>
        </div>

        <div className="flex justify-end items-center space-x-2">
           <button onClick={onClose} className="px-4 py-2 rounded-lg text-white hover:bg-gray-600/50">Отмена</button>
           <button 
             onClick={handleCreate} 
             disabled={!name.trim()}
             className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
           >
             Создать канал
           </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChannelModal;
