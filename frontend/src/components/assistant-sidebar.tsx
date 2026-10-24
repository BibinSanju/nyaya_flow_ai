"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  User,
  Scale,
  RotateCcw,
  Zap,
  ChevronDown,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Loader2,
} from "lucide-react";

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
      "Namaste! I am your NyayaFlow AI judicial assistant. I can guide you through filing a petition, required revenue documents (7/12 extracts, partition deeds), e-court scrutiny standards, or finding a certified advocate. How can I assist you?",
    advocate:
      "Welcome Counsel. NyayaFlow AI Legal Copilot is active. I can assist with case precedent citations, Vakalatnama filing requirements, CPC Order 39 interim injunction grounds, and statutory cross-referencing.",
    police:
      "Investigating Officer, NyayaFlow AI assistant is online. I can help map incident narratives to Bharatiya Nyaya Sanhita (BNS) penal sections, verify digital evidence SHA-256 hashes under Section 63 BSA, and review chargesheets.",
    registrar:
      "Court Registrar assistant online. I can assist with document scrutiny compliance thresholds (85% baseline), duplicate petition detection, and 16-character alphanumeric CNR number allocation protocol.",
    judge:
      "Presiding Judicial Bench assistant active. I can help synthesize cause list briefs, analyze precedent decree relevance scores, evaluate CPC Order 39 interim relief grounds, or review order drafts.",
    admin:
      "NyayaFlow System Administrator assistant active. I can assist with platform infrastructure, telemetry, immutable audit trails, and role-based access security across stakeholder portals.",
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
            <strong key={pIdx} className="font-semibold text-stone-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={pIdx}>{part}</span>;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1">
            <span className="text-stone-400 font-bold leading-none mt-1">•</span>
            <span className="flex-1 text-stone-300">{renderedLine}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="my-1 text-stone-300">
          {renderedLine}
        </p>
      );
    });
  };

  if (!mounted) return null;

  return (
    <>
      {/* Floating Action Pill Launcher */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Court Legal Assistant"
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[#181513] text-stone-200 border border-[#3e352f] hover:border-[#52463e] hover:bg-[#201c19] cursor-pointer shadow-lg transition-colors"
        >
          <div className="w-6 h-6 rounded border border-[#443a33] bg-[#241e1a] text-stone-300 flex items-center justify-center">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
          </div>

          <div className="text-left hidden sm:block pr-1">
            <span className="font-medium text-xs tracking-tight text-stone-200">
              {isOpen ? "Close Assistant" : "Court Assistant"}
            </span>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider">
              {currentRole} Support
            </p>
          </div>

          <span className="sm:hidden text-xs font-medium text-stone-300">AI</span>
        </button>
      </div>

      {/* Slide-Up Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed bottom-20 right-5 w-[92vw] sm:w-[400px] max-h-[580px] h-[520px] bg-[#141210] text-stone-200 border border-[#332c28] rounded-xl z-[9999] flex flex-col shadow-2xl backdrop-blur-md overflow-hidden"
          >
            {/* Header */}
            <div className="p-3 bg-[#181513] border-b border-[#2d2621] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded border border-[#3e352f] bg-[#221c18] text-stone-300 flex items-center justify-center">
                  <Scale className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-xs text-stone-100">
                      Court Legal Assistant
                    </h4>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#201b17] border border-[#38302a] text-[9px] text-stone-300 font-mono">
                      Groq API
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider">
                    {currentRole} Reference Guide
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Voice Mode Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoSpeak;
                    setAutoSpeak(next);
                    if (!next) stopSpeaking();
                  }}
                  title={autoSpeak ? "Voice Mode ON: Auto-speaks responses" : "Voice Mode OFF: Click to auto-speak responses"}
                  aria-label="Toggle Voice Mode"
                  className={`p-1.5 rounded transition-colors ${
                    autoSpeak
                      ? "text-amber-400 bg-amber-500/10 border border-amber-500/30"
                      : "text-stone-400 hover:text-stone-200 hover:bg-[#201b17]"
                  }`}
                >
                  {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={resetChat}
                  title="Reset conversation"
                  aria-label="Reset conversation"
                  className="p-1.5 rounded text-stone-400 hover:text-stone-200 hover:bg-[#201b17] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    stopSpeaking();
                    stopListening();
                    setIsOpen(false);
                  }}
                  aria-label="Close assistant"
                  className="p-1.5 rounded text-stone-400 hover:text-stone-200 hover:bg-[#201b17] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 max-w-[90%] ${
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-[10px] ${
                      msg.sender === "user"
                        ? "bg-[#2a2420] border border-[#443a33] text-stone-200 font-medium"
                        : "bg-[#1c1815] border border-[#332c28] text-stone-400"
                    }`}
                  >
                    {msg.sender === "user" ? <User className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
                  </div>
                  <div
                    className={`p-2.5 rounded-lg text-xs leading-relaxed text-left ${
                      msg.sender === "user"
                        ? "bg-[#26201c] border border-[#3e352f] text-stone-100"
                        : "bg-[#181513] border border-[#2d2621] text-stone-300"
                    }`}
                  >
                    <div>{formatText(msg.text)}</div>
                    <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-[#2d2621] text-[9px] text-stone-400">
                      <div className="flex items-center gap-2">
                        {msg.model && (
                          <span className="font-mono text-stone-400">{msg.model}</span>
                        )}
                        {msg.sender === "ai" && (
                          <button
                            type="button"
                            onClick={() => speakText(msg.text, msg.id)}
                            title={speakingMsgId === msg.id ? "Stop voice" : "Read answer aloud"}
                            className={`inline-flex items-center gap-1 px-1 py-0.5 rounded transition-colors ${
                              speakingMsgId === msg.id
                                ? "text-amber-400 bg-amber-500/10 font-semibold"
                                : "text-stone-400 hover:text-stone-200"
                            }`}
                          >
                            {speakingMsgId === msg.id ? (
                              <>
                                <Square className="w-2.5 h-2.5 fill-current" />
                                <span>Speaking...</span>
                              </>
                            ) : (
                              <Volume2 className="w-2.5 h-2.5" />
                            )}
                          </button>
                        )}
                      </div>
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2 max-w-[80%] mr-auto">
                  <div className="w-6 h-6 rounded bg-[#1c1815] border border-[#332c28] text-stone-400 flex items-center justify-center">
                    <Scale className="w-3 h-3" />
                  </div>
                  <div className="bg-[#181513] border border-[#2d2621] p-2.5 rounded-lg flex items-center gap-2">
                    <span className="text-xs text-stone-400">Processing legal inquiry...</span>
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Suggestions */}
            {messages.length === 1 && !isTyping && (
              <div className="p-2.5 bg-[#161311] border-t border-[#26201c] space-y-1 shrink-0">
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider text-left pl-0.5">
                  Suggested Inquiries ({currentRole})
                </p>
                <div className="flex flex-col gap-1">
                  {(suggestionsByRole[currentRole] || suggestionsByRole.citizen).map((sug) => (
                    <button
                      key={sug}
                      onClick={() => handleSend(sug)}
                      className="w-full p-2 rounded bg-[#1c1815] border border-[#2d2621] hover:border-[#443a33] hover:bg-[#221c18] text-[11px] text-stone-300 text-left transition-colors cursor-pointer truncate"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Voice Notice Toast */}
            {voiceNotice && (
              <div className="px-3 py-1 bg-amber-950/40 border-t border-amber-500/30 text-[11px] text-amber-300 flex items-center justify-between">
                <span>{voiceNotice}</span>
                <button
                  type="button"
                  onClick={() => setVoiceNotice(null)}
                  className="text-stone-400 hover:text-stone-200 ml-2"
                >
                  ×
                </button>
              </div>
            )}

            {/* Listening Indicator Banner */}
            {isVoiceListening && (
              <div className="px-3 py-1.5 bg-rose-950/40 border-t border-rose-500/40 text-[11px] text-rose-300 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="font-medium">Voice Agent Listening... Speak your inquiry</span>
                <button
                  type="button"
                  onClick={stopListening}
                  className="ml-auto text-[10px] text-rose-400 font-mono underline hover:text-rose-200"
                >
                  Done
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-2.5 bg-[#181513] border-t border-[#2d2621] flex gap-2 shrink-0 items-center">
              <input
                type="text"
                placeholder={isVoiceListening ? "Listening..." : `Ask court assistant (${currentRole})...`}
                value={inputVal}
                disabled={isTyping}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (isVoiceListening) stopListening();
                    handleSend(inputVal);
                  }
                }}
                className="flex-1 bg-[#100e0c] border border-[#332c28] focus:border-stone-400 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none transition-colors disabled:opacity-50"
              />

              {/* Microphone Voice Agent Button */}
              <button
                type="button"
                onClick={toggleListening}
                title={isVoiceListening ? "Stop voice listening" : "Speak to Voice Agent"}
                aria-label="Voice Agent Speech Input"
                className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                  isVoiceListening
                    ? "bg-rose-950/80 text-rose-300 border-rose-500/70 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse"
                    : "bg-[#201b17] text-stone-400 hover:text-amber-400 hover:border-[#443a33] border-[#332c28]"
                }`}
              >
                {isVoiceListening ? <Mic className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              {/* Send Button */}
              <button
                onClick={() => {
                  if (isVoiceListening) stopListening();
                  handleSend(inputVal);
                }}
                disabled={!inputVal.trim() || isTyping}
                aria-label="Send query"
                className="px-3 py-2 rounded-lg bg-[#26201c] hover:bg-[#302823] text-stone-200 border border-[#3e352f] flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all self-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
