export interface TranscriptionEntry {
  speaker: 'user' | 'friend' | 'ai';
  text: string;
}

export enum ConnectionState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
  CLOSED = 'CLOSED',
}

export interface UserProfile {
  username: string;
  displayName: string | null;
  // Can be a web URL or a local base64 data string
  avatarUrl: string | null;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

export interface Server {
  id: string;
  name: string;
  imageUrl: string | null;
  channels: Channel[];
}

// --- NEW TYPES FOR CHAT ---

export type MessageAuthor = 'user' | 'friend' | 'ai';

export interface Message {
  id: string;
  author: MessageAuthor;
  content: string; // For text, it's the message. For images, base64. For videos, a URL.
  type: 'text' | 'image' | 'video' | 'loading' | 'error';
  timestamp: string;
}

export interface DirectMessageChannel {
    id: string; // Will be friend's peerId or a special ID like 'ai'
    name: string;
    avatarUrl: string | null;
}
