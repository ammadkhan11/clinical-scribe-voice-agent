import { useEffect, useMemo, useRef, useState } from "react";
import VapiModule from "@vapi-ai/web";

const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
const GITHUB_REPO_URL = "https://github.com/ammadkhan11/clinical-scribe-voice-agent";

const workflowSteps = [
  {
    step: "Step 1",
    title: "Transcript sent to n8n",
    text: "Vapi forwards the completed call transcript to the automation workflow.",
  },
  {
    step: "Step 2",
    title: "OpenAI generates draft clinical note",
    text: "OpenAI converts the transcript into a structured note for review.",
  },
  {
    step: "Step 3",
    title: "Data saved to Google Sheets",
    text: "The draft note and call details are saved as a patient row.",
  },
  {
    step: "Step 4",
    title: "Clinician reviews the draft",
    text: "A licensed healthcare professional reviews and approves the AI-generated draft.",
  },
];

const roadmapItems = [
  "User signup and organizations",
  "Custom scribe creation",
  "Client-specific intake fields",
  "Phone number and website integration",
  "Dashboard for transcripts and notes",
];

const demoScript =
  "My name is Demo Patient. I have fever and sore throat for three days. The pain is 7 out of 10. I also have mild cough and runny nose. I do not have shortness of breath. I am allergic to nuts. I am not taking any medication.";

const MERGE_WINDOW_MS = 15000;
const ASSISTANT_CLOSING_PHRASE = "prepare this as a draft clinical note for clinician review";
const USER_ENDING_PHRASES = [
  "bye",
  "bye bye",
  "goodbye",
  "thank you bye",
  "that's all",
  "nothing else",
  "i am done",
  "i don't want to continue",
  "please end the call",
  "end the call",
  "stop the call",
];
const ASSISTANT_ENDING_PHRASES = [
  ASSISTANT_CLOSING_PHRASE,
  "call ended",
  "goodbye",
];

