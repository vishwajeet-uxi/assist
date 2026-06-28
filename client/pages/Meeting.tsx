import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, Search, Download, Pause, Play, StopCircle, Loader, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

interface TranscriptChunk {
  text: string;
  timestamp: Date;
  duration: number;
}

export function Meeting() {
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("New Meeting");
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [fullTranscript, setFullTranscript] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [summary, setSummary] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [question, setQuestion] = useState("");
  const [qaResponse, setQaResponse] = useState<string | null>(null);
  const [loadingQA, setLoadingQA] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socket = io("/", {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      if (meetingId) {
        socket.emit("join-meeting", meetingId);
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    socket.on("transcript-update", (data: TranscriptChunk) => {
      setTranscript((prev) => [...prev, data]);
      setFullTranscript((prev) => (prev ? prev + " " + data.text : data.text));
    });

    socket.on("error", (error: any) => {
      console.error("Socket error:", error);
      toast.error("Connection error: " + error.message);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.disconnect();
    };
  }, [meetingId]);

  // Auto-scroll when new transcript arrives
  useEffect(() => {
    if (autoScroll) {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, autoScroll]);

  const mockTranscripts = [
    "Let's start with the Q3 results overview.",
    "We saw a 15% increase in user engagement compared to Q2.",
    "The mobile platform now represents 40% of our total traffic.",
    "Key metrics show improvement across all major KPIs.",
    "We need to discuss the marketing budget allocation.",
    "I propose we increase the paid advertising spend by 20%.",
    "That should help us reach new customer segments.",
    "Let's schedule a follow-up meeting with the marketing team.",
    "Action item: Prepare detailed market analysis by Friday.",
    "Next, let's review the engineering roadmap.",
  ];

  const handleStartMeeting = async () => {
    try {
      const title = meetingTitle || `Meeting ${new Date().toLocaleString()}`;
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          userId: "user-" + Math.random().toString(36).substr(2, 9),
        }),
      });

      const meeting = await response.json();
      setMeetingId(meeting._id);

      // Join meeting via socket
      if (socketRef.current) {
        socketRef.current.emit("join-meeting", meeting._id);
      }

      setIsRecording(true);
      setTranscript([]);
      setFullTranscript("");
      setElapsedTime(0);
      setIsPaused(false);
      setSummary(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      toast.success("Meeting started");

      // Simulate receiving transcript chunks for demo
      mockTranscripts.forEach((text, idx) => {
        setTimeout(() => {
          const newChunk: TranscriptChunk = {
            text,
            timestamp: new Date(),
            duration: Math.random() * 3 + 2,
          };
          if (socketRef.current) {
            socketRef.current.emit("transcript-chunk", {
              meetingId: meeting._id,
              text,
              duration: newChunk.duration,
            });
          }
        }, idx * 1500);
      });
    } catch (error) {
      console.error("Failed to start meeting:", error);
      toast.error("Failed to start meeting");
    }
  };

  const handleStopMeeting = async () => {
    try {
      if (meetingId && timerRef.current) {
        clearInterval(timerRef.current);
        await fetch(`/api/meetings/${meetingId}/end`, { method: "POST" });
        setIsRecording(false);
        toast.success("Meeting ended");
      }
    } catch (error) {
      console.error("Failed to end meeting:", error);
      toast.error("Failed to end meeting");
    }
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused && timerRef.current === null) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else if (!isPaused && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullTranscript);
    toast.success("Transcript copied to clipboard");
  };

  const handleGenerateSummary = async () => {
    if (!fullTranscript.trim()) {
      toast.error("No transcript to summarize");
      return;
    }
    setLoadingSummary(true);
    try {
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: fullTranscript }),
      });
      const data = await response.json();
      setSummary(data);
      toast.success("Summary generated");
    } catch (error) {
      console.error("Failed to generate summary:", error);
      toast.error("Failed to generate summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }
    if (!fullTranscript.trim()) {
      toast.error("No transcript available");
      return;
    }
    setLoadingQA(true);
    try {
      const response = await fetch("/api/ai/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, transcript: fullTranscript }),
      });
      const data = await response.json();
      setQaResponse(data.answer);
      setQuestion("");
    } catch (error) {
      console.error("Failed to answer question:", error);
      toast.error("Failed to answer question");
    } finally {
      setLoadingQA(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const filteredTranscript = searchTerm
    ? transcript.filter((chunk) => chunk.text.toLowerCase().includes(searchTerm.toLowerCase()))
    : transcript;

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-white">AI Meeting Assistant</h1>
              <p className="text-slate-400 text-sm mt-1">Real-time transcription & AI-powered insights</p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
              />
              <span className="text-sm font-medium text-slate-300">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          {/* Meeting Title Input */}
          {!isRecording ? (
            <div className="mb-4">
              <Input
                placeholder="Meeting title (optional)"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 max-w-md"
              />
            </div>
          ) : null}

          {/* Controls */}
          <div className="flex gap-3 flex-wrap">
            {!isRecording ? (
              <Button
                onClick={handleStartMeeting}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Meeting
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleTogglePause}
                  className={isPaused ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleStopMeeting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  End Meeting
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Transcript Area */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-[600px]">
              {/* Search Bar */}
              <div className="p-4 border-b border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Search transcript..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <label className="flex items-center gap-2 mt-3 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded"
                  />
                  Auto-scroll
                </label>
              </div>

              {/* Transcript Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!isRecording && transcript.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-slate-400">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Start a meeting to begin transcription</p>
                    </div>
                  </div>
                ) : filteredTranscript.length === 0 && searchTerm ? (
                  <div className="text-center text-slate-400 py-8">
                    No results found for "{searchTerm}"
                  </div>
                ) : (
                  <>
                    {filteredTranscript.map((chunk, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-700 rounded p-3 hover:bg-slate-600 transition"
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-xs text-slate-400">{formatTime(chunk.timestamp)}</span>
                          <span className="text-xs text-slate-500">
                            {chunk.duration.toFixed(1)}s
                          </span>
                        </div>
                        <p className="text-slate-100 text-sm leading-relaxed">{chunk.text}</p>
                      </div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </>
                )}
              </div>

              {/* Footer Stats */}
              <div className="border-t border-slate-700 bg-slate-800 px-4 py-3 text-xs text-slate-400">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span>
                    {transcript.length} chunks • {fullTranscript.length} chars • {formatDuration(elapsedTime)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="text-xs"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - AI Features Panel */}
          <div className="bg-slate-800 rounded-lg shadow-lg p-6 h-fit max-h-[800px] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">AI Features</h2>
            <div className="space-y-3">
              <Button
                onClick={handleGenerateSummary}
                disabled={!fullTranscript || loadingSummary}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loadingSummary ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>📝 Generate Summary</>
                )}
              </Button>
              <Button
                onClick={() => setShowQA(!showQA)}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={!fullTranscript}
              >
                💬 Ask Question
              </Button>
              <Button className="w-full bg-purple-600 hover:bg-purple-700" disabled={!fullTranscript}>
                📎 Export as PDF
              </Button>
            </div>

            {/* Summary Display */}
            {summary && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Summary</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{summary.summary}</p>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300">Key Points</h4>
                  <ul className="text-xs text-slate-400 space-y-1">
                    {summary.keyPoints.map((point, idx) => (
                      <li key={idx} className="ml-3">
                        • {point}
                      </li>
                    ))}
                  </ul>
                </div>
                {summary.actionItems.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <h4 className="text-xs font-semibold text-slate-300">Action Items</h4>
                    <ul className="text-xs text-slate-400 space-y-1">
                      {summary.actionItems.map((item, idx) => (
                        <li key={idx} className="ml-3">
                          ✓ {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Q&A Section */}
            {showQA && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Ask a Question</h3>
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Ask about the meeting..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAskQuestion()}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 text-xs"
                  />
                  <Button
                    onClick={handleAskQuestion}
                    disabled={!question.trim() || loadingQA}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm"
                  >
                    {loadingQA ? (
                      <>
                        <Loader className="w-3 h-3 mr-2 animate-spin" />
                        Thinking...
                      </>
                    ) : (
                      "Send"
                    )}
                  </Button>
                </div>
                {qaResponse && (
                  <div className="mt-3 p-2 bg-slate-700 rounded text-xs text-slate-300">
                    {qaResponse}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Meeting Info</h3>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-slate-200">
                    {isRecording ? "🔴 Recording" : "⚫ Idle"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transcript Lines:</span>
                  <span className="text-slate-200">{transcript.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Duration:</span>
                  <span className="text-slate-200">
                    {transcript.reduce((sum, c) => sum + c.duration, 0).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
