import React from 'react';
import { Server } from '../types';

interface ServerIconProps {
  server: Server;
  isActive: boolean;
  onClick: () => void;
}

const ServerIcon: React.FC<ServerIconProps> = ({ server, isActive, onClick }) => {
  return (
    <div 
        className={`server-icon group ${isActive ? 'active rounded-2xl' : ''}`} 
        onClick={onClick}
    >
      {server.imageUrl ? (
        <img src={server.imageUrl} alt={server.name} className="server-image" />
      ) : (
        <span>{server.name.charAt(0).toUpperCase()}</span>
      )}
      <div className="tooltip group-hover:opacity-100 group-hover:visible">
        {server.name}
      </div>
    </div>
  );
};

export default ServerIcon;
