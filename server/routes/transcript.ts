import { RequestHandler } from "express";
import { Meeting } from "../models/Meeting";

export const createMeeting: RequestHandler = async (req, res) => {
  try {
    const { title, userId } = req.body;

    if (!title || !userId) {
      return res.status(400).json({ error: "Title and userId are required" });
    }

    const meeting = new Meeting({
      title,
      userId,
      startTime: new Date(),
      status: "active",
    });
    await meeting.save();
    res.status(201).json(meeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
};

export const getMeeting: RequestHandler = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    res.json(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({ error: "Failed to retrieve meeting" });
  }
};

export const endMeeting: RequestHandler = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findByIdAndUpdate(
      meetingId,
      {
        status: "completed",
        endTime: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    res.json(meeting);
  } catch (error) {
    console.error("Error ending meeting:", error);
    res.status(500).json({ error: "Failed to end meeting" });
  }
};

export const getTranscript: RequestHandler = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    res.json({
      meetingId,
      fullTranscript: meeting.fullTranscript,
      chunks: meeting.transcriptChunks,
      totalChunks: meeting.transcriptChunks.length,
    });
  } catch (error) {
    console.error("Error fetching transcript:", error);
    res.status(500).json({ error: "Failed to retrieve transcript" });
  }
};

export const addTranscriptChunk: RequestHandler = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { text, duration } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const meeting = await Meeting.findByIdAndUpdate(
      meetingId,
      {
        $push: {
          transcriptChunks: {
            text,
            timestamp: new Date(),
            duration: duration || 0,
          },
        },
        $set: {
          fullTranscript: (await Meeting.findById(meetingId))?.fullTranscript + " " + text,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json(meeting);
  } catch (error) {
    console.error("Error adding transcript chunk:", error);
    res.status(500).json({ error: "Failed to add transcript chunk" });
  }
};
