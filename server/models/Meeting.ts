import mongoose, { Document, Schema } from "mongoose";

export interface ITranscriptChunk {
  text: string;
  timestamp: Date;
  duration: number;
}

export interface IMeeting extends Document {
  title: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: "active" | "completed" | "paused";
  transcriptChunks: ITranscriptChunk[];
  fullTranscript: string;
  createdAt: Date;
  updatedAt: Date;
}

const transcriptChunkSchema = new Schema<ITranscriptChunk>({
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  duration: { type: Number, default: 0 },
});

const meetingSchema = new Schema<IMeeting>({
  title: { type: String, required: true },
  userId: { type: String, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  status: { type: String, enum: ["active", "completed", "paused"], default: "active" },
  transcriptChunks: [transcriptChunkSchema],
  fullTranscript: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Meeting = mongoose.model<IMeeting>("Meeting", meetingSchema);
