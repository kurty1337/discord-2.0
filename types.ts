export interface TranscriptionEntry {
  speaker: 'user' | 'friend';
  text: string;
}

export enum ConnectionState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
  CLOSED = 'CLOSED',
}