import { useEffect, useMemo, useRef, useState } from "react";
import VapiModule from "@vapi-ai/web";

const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;

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

function App() {
  const vapiRef = useRef(null);
  const transcriptSectionRef = useRef(null);
  const [status, setStatus] = useState("Idle");
  const [isCallActive, setIsCallActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState("");

  const missingConfig = useMemo(() => {
    const missing = [];
    if (!publicKey) missing.push("VITE_VAPI_PUBLIC_KEY");
    if (!assistantId) missing.push("VITE_VAPI_ASSISTANT_ID");
    return missing;
  }, []);

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
      setIsCallActive(true);
      setError("");
    };

    const handleCallEnd = () => {
      setStatus("Call ended");
      setIsCallActive(false);
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
      const message =
        event?.message ||
        event?.error?.message ||
        "Something went wrong with the voice call. Check microphone permissions and Vapi configuration.";

      setStatus("Error");
      setIsCallActive(false);
      setError(message);
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("message", handleMessage);
    vapi.on("error", handleError);

    return () => {
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
      setStatus("Connecting");
      setTranscript([]);
      scrollToTranscriptOnce();

      await vapiRef.current.start(assistantId);
    } catch (event) {
      const message =
        event?.message ||
        "Unable to start the voice call. Allow microphone access and confirm your Vapi public key and assistant ID.";

      setStatus("Error");
      setIsCallActive(false);
      setError(message);
    }
  };

  const endCall = () => {
    if (!vapiRef.current) return;

    try {
      vapiRef.current.stop();
      setStatus("Call ended");
      setIsCallActive(false);
    } catch (event) {
      setStatus("Error");
      setIsCallActive(false);
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
        <span className="phase-badge">Phase 1 MVP</span>
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

            <div className="transcript-box" aria-live="polite">
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
