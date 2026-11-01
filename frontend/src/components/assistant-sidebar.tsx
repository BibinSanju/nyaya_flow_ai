"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, RotateCcw, Mic, MicOff, Volume2, VolumeX, Square, Loader2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  citizen: "Citizen",
  advocate: "Advocate",
  police: "Police officer",
  registrar: "Registry officer",
  judge: "Judge",
  admin: "Administrator",
};

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  model?: string;
}

export default function AssistantSidebar({ role = "citizen" }: { role?: string }) {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState(role);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setMounted(true);

    const handleExternalOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener("open-nyayaflow-chat", handleExternalOpen);
    return () => window.removeEventListener("open-nyayaflow-chat", handleExternalOpen);
  }, []);

  // Synchronize role with current dashboard route or authenticated session
  useEffect(() => {
    if (pathname) {
      if (pathname.includes("/advocate")) setCurrentRole("advocate");
      else if (pathname.includes("/police")) setCurrentRole("police");
      else if (pathname.includes("/registrar")) setCurrentRole("registrar");
      else if (pathname.includes("/judge")) setCurrentRole("judge");
      else if (pathname.includes("/admin")) setCurrentRole("admin");
      else if (pathname.includes("/citizen")) setCurrentRole("citizen");
      else {
        try {
          const userStr = localStorage.getItem("nyayaflow_user");
          if (userStr) {
            const u = JSON.parse(userStr);
            if (u.role) setCurrentRole(u.role);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [pathname, role]);

  const initialMessagesByRole: Record<string, string> = {
    citizen:
      "Namaste. I can help you understand how to file a petition, which documents you need, or how to track your case. What would you like to know?",
    advocate:
      "Hello. I can help with precedents, vakalatnama requirements, interim injunction grounds, and mapping old IPC/CrPC sections to BNS/BNSS.",
    police:
      "Hello. I can suggest BNS sections for an incident, explain digital evidence requirements under Section 63 BSA, and help with chargesheet checklists.",
    registrar:
      "Hello. I can help with scrutiny checklists, spotting duplicate filings and the CNR numbering format.",
    judge:
      "Hello. I can summarise case briefs, find relevant precedents and help structure interim orders.",
    admin:
      "Hello. I can answer questions about access control, audit logs and system health.",
  };

  const suggestionsByRole: Record<string, string[]> = {
    citizen: [
      "How to file a property boundary dispute?",
      "What is a CNR number in Indian courts?",
      "What documents are required for civil petition?",
    ],
    advocate: [
      "Review partition deed formats and mutation rules",
      "Explain document overlap threshold criteria",
      "Suggest grounds for CPC Order 39 interim injunction",
    ],
    police: [
      "Suggest BNS sections for cyber fraud and identity theft",
      "How are evidence SHA-256 digital hashes calculated?",
      "Checklist for filing chargesheets in magistrate court",
    ],
    registrar: [
      "What are the OCR compliance requirements?",
      "Rules for detecting duplicate filings across courts",
      "Protocol for assigning 16-digit CNR numbers",
    ],
    judge: [
      "Synthesize cause list precedent match criteria",
      "Relevant case laws under MLRC Section 143",
      "Structure for drafting interim relief order",
    ],
    admin: [
      "How are audit logs and data integrity secured?",
      "Explain platform role-based access control (RLS)",
      "Check server and database cluster health status",
    ],
  };

  const answersByRole: Record<string, Record<string, string>> = {
    citizen: {
      "How to file a property boundary dispute?":
        "To file a property boundary dispute:\n1. **Collect Land Records**: 7/12 extract mutation register & survey partition map from the Talathi office.\n2. **Demarcation Application**: File a survey application (Mojani) before the Taluka Inspector of Land Records (TILR).\n3. **Engage an Advocate**: Connect with a verified civil advocate in your district.\n4. **Civil Suit**: If encroachment persists, file for permanent injunction under Section 38 of the Specific Relief Act, 1963.\n5. **CNR Tracking**: Track case updates via your 16-character CNR number.",
      "What is a CNR number in Indian courts?":
        "A **CNR (Case Number Record)** is a unique 16-character alphanumeric code assigned to every filing in Indian courts (e.g. DLCT01-004912-2026). It enables seamless tracking of hearing dates, live pipeline scrutiny status, and judicial cause lists across e-Courts systems.",
      "What documents are required for civil petition?":
        "Mandatory documents include: Government identity proof (Aadhaar/Voter ID), verified land ownership extract (7/12 extract or title deed), disputed site survey map/plan, photographic evidence of encroachment, and advocate vakalatnama.",
    },
    advocate: {
      "Review partition deed formats and mutation rules":
        "Partition deeds require accurate geographical coordinates, Talathi mutation record sheets listed as 'Schedule A', clear shares delineated among co-sharers, and notarized signatures before the Sub-Registrar.",
      "Explain document overlap threshold criteria":
        "NyayaFlow calculates semantic similarity across pending court registries. Overlaps exceeding 85% are automatically flagged to prevent vexatious multiple filings for identical causes of action.",
      "Suggest grounds for CPC Order 39 interim injunction":
        "Under CPC Order 39 Rules 1 & 2, plaintiff must establish: (1) Strong prima facie case, (2) Balance of convenience in favor of applicant, and (3) Threat of irreparable injury that cannot be compensated in monetary terms.",
    },
    police: {
      "Suggest BNS sections for cyber fraud and identity theft":
        "Applicable sections under Bharatiya Nyaya Sanhita (BNS) & IT Act:\n- **Section 318 BNS**: Cheating by personation\n- **Section 319 BNS**: Cheating and dishonestly inducing delivery of property\n- **Section 66D IT Act**: Punishment for cheating by personation using computer resource",
      "How are evidence SHA-256 digital hashes calculated?":
        "When files are uploaded, a local SHA-256 checksum is generated immediately on the binary data. This fixed 64-character hexadecimal digest ensures strict tamper-evidence and admissible chain of custody under Section 63 of Bharatiya Sakshya Adhiniyam (BSA).",
      "Checklist for filing chargesheets in magistrate court":
        "Ensure: Accused identity verification, certified seizure panchnama, forensic hash verification certificates, witness Section 180 BNSS statements, and mapped BNS penal sections with investigating officer seal.",
    },
    registrar: {
      "What are the OCR compliance requirements?":
        "The minimum safety threshold is 85% OCR confidence score. Submissions below 85% due to skewed scans, missing notary stamps, or obscured signature blocks must be returned for defect rectification.",
      "Rules for detecting duplicate filings across courts":
        "Filings with overlapping parties, identical survey numbers, or >85% narrative text similarity trigger duplicate alerts. Registrars must review the side-by-side comparison before assigning a CNR.",
      "Protocol for assigning 16-digit CNR numbers":
        "CNR structure: 2-digit State code + 2-digit District code + 4-digit Court establishment code + 6-digit Case sequence number + 2-digit Year (e.g. MHPU020001422026).",
    },
    judge: {
      "Synthesize cause list precedent match criteria":
        "Semantic matching vectorizes incident descriptions and queries High Court / Supreme Court decree databases. High scores (>90%) indicate binding or persuasive precedents regarding boundary demarcations or injunction balance.",
      "Relevant case laws under MLRC Section 143":
        "Section 143 of Maharashtra Land Revenue Code 1966 governs right of way over boundaries. Precedents affirm that revenue authorities cannot determine substantive civil title, which remains the exclusive domain of civil courts.",
      "Structure for drafting interim relief order":
        "A standard interim order specifies: (1) Brief facts, (2) Evaluation of prima facie case & balance of convenience, (3) Status quo or ad-interim injunction operative direction, and (4) Date fixed for respondent objection filing.",
    },
    admin: {
      "How are audit logs and data integrity secured?":
        "Every write and state transition generates an immutable audit ledger entry containing user UUID, role, action timestamp, IP address, and cryptographic SHA-256 state hash.",
      "Explain platform role-based access control (RLS)":
        "Database roles strictly partition data: Citizens see only self-created petitions; Advocates access assigned briefs; Police access FIRs; Registrars see scrutiny queues; Judges view assigned cause lists.",
      "Check server and database cluster health status":
        "Backend operational status is healthy. Resilient persistence mode is active with automated MongoDB synchronization and Tesseract.js OCR processing.",
    },
  };

  const resetChat = () => {
    setMessages([
      {
        id: "init",
        sender: "ai",
        text: initialMessagesByRole[currentRole] || initialMessagesByRole.citizen,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  useEffect(() => {
    resetChat();
  }, [currentRole]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  const cleanSpeechText = (raw: string) => {
    return raw
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#+\s/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/[-*•]\s/g, " ")
      .trim();
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  };

  const speakText = (text: string, msgId: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoiceNotice("Speech synthesis not supported in this browser.");
      setTimeout(() => setVoiceNotice(null), 3000);
      return;
    }

    if (speakingMsgId === msgId) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();
    const cleaned = cleanSpeechText(text);
    const utterance = new SpeechSynthesisUtterance(cleaned);

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.includes("en-IN") ||
        v.name.toLowerCase().includes("india") ||
        v.lang.includes("hi-IN") ||
        v.lang.startsWith("en")
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeakingMsgId(msgId);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsVoiceListening(false);
  };

  const toggleListening = async () => {
    if (isVoiceListening) {
      stopListening();
      return;
    }

    setVoiceNotice(null);

    // 1. In-browser SpeechRecognition
    const SpeechRec =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = "en-IN";

        rec.onstart = () => {
          setIsVoiceListening(true);
        };

        rec.onresult = (evt: any) => {
          let transcript = "";
          for (let i = 0; i < evt.results.length; ++i) {
            transcript += evt.results[i][0].transcript;
          }
          if (transcript) {
            setInputVal(transcript);
          }
        };

        rec.onend = () => {
          setIsVoiceListening(false);
        };

        rec.onerror = (err: any) => {
          console.warn("Speech recognition notice:", err);
          setIsVoiceListening(false);
          if (err.error === "not-allowed") {
            setVoiceNotice("Microphone permission denied.");
            setTimeout(() => setVoiceNotice(null), 3500);
          }
        };

        rec.start();
        recognitionRef.current = rec;
        return;
      } catch (e) {
        console.warn("Speech recognition init error:", e);
      }
    }

    // 2. Fallback to MediaRecorder + Whisper API
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setVoiceNotice("Microphone not supported in this browser.");
        setTimeout(() => setVoiceNotice(null), 3500);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blob.size < 500) return;

        setVoiceNotice("Transcribing speech with Whisper...");
        try {
          const formData = new FormData();
          formData.append("audio", blob, "voice_inquiry.webm");
          formData.append("language", "en");

          const res = await fetch("/api/stt/transcribe", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data?.text) {
            setInputVal(data.text);
            setVoiceNotice(null);
          }
        } catch {
          setVoiceNotice("Could not transcribe speech.");
          setTimeout(() => setVoiceNotice(null), 3000);
        }
      };

      mediaRecorder.start();
      setIsVoiceListening(true);
    } catch (err: any) {
      console.warn("Mic access error:", err);
      setIsVoiceListening(false);
      setVoiceNotice("Microphone permission was denied.");
      setTimeout(() => setVoiceNotice(null), 3500);
    }
  };

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputVal("");
    setIsTyping(true);

    try {
      const historyPayload = nextMessages
        .filter((m) => m.id !== "init")
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }));

      let userName = "";
      let userEmail = "";
      try {
        const stored = localStorage.getItem("nyayaflow_user");
        if (stored) {
          const u = JSON.parse(stored);
          userName = u.fullName || "";
          userEmail = u.email || "";
        }
      } catch {}

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyPayload,
          role: currentRole,
          userName,
          userEmail,
        }),
      });

      if (!res.ok) {
        throw new Error(`API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const replyContent =
        data.reply ||
        answersByRole[currentRole]?.[trimmed] ||
        `Based on your role as ${currentRole.toUpperCase()}, you can use the dashboard options to manage cases. Let me know if you would like me to explain standard procedures.`;

      const aiReply: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: data.model || "Legal Assistant",
      };

      setMessages((prev) => [...prev, aiReply]);
      if (autoSpeak) {
        speakText(replyContent, aiReply.id);
      }
    } catch (err) {
      console.warn("Chat request failed, using instant legal knowledge fallback:", err);
      const roleAnswers = answersByRole[currentRole] || answersByRole.citizen;
      const fallbackText =
        roleAnswers[trimmed] ||
        `Court Assistant (${currentRole.toUpperCase()}): Your query regarding "${trimmed}" has been noted. Please refer to standard procedural guides or relevant statutes on your dashboard.`;

      const aiReply: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: "NyayaFlow Legal System",
      };

      setMessages((prev) => [...prev, aiReply]);
      if (autoSpeak) {
        speakText(fallbackText, aiReply.id);
      }
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const formatText = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      if (!line.trim()) {
        return <span key={idx} className="block h-2" />;
      }

      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
      const displayLine = isBullet ? line.trim().substring(2) : line;

      const parts = displayLine.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-semibold text-ink">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={pIdx}>{part}</span>;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1">
            <span className="text-faint leading-5">•</span>
            <span className="flex-1">{renderedLine}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="my-1">
          {renderedLine}
        </p>
      );
    });
  };

  if (!mounted) return null;

  const roleLabel = ROLE_LABELS[currentRole] || "Citizen";

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open legal assistant"
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 h-11 pl-3.5 pr-4 rounded-full bg-brand text-white text-sm font-medium shadow-lg shadow-black/10 hover:bg-brand-hover transition-colors cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Ask a question</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Legal assistant"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px] h-[min(600px,calc(100dvh-1.5rem))] bg-surface border border-line rounded-xl z-50 flex flex-col shadow-2xl shadow-black/15 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-line flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink">Legal assistant</h2>
                <p className="text-xs text-muted">For {roleLabel.toLowerCase()}s · guidance, not legal advice</p>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoSpeak;
                    setAutoSpeak(next);
                    if (!next) stopSpeaking();
                  }}
                  title={autoSpeak ? "Read replies aloud: on" : "Read replies aloud: off"}
                  aria-label="Toggle reading replies aloud"
                  aria-pressed={autoSpeak}
                  className={`btn btn-ghost btn-icon ${autoSpeak ? "text-brand bg-brand-soft" : ""}`}
                >
                  {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button onClick={resetChat} title="New conversation" aria-label="New conversation" className="btn btn-ghost btn-icon">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    stopSpeaking();
                    stopListening();
                    setIsOpen(false);
                  }}
                  aria-label="Close assistant"
                  className="btn btn-ghost btn-icon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-canvas">
              {messages.map((msg) =>
                msg.sender === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg rounded-br-sm bg-brand text-white px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="max-w-[92%]">
                    <div className="rounded-lg rounded-bl-sm bg-surface border border-line px-3 py-2 text-sm leading-relaxed text-ink-2">
                      {formatText(msg.text)}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-faint">
                      <span>{msg.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => speakText(msg.text, msg.id)}
                        className={`inline-flex items-center gap-1 hover:text-ink cursor-pointer ${speakingMsgId === msg.id ? "text-brand" : ""}`}
                      >
                        {speakingMsgId === msg.id ? <Square className="w-3 h-3 fill-current" /> : <Volume2 className="w-3 h-3" />}
                        {speakingMsgId === msg.id ? "Stop" : "Listen"}
                      </button>
                    </div>
                  </div>
                )
              )}

              {isTyping && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-surface border border-line px-3 py-2 text-sm text-muted">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking…
                </div>
              )}

              {messages.length === 1 && !isTyping && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-medium text-muted">Common questions</p>
                  {(suggestionsByRole[currentRole] || suggestionsByRole.citizen).map((sug) => (
                    <button
                      key={sug}
                      onClick={() => handleSend(sug)}
                      className="block w-full text-left px-3 py-2 rounded-md border border-line bg-surface hover:border-line-strong text-sm text-ink-2 cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {voiceNotice && (
              <div className="px-4 py-2 border-t border-line bg-warning-soft text-xs text-warning flex items-center justify-between">
                <span>{voiceNotice}</span>
                <button type="button" onClick={() => setVoiceNotice(null)} aria-label="Dismiss" className="ml-2 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isVoiceListening && (
              <div className="px-4 py-2 border-t border-line bg-danger-soft text-xs text-danger flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                <span className="font-medium">Listening…</span>
                <button type="button" onClick={stopListening} className="ml-auto font-medium underline cursor-pointer">
                  Done
                </button>
              </div>
            )}

            {/* Input */}
            <form
              className="p-3 border-t border-line flex gap-2 shrink-0"
              onSubmit={(e) => {
                e.preventDefault();
                if (isVoiceListening) stopListening();
                handleSend(inputVal);
              }}
            >
              <input
                type="text"
                placeholder={isVoiceListening ? "Listening…" : "Type your question"}
                value={inputVal}
                disabled={isTyping}
                onChange={(e) => setInputVal(e.target.value)}
                aria-label="Your question"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={toggleListening}
                title={isVoiceListening ? "Stop listening" : "Speak your question"}
                aria-label="Voice input"
                aria-pressed={isVoiceListening}
                className={`btn btn-icon h-10 w-10 border ${isVoiceListening ? "border-danger text-danger bg-danger-soft" : "btn-secondary"}`}
              >
                {isVoiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                type="submit"
                disabled={!inputVal.trim() || isTyping}
                aria-label="Send"
                className="btn btn-primary btn-icon h-10 w-10"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
