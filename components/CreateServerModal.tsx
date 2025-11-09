import React, { useState } from 'react';

interface CreateServerModalProps {
  onCreate: (name: string, imageUrl: string | null) => void;
  onClose: () => void;
}

const CreateServerModal: React.FC<CreateServerModalProps> = ({ onCreate, onClose }) => {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), imageUrl.trim() ? imageUrl.trim() : null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content text-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-2 text-white">Создайте свой сервер</h2>
        <p className="text-gray-400 mb-6">Дайте вашему серверу индивидуальность, указав название и значок.</p>
        
        <div className="mb-4 text-left">
          <label className="block text-sm font-bold text-gray-400 mb-2" htmlFor="server-name">НАЗВАНИЕ СЕРВЕРА</label>
          <input
            id="server-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-[#202225] border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        <div className="mb-6 text-left">
          <label className="block text-sm font-bold text-gray-400 mb-2" htmlFor="server-image">URL ЗНАЧКА</label>
          <input
            id="server-image"
            type="text"
            placeholder="https://example.com/icon.png (необязательно)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-4 py-2 bg-[#202225] border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex justify-between items-center bg-[#2f3136] p-4 rounded-b-lg -m-6 mt-6">
           <button onClick={onClose} className="text-white hover:underline">Назад</button>
           <button 
             onClick={handleCreate} 
             disabled={!name.trim()}
             className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
           >
             Создать
           </button>
        </div>
      </div>
    </div>
  );
};

export default CreateServerModal;
