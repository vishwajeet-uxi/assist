import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Search, Download, Pause, Play, StopCircle, Loader } from "lucide-react";

interface TranscriptChunk {
  text: string;
  timestamp: Date;
  duration: number;
}

export function Meeting() {
  const [meetingId] = useState("default-meeting");
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [fullTranscript, setFullTranscript] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [summary, setSummary] = useState<{ summary: string; keyPoints: string[]; actionItems: string[] } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [question, setQuestion] = useState("");
  const [qaResponse, setQaResponse] = useState<string | null>(null);
  const [loadingQA, setLoadingQA] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

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
      socket.emit("join-meeting", meetingId);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    socket.on("transcript-update", (data: TranscriptChunk) => {
      setTranscript((prev) => [...prev, data]);
      setFullTranscript((prev) => prev + " " + data.text);
    });

    return () => {
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

  const handleStartMeeting = () => {
    setIsRecording(true);
    setTranscript([]);
    setFullTranscript("");

    // Simulate receiving transcript chunks
    mockTranscripts.forEach((text, idx) => {
      setTimeout(() => {
        const newChunk: TranscriptChunk = {
          text,
          timestamp: new Date(),
          duration: Math.random() * 3 + 2,
        };
        setTranscript((prev) => [...prev, newChunk]);
        setFullTranscript((prev) => prev + " " + text);
      }, idx * 1500);
    });
  };

  const handleStopMeeting = () => {
    setIsRecording(false);
  };

  const handleTogglePause = () => {
    // TODO: Implement pause functionality
  };

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: fullTranscript }),
      });
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("Failed to generate summary:", error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    setLoadingQA(true);
    try {
      const response = await fetch("/api/ai/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, transcript: fullTranscript }),
      });
      const data = await response.json();
      setQaResponse(data.answer);
    } catch (error) {
      console.error("Failed to answer question:", error);
    } finally {
      setLoadingQA(false);
    }
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
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">AI Meeting Assistant</h1>
              <p className="text-slate-400 text-sm mt-1">Live transcription and meeting notes</p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="text-sm font-medium text-slate-300">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

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
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
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
                <div className="flex justify-between">
                  <span>{transcript.length} chunks • {fullTranscript.length} characters</span>
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

          {/* Sidebar - AI Features Panel */}
          <div className="bg-slate-800 rounded-lg shadow-lg p-6 h-fit max-h-[600px] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">AI Features</h2>
            <div className="space-y-3">
              <Button
                onClick={handleGenerateSummary}
                disabled={!isRecording || transcript.length === 0 || loadingSummary}
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
              <Button className="w-full bg-purple-600 hover:bg-purple-700" disabled={!isRecording}>
                ✓ Action Items
              </Button>
              <Button
                onClick={() => setShowQA(!showQA)}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={transcript.length === 0}
              >
                💬 Ask Question
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
