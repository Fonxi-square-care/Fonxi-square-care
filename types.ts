
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

export type AppStatus = 'idle' | 'uploading' | 'generating' | 'editing' | 'error';

export interface OperationLog {
  message: string;
  type: 'info' | 'success' | 'error';
}
