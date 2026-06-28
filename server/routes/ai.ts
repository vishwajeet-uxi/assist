import { RequestHandler } from "express";

interface SummaryRequest {
  transcript: string;
}

interface SummaryResponse {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}

// Mock AI responses for now - will integrate with Groq later
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
  };
};

export const generateSummary: RequestHandler<any, SummaryResponse | { error: string }> = async (req, res) => {
  try {
    const { transcript } = req.body as SummaryRequest;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: "Transcript is required" });
    }

    const summary = mockSummary(transcript);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate summary" });
  }
};

export const answerQuestion: RequestHandler<
  any,
  { answer: string } | { error: string }
> = async (req, res) => {
  try {
    const { question, transcript } = req.body as { question: string; transcript: string };

    if (!question || !transcript) {
      return res.status(400).json({ error: "Question and transcript are required" });
    }

    // Mock response based on question
    let answer = "Based on the transcript, ";
    if (question.toLowerCase().includes("engagement")) {
      answer += "user engagement increased by 15% in Q3 compared to Q2.";
    } else if (question.toLowerCase().includes("mobile")) {
      answer += "the mobile platform now represents 40% of total traffic.";
    } else if (question.toLowerCase().includes("budget")) {
      answer +=
        "the team proposed a 20% increase in paid advertising spend to reach new customer segments.";
    } else {
      answer += "this was discussed in the meeting and the relevant details are in the transcript.";
    }

    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: "Failed to answer question" });
  }
};

export const extractKeyPoints: RequestHandler<any, { keyPoints: string[] } | { error: string }> =
  async (req, res) => {
    try {
      const { transcript } = req.body as SummaryRequest;

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({ error: "Transcript is required" });
      }

      const summary = mockSummary(transcript);
      res.json({ keyPoints: summary.keyPoints });
    } catch (error) {
      res.status(500).json({ error: "Failed to extract key points" });
    }
  };
