import React, { useState } from 'react';
import { PREDEFINED_GIFS, PREDEFINED_STICKERS } from '../data/media';

interface GifStickerPickerProps {
    onSelectGif: (url: string) => void;
}

type PickerTab = 'gifs' | 'stickers';

const GifStickerPicker: React.FC<GifStickerPickerProps> = ({ onSelectGif }) => {
    const [activeTab, setActiveTab] = useState<PickerTab>('gifs');

    const items = activeTab === 'gifs' ? PREDEFINED_GIFS : PREDEFINED_STICKERS;

    return (
        <div className="picker-container">
            <div className="picker-tabs">
                <button 
                    className={`picker-tab ${activeTab === 'gifs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('gifs')}
                >
                    GIF
                </button>
                <button 
                    className={`picker-tab ${activeTab === 'stickers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stickers')}
                >
                    Стикеры
                </button>
            </div>
            <div className="picker-content">
                <div className="picker-grid">
                    {items.map(item => (
                        <img 
                            key={item.id}
                            src={item.url}
                            alt={item.alt}
                            className="picker-item"
                            onClick={() => onSelectGif(item.url)}
                            loading="lazy"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GifStickerPicker;
