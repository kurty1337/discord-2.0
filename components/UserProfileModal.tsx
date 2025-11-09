import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';

interface UserProfileModalProps {
  user: UserProfile;
  onSave: (updatedUser: UserProfile) => void;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onSave, onClose }) => {
  const [displayName, setDisplayName] = useState(user.displayName || user.username);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave({ 
      ...user, 
      displayName: displayName.trim() ? displayName.trim() : user.username,
      avatarUrl: avatarPreview
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-white">Мой профиль</h2>
        
        <div className="flex items-center mb-6">
            <div className="relative mr-4">
                <img 
                    src={avatarPreview || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%235865F2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="50" font-family="sans-serif" fill="white">${user.username.charAt(0).toUpperCase()}</text></svg>`} 
                    alt="Аватар" 
                    className="w-20 h-20 rounded-full object-cover" 
                />
                <button 
                    onClick={handleAvatarClick}
                    className="absolute bottom-0 right-0 bg-gray-900/80 p-1 rounded-full text-white hover:bg-gray-800"
                    title="Сменить аватар"
                >
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif"
                />
            </div>
            <div>
                <p className="text-xl font-bold text-white">{displayName}</p>
                <p className="text-sm text-gray-400">{user.username}</p>
            </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-400 mb-2" htmlFor="displayName">Отображаемое имя</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 bg-[#202225] border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-400 mb-2" htmlFor="username">Имя пользователя</label>
          <input
            id="username"
            type="text"
            value={user.username}
            readOnly
            className="w-full px-4 py-2 bg-[#202225] border border-black/20 rounded-lg focus:outline-none cursor-not-allowed text-gray-400"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-white hover:bg-gray-600/50">Отмена</button>
          <button onClick={handleSave} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg">Сохранить</button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
