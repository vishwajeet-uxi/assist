import { RequestHandler } from "express";
import { generateMeetingSummary, answerMeetingQuestion, extractKeyTopics, isMocked } from "../services/groqService";

interface SummaryRequest {
  transcript: string;
}

interface SummaryResponse {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions?: string[];
  isMocked?: boolean;
}

const mockSummary = (transcript: string): SummaryResponse => {
  return {
    summary: `This meeting focused on quarterly results review and strategic planning. Key achievements include a 15% increase in user engagement and strong mobile platform growth. The team discussed marketing budget allocation and engineering roadmap priorities.`,
    keyPoints: [
      "15% increase in user engagement (Q3 vs Q2)",
      "Mobile platform now represents 40% of total traffic",
      "All major KPIs show improvement",
      "Proposed 20% increase in paid advertising spend",
    ],
    actionItems: [
      "Prepare detailed market analysis (Due: Friday)",
      "Schedule follow-up meeting with marketing team",
      "Review engineering roadmap priorities",
    ],
    decisions: ["Allocate 20% more budget to paid ads", "Prioritize mobile platform improvements"],
    isMocked: true,
  };
};

export const generateSummary: RequestHandler<any, SummaryResponse | { error: string }> = async (req, res) => {
  try {
    const { transcript } = req.body as SummaryRequest;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: "Transcript is required" });
    }

    const result = await generateMeetingSummary(transcript);
    if (result) {
      return res.json(result);
    }

    // Fallback to mock if Groq API fails or not configured
    res.json(mockSummary(transcript));
  } catch (error) {
    console.error("Error in generateSummary:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
};

export const answerQuestion: RequestHandler<
  any,
  { answer: string; isMocked?: boolean } | { error: string }
> = async (req, res) => {
  try {
    const { question, transcript } = req.body as { question: string; transcript: string };

    if (!question || !transcript) {
      return res.status(400).json({ error: "Question and transcript are required" });
    }

    const answer = await answerMeetingQuestion(transcript, question);
    if (answer) {
      return res.json({ answer });
    }

    // Mock response if Groq API fails or not configured
    let mockAnswer = "Based on the transcript, ";
    if (question.toLowerCase().includes("engagement")) {
      mockAnswer += "user engagement increased by 15% in Q3 compared to Q2.";
    } else if (question.toLowerCase().includes("mobile")) {
      mockAnswer += "the mobile platform now represents 40% of total traffic.";
    } else if (question.toLowerCase().includes("budget")) {
      mockAnswer +=
        "the team proposed a 20% increase in paid advertising spend to reach new customer segments.";
    } else {
      mockAnswer += "this was discussed in the meeting and the relevant details are in the transcript.";
    }

    res.json({ answer: mockAnswer, isMocked: true });
  } catch (error) {
    console.error("Error in answerQuestion:", error);
    res.status(500).json({ error: "Failed to answer question" });
  }
};

export const extractKeyPoints: RequestHandler<any, { keyPoints: string[]; isMocked?: boolean } | { error: string }> =
  async (req, res) => {
    try {
      const { transcript } = req.body as SummaryRequest;

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({ error: "Transcript is required" });
      }

      const keyPoints = await extractKeyTopics(transcript);
      if (keyPoints) {
        return res.json({ keyPoints });
      }

      // Fallback to mock
      const summary = mockSummary(transcript);
      res.json({ keyPoints: summary.keyPoints, isMocked: true });
    } catch (error) {
      console.error("Error in extractKeyPoints:", error);
      res.status(500).json({ error: "Failed to extract key points" });
    }
  };
