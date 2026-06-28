/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export interface TranscriptChunk {
  text: string;
  timestamp: string;
  duration: number;
}

export interface Meeting {
  _id: string;
  title: string;
  userId: string;
  startTime: string;
  endTime?: string;
  status: "active" | "completed" | "paused";
  transcriptChunks: TranscriptChunk[];
  fullTranscript: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptResponse {
  meetingId: string;
  fullTranscript: string;
  chunks: TranscriptChunk[];
}