function App() {
  const vapiRef = useRef(null);
  const transcriptSectionRef = useRef(null);
  const transcriptBoxRef = useRef(null);
  const idleWarningTimerRef = useRef(null);
  const idleFinalWarningTimerRef = useRef(null);
  const idleEndTimerRef = useRef(null);
  const callActiveRef = useRef(false);
  const endedByInactivityRef = useRef(false);
  const pendingEndCallRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const endCallFallbackTimerRef = useRef(null);
  const [status, setStatus] = useState("Idle");
  const [isCallActive, setIsCallActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState("");
  const [idleNotice, setIdleNotice] = useState("");
  const [endedByInactivity, setEndedByInactivity] = useState(false);

  const missingConfig = useMemo(() => {
    const missing = [];
    if (!publicKey) missing.push("VITE_VAPI_PUBLIC_KEY");
    if (!assistantId) missing.push("VITE_VAPI_ASSISTANT_ID");
    return missing;
  }, []);

  const clearIdleTimers = () => {
    if (idleWarningTimerRef.current) {
      clearTimeout(idleWarningTimerRef.current);
      idleWarningTimerRef.current = null;
    }

    if (idleFinalWarningTimerRef.current) {
      clearTimeout(idleFinalWarningTimerRef.current);
      idleFinalWarningTimerRef.current = null;
    }

    if (idleEndTimerRef.current) {
      clearTimeout(idleEndTimerRef.current);
      idleEndTimerRef.current = null;
    }
  };

  const clearEndCallFallbackTimer = () => {
    if (endCallFallbackTimerRef.current) {
      clearTimeout(endCallFallbackTimerRef.current);
      endCallFallbackTimerRef.current = null;
    }
  };

  const stopCallIntentionally = (statusText = "Call ended") => {
    intentionalStopRef.current = true;
    pendingEndCallRef.current = false;
    callActiveRef.current = false;
    clearEndCallFallbackTimer();
    clearIdleTimers();

    setStatus(statusText);
    setIsCallActive(false);
    setIdleNotice("");

    try {
      vapiRef.current?.stop?.();
    } catch (err) {
      console.error("Failed to stop call intentionally:", err);
    }
  };

  const startIdleTimers = () => {
    clearIdleTimers();

    idleWarningTimerRef.current = setTimeout(() => {
      if (!callActiveRef.current) return;

      setIdleNotice("Are you still there? The call will end soon if no response is detected.");
    }, 12000);

    idleFinalWarningTimerRef.current = setTimeout(() => {
      if (!callActiveRef.current) return;

      setIdleNotice("No response detected. Ending the call soon to avoid an incomplete session.");
    }, 25000);

    idleEndTimerRef.current = setTimeout(() => {
      if (!callActiveRef.current) return;

      endedByInactivityRef.current = true;
      callActiveRef.current = false;
      setEndedByInactivity(true);
      setIdleNotice("Call ended due to inactivity. No clinical note will be saved unless meaningful patient information was provided.");
      setStatus("Call ended due to inactivity");
      setIsCallActive(false);

      try {
        vapiRef.current?.stop?.();
      } catch (err) {
        console.error("Failed to stop inactive call:", err);
      }
    }, 33000);
  };

  const resetIdleTimers = () => {
    if (!callActiveRef.current) return;

    setIdleNotice("");
    startIdleTimers();
  };

  useEffect(() => {
    if (missingConfig.length > 0) {
      setStatus("Error");
      setError(`Missing environment variable${missingConfig.length > 1 ? "s" : ""}: ${missingConfig.join(", ")}.`);

      if (!publicKey) return;
    }

    const VapiClient = VapiModule.default || VapiModule;
    const vapi = new VapiClient(publicKey);
    vapiRef.current = vapi;

    const handleCallStart = () => {
      setStatus("Call active");
      callActiveRef.current = true;
      endedByInactivityRef.current = false;
      intentionalStopRef.current = false;
      pendingEndCallRef.current = false;
      clearEndCallFallbackTimer();
      setIsCallActive(true);
      setError("");
      setIdleNotice("");
      setEndedByInactivity(false);
      startIdleTimers();
    };

    const handleCallEnd = () => {
      clearIdleTimers();
      clearEndCallFallbackTimer();
      callActiveRef.current = false;
      pendingEndCallRef.current = false;
      setIsCallActive(false);

      if (intentionalStopRef.current) {
        intentionalStopRef.current = false;
        setStatus("Call ended");
        return;
      }

      if (endedByInactivityRef.current) {
        setStatus("Call ended due to inactivity");
        return;
      }

      setStatus("Call ended. Clinical note will be processed if enough information was captured.");
      setIdleNotice("");
    };

    const handleMessage = (message) => {
      console.log("Vapi message:", message);

      if (message?.type !== "transcript") return;

      const rawRole = message.role || "speaker";
      const role =
        rawRole === "bot" || rawRole === "assistant"
          ? "assistant"
          : rawRole === "user"
            ? "user"
            : rawRole;

      const text =
        message.transcript ||
        message.message ||
        message.text ||
        "";

      const cleanedText = text.trim();
      if (!cleanedText) return;

      const transcriptType = String(
        message.transcriptType ||
        message.transcript_type ||
        message.status ||
        ""
      ).toLowerCase();

      const isClearlyPartial =
        transcriptType === "partial" ||
        transcriptType === "interim";

      if (isClearlyPartial) return;

      resetIdleTimers();

      const normalizedText = cleanedText
        .toLowerCase()
        .replace(/[’]/g, "'")
        .replace(/[^\w\s']/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const normalizedEndText = normalizedText.replace(/that's/g, "that is");

      const userWantsToEnd =
        role === "user" &&
        USER_ENDING_PHRASES.some((phrase) => {
          const normalizedPhrase = phrase.replace(/that's/g, "that is");
          const phrasePattern = new RegExp(`(^|\\s)${normalizedPhrase.replace(/\s+/g, "\\s+")}(\\s|$)`);
          return phrasePattern.test(normalizedEndText);
        });

      if (userWantsToEnd) {
        pendingEndCallRef.current = true;
        setIdleNotice("Ending call after assistant closes the session.");
        clearEndCallFallbackTimer();
        endCallFallbackTimerRef.current = setTimeout(() => {
          stopCallIntentionally("Call ended");
        }, 5000);
      }

      const assistantClosedSession =
        role === "assistant" &&
        pendingEndCallRef.current &&
        ASSISTANT_ENDING_PHRASES.some((phrase) => normalizedText.includes(phrase));

      if (assistantClosedSession) {
        clearEndCallFallbackTimer();
        endCallFallbackTimerRef.current = setTimeout(() => {
          stopCallIntentionally("Call ended");
        }, 1000);
      }

      setTranscript((prev) => {
        const now = Date.now();
        const last = prev[prev.length - 1];

        if (last && last.role === role && last.text === cleanedText) {
          return prev;
        }

        if (
          last &&
          last.role === role &&
          now - (last.updatedAt || last.createdAt || now) <= MERGE_WINDOW_MS
        ) {
          const combinedText = `${last.text} ${cleanedText}`
            .replace(/\s+/g, " ")
            .trim();

          return [
            ...prev.slice(0, -1),
            {
              ...last,
              text: combinedText,
              updatedAt: now,
              timestamp: new Date().toLocaleTimeString(),
            },
          ];
        }

        return [
          ...prev,
          {
            role,
            text: cleanedText,
            createdAt: now,
            updatedAt: now,
            timestamp: new Date().toLocaleTimeString(),
          },
        ];
      });
    };

    const handleError = (event) => {
      console.error("Vapi call error:", event);

      clearIdleTimers();
      clearEndCallFallbackTimer();
      callActiveRef.current = false;
      setIsCallActive(false);

      if (intentionalStopRef.current) {
        console.error("Vapi error after intentional stop:", event);
        setStatus("Call ended");
        return;
      }

      if (endedByInactivityRef.current) {
        setStatus("Call ended due to inactivity");
        return;
      }

      setStatus("Error");
      setIdleNotice("");
      setError("The call ended unexpectedly. Please try again.");
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("message", handleMessage);
    vapi.on("error", handleError);

    return () => {
      clearIdleTimers();
      clearEndCallFallbackTimer();

      if (typeof vapi.off === "function") {
        vapi.off("call-start", handleCallStart);
        vapi.off("call-end", handleCallEnd);
        vapi.off("message", handleMessage);
        vapi.off("error", handleError);
      }

      try {
        vapi.stop();
      } catch {
        // Ignore cleanup errors from an already-ended call.
      }

      vapiRef.current = null;
    };
  }, [missingConfig]);

  useEffect(() => {
    if (!transcriptBoxRef.current) return;

    requestAnimationFrame(() => {
      if (!transcriptBoxRef.current) return;

      transcriptBoxRef.current.scrollTop =
        transcriptBoxRef.current.scrollHeight;
    });
  }, [transcript]);

  const scrollToTranscriptOnce = () => {
    setTimeout(() => {
      const target =
        transcriptSectionRef.current ||
        document.getElementById("live-transcript-section");

      target?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 500);
  };

  const startCall = async () => {
    setError("");
    setIdleNotice("");
    endedByInactivityRef.current = false;
    callActiveRef.current = false;
    pendingEndCallRef.current = false;
    intentionalStopRef.current = false;
    clearEndCallFallbackTimer();
    setEndedByInactivity(false);

    if (missingConfig.length > 0) {
      setStatus("Error");
      setError(`Missing environment variable${missingConfig.length > 1 ? "s" : ""}: ${missingConfig.join(", ")}.`);
      return;
    }

    if (!vapiRef.current) {
      setStatus("Error");
      setError("Vapi is not ready yet. Refresh the page and try again.");
      return;
    }

    try {
      setStatus("Connecting...");
      setIsCallActive(false);
      setTranscript([]);
      scrollToTranscriptOnce();

      await vapiRef.current.start(assistantId);

      endedByInactivityRef.current = false;
      callActiveRef.current = true;
      setIsCallActive(true);
      setStatus("Call active");
      setError("");
      setIdleNotice("");
      setEndedByInactivity(false);
      startIdleTimers();
    } catch (event) {
      if (endedByInactivityRef.current) {
        setStatus("Call ended due to inactivity");
        return;
      }

      const message =
        event?.message ||
        "Unable to start the voice call. Allow microphone access and confirm your Vapi public key and assistant ID.";

      clearIdleTimers();
      callActiveRef.current = false;
      setStatus("Error");
      setIsCallActive(false);
      setError(message);
    }
  };

  const endCall = () => {
    if (!vapiRef.current) return;

    try {
      clearIdleTimers();
      clearEndCallFallbackTimer();
      callActiveRef.current = false;
      endedByInactivityRef.current = false;
      pendingEndCallRef.current = false;
      intentionalStopRef.current = false;
      vapiRef.current.stop();
      setStatus("Call ended");
      setIsCallActive(false);
      setIdleNotice("");
      setEndedByInactivity(false);
    } catch (event) {
      clearIdleTimers();
      clearEndCallFallbackTimer();
      callActiveRef.current = false;
      pendingEndCallRef.current = false;
      setStatus("Error");
      setIsCallActive(false);
      setIdleNotice("");
      setError(event?.message || "Unable to end the call. Please refresh the page if the call remains active.");
    }
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <a className="brand" href="#top" aria-label="AI Voice Clinical Scribe home">
          <span className="brand-mark">AI</span>
          <span>AI Voice Clinical Scribe</span>
        </a>
        <div className="navbar-actions">
          <a
            className="github-link"
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View project on GitHub"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.33 9.33 0 0 1 12 6.99c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.07 10.07 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
              />
            </svg>
            <span>GitHub</span>
          </a>
          <span className="phase-badge">Phase 1 MVP</span>
        </div>
      </header>

      <main id="top">
        <section className="hero section-grid">
          <div className="hero-copy">
            <p className="eyebrow">Healthcare voice intake demo</p>
            <h1>AI Voice Clinical Scribe</h1>
            <p className="hero-subtitle">
              Voice-based patient intake that generates draft clinical notes for clinician review.
            </p>

            <div className="hero-actions" aria-label="Call controls">
              <button className="primary-button" onClick={startCall} disabled={isCallActive || missingConfig.length > 0}>
                Start Clinical Intake
              </button>
              <button className="secondary-button" onClick={endCall} disabled={!isCallActive}>
                End Call
              </button>
            </div>

            <div className="status-strip" role="status" aria-live="polite">
              <span className={`status-dot ${isCallActive ? "active" : ""}`} />
              <span>Status: {status}</span>
            </div>

            {error ? <div className="error-banner">{error}</div> : null}
          </div>

          <div id="live-transcript-section" className="transcript-card hero-call-card" ref={transcriptSectionRef}>
            <p className="eyebrow">Live browser call</p>
            <h2 id="call-panel-title">Clinical intake session</h2>

            <div className="call-state">
              <div className={`mic-orb ${isCallActive ? "listening" : ""}`}>
                <span />
              </div>
      <div>
        <p className="state-label">Current call status</p>
        <strong>{status}</strong>
      </div>
    </div>

            {idleNotice && (
              <div className={`idle-notice ${endedByInactivity ? "ended" : ""}`}>
                {idleNotice}
              </div>
            )}

            <div className="transcript-box" aria-live="polite" ref={transcriptBoxRef}>
              {transcript.length === 0 ? (
                <p className="empty-transcript">Transcript will appear here during the call.</p>
              ) : (
                transcript.map((item, index) => (
                  <div
                    className={`transcript-message ${item.role?.toLowerCase() === "assistant" ? "assistant" : "user"}`}
                    key={`${item.timestamp || "message"}-${item.role || "speaker"}-${index}`}
                  >
                    <span>{item.role || "speaker"}</span>
                    <p>{item.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="safety-card" aria-label="Medical safety disclaimer">
          <div className="safety-icon">!</div>
          <p>
            This system does not diagnose, prescribe, or replace a licensed clinician. All generated notes are
            AI-generated drafts and must be reviewed and approved by a licensed healthcare professional.
          </p>
        </section>

        <section className="workflow-section" aria-labelledby="workflow-title">
          <div className="section-heading">
            <p className="eyebrow">Backend workflow</p>
            <h2 id="workflow-title">What happens after the call?</h2>
          </div>
          <div className="workflow-grid">
            {workflowSteps.map((item) => (
              <article className="workflow-card" key={item.step}>
                <span>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="demo-section section-grid" aria-labelledby="demo-title">
          <div>
            <p className="eyebrow">Demo instructions</p>
            <h2 id="demo-title">Sample patient script</h2>
            <p>Read this during the intake call to demonstrate symptom capture and downstream note generation.</p>
          </div>
          <blockquote>{demoScript}</blockquote>
        </section>

        <section className="roadmap-section" aria-labelledby="roadmap-title">
          <div className="section-heading">
            <p className="eyebrow">Next build phase</p>
            <h2 id="roadmap-title">Phase 2 roadmap</h2>
          </div>
          <div className="roadmap-list">
            {roadmapItems.map((item) => (
              <div className="roadmap-item" key={item}>
                <span />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer>Built with Vapi, n8n, OpenAI, and Google Sheets</footer>
    </div>
  );
}

export default App;
