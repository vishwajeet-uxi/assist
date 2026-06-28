import { RequestHandler } from "express";
import { Meeting } from "../models/Meeting";

export const createMeeting: RequestHandler = async (req, res) => {
  try {
    const { title, userId } = req.body;
    const meeting = new Meeting({
      title,
      userId,
      startTime: new Date(),
    });
    await meeting.save();
    res.status(201).json(meeting);
  } catch (error) {
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
      },
      { new: true }
    );
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    res.json(meeting);
  } catch (error) {
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
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve transcript" });
  }
};
