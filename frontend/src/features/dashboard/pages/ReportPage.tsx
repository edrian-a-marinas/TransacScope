// ReportPage.tsx
import { useState, useContext, useEffect, useRef, useCallback } from "react";
import {
  FileText, TrendingUp, TrendingDown, BarChart2, HelpCircle,
  Bot, Send, Loader2, Sparkles, RefreshCw, User,
} from "lucide-react";
import { AuthContext } from "@/features/auth/AuthContext";
import { GenerateReport } from "@/features/dashboard/components/modals";
import type { ReportMode } from "@/features/dashboard/schemas/report";
import api from "@/services/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Domain/accent colors only ─────────────────────────────────────────────────
const C = {
  primary: "hsl(var(--primary))",
  income:  "hsl(var(--income))",
  expense: "hsl(var(--expense))",
};

interface ReportCard {
  mode:        ReportMode;
  label:       string;
  description: string;
  icon:        typeof FileText;
  color:       string;
  bgColor:     string;
}

const reportCards: ReportCard[] = [
  {
    mode:        "income",
    label:       "Income Report",
    description: "View all income transactions, category breakdown, and revenue trends",
    icon:        TrendingUp,
    color:       C.income,
    bgColor:     "hsl(var(--income) / 0.08)",
  },
  {
    mode:        "expense",
    label:       "Expense Report",
    description: "Analyze spending by category, track costs, and identify top expenses",
    icon:        TrendingDown,
    color:       C.expense,
    bgColor:     "hsl(var(--expense) / 0.08)",
  },
  {
    mode:        "combined",
    label:       "Combined Report",
    description: "Full financial summary with net profit, margins, and side-by-side comparison",
    icon:        BarChart2,
    color:       C.primary,
    bgColor:     "hsl(var(--primary) / 0.08)",
  },
];

// ── Tooltip ───────────────────────────────────────────────────────────────────
const TOOLTIP_LINES = [
  "Select a report type, set a date range,",
  "and choose daily, weekly, or monthly grouping.",
  "Results can be downloaded as a PDF.",
  "",
  "• Income — revenue by category",
  "• Expense — spending breakdown",
  "• Combined — net profit & full summary",
];

function InfoTooltip() {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        style={{
          background: "transparent",
          border:     "none",
          padding:    "0.15rem",
          cursor:     "default",
          display:    "flex",
          alignItems: "center",
          color:      "hsl(var(--page-fg-muted))",
          lineHeight: 1,
        }}
        aria-label="Report help"
        tabIndex={0}
      >
        <HelpCircle style={{ width: "0.85rem", height: "0.85rem" }} />
      </button>
      {visible && (
        <div style={{
          position:      "absolute",
          left:          "calc(100% + 8px)",
          top:           "50%",
          transform:     "translateY(-50%)",
          zIndex:        50,
          background:    "hsl(var(--modal-bg))",
          border:        "1px solid hsl(var(--modal-border))",
          borderRadius:  "0.55rem",
          padding:       "0.65rem 0.875rem",
          minWidth:      "230px",
          boxShadow:     "0 8px 24px rgba(0,0,0,0.35)",
          pointerEvents: "none",
        }}>
          <div style={{
            position:    "absolute",
            left:        "-5px",
            top:         "50%",
            transform:   "translateY(-50%)",
            width:       0,
            height:      0,
            borderTop:   "5px solid transparent",
            borderBottom:"5px solid transparent",
            borderRight: "5px solid hsl(var(--modal-border))",
          }} />
          {TOOLTIP_LINES.map((line, i) =>
            line === "" ? (
              <div key={i} style={{ height: "0.4rem" }} />
            ) : (
              <p key={i} style={{
                fontSize:   "0.72rem",
                color:      line.startsWith("•")
                  ? "hsl(var(--modal-fg))"
                  : "hsl(var(--modal-fg-muted))",
                margin:     0,
                lineHeight: 1.6,
                fontWeight: line.startsWith("•") ? 500 : 400,
              }}>
                {line}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Typing animation ──────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 18, active = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) { setDisplayed(text); setDone(true); return; }
    setDisplayed("");
    setDone(false);
    if (!text) { setDone(true); return; }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, active]);

  return { displayed, done };
}

// ── Message bubble ────────────────────────────────────────────────────────────
function AssistantBubble({
  content,
  animate,
  onDone,
}: {
  content: string;
  animate: boolean;
  onDone?: () => void;
}) {
  const { displayed, done } = useTypewriter(content, 14, animate);

  useEffect(() => {
    if (done && onDone) onDone();
  }, [done]);

  return (
    <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
      {/* Avatar */}
      <div style={{
        width:           "1.85rem",
        height:          "1.85rem",
        borderRadius:    "50%",
        background:      "hsl(var(--primary) / 0.12)",
        border:          "1px solid hsl(var(--primary) / 0.25)",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        flexShrink:      0,
        marginTop:       "0.1rem",
      }}>
        <Bot style={{ width: "0.9rem", height: "0.9rem", color: "hsl(var(--primary))" }} />
      </div>
      <div style={{
        background:   "hsl(var(--page-surface))",
        border:       "1px solid hsl(var(--page-border))",
        borderRadius: "0.15rem 0.75rem 0.75rem 0.75rem",
        padding:      "0.65rem 0.875rem",
        maxWidth:     "82%",
        fontSize:     "0.8rem",
        lineHeight:   1.65,
        color:        "hsl(var(--page-fg))",
        whiteSpace:   "pre-wrap",
        wordBreak:    "break-word",
        boxShadow:    "0 1px 3px hsl(0 0% 0% / 0.05)",
      }}>
        {animate ? displayed : content}
        {animate && !done && (
          <span style={{
            display:         "inline-block",
            width:           "2px",
            height:          "0.85em",
            background:      "hsl(var(--primary))",
            marginLeft:      "2px",
            verticalAlign:   "text-bottom",
            animation:       "ts-pulse 0.9s ease-in-out infinite",
          }} />
        )}
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", justifyContent: "flex-end" }}>
      <div style={{
        background:   "hsl(var(--primary))",
        borderRadius: "0.75rem 0.15rem 0.75rem 0.75rem",
        padding:      "0.65rem 0.875rem",
        maxWidth:     "82%",
        fontSize:     "0.8rem",
        lineHeight:   1.65,
        color:        "hsl(0 0% 100%)",
        whiteSpace:   "pre-wrap",
        wordBreak:    "break-word",
        boxShadow:    "0 1px 3px hsl(0 0% 0% / 0.12)",
      }}>
        {content}
      </div>
      <div style={{
        width:          "1.85rem",
        height:         "1.85rem",
        borderRadius:   "50%",
        background:     "hsl(var(--page-surface-sub))",
        border:         "1px solid hsl(var(--page-border))",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
        marginTop:      "0.1rem",
      }}>
        <User style={{ width: "0.9rem", height: "0.9rem", color: "hsl(var(--page-fg-muted))" }} />
      </div>
    </div>
  );
}

// ── Suggestion chips ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What are my top expenses this month?",
  "How is my income trending?",
  "What's my net profit for the last 30 days?",
  "Which category has the most spending?",
];

// ── AI Chat Panel ─────────────────────────────────────────────────────────────
function AIChatPanel() {
  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [contextLoading, setContextLoading] = useState(true);
  const [animatingIdx, setAnimatingIdx] = useState<number | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const hasGreeted  = useRef(false);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, animatingIdx]);

  // Fetch initial greeting via /api/ai/context on mount
  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;

    setContextLoading(true);
    api.get<{ context: string }>("api/ai/context")
      .then(res => {
        // Build a friendly greeting using the context
        const greeting = buildGreeting(res.data.context);
        const firstMsg: ChatMessage = { role: "assistant", content: greeting };
        setMessages([firstMsg]);
        setAnimatingIdx(0);
      })
      .catch(() => {
        const fallback: ChatMessage = {
          role: "assistant",
          content: "Hi! I'm your financial assistant. Ask me anything about your transactions, income, expenses, or financial trends.",
        };
        setMessages([fallback]);
        setAnimatingIdx(0);
      })
      .finally(() => setContextLoading(false));
  }, []);

  function buildGreeting(context: string): string {
    // Extract key numbers for a personalized greeting
    const incomeMatch  = context.match(/Total Income:\s*₱([\d,]+\.\d{2})/);
    const expenseMatch = context.match(/Total Expenses:\s*₱([\d,]+\.\d{2})/);
    const netMatch     = context.match(/Net Profit:\s*₱([\d,]+\.\d{2})/);

    if (incomeMatch && expenseMatch && netMatch) {
      const net    = netMatch[1];
      const isPos  = !context.includes("Net Profit: ₱-") && context.includes("Net Profit:");
      return `Hi! 👋 I'm your TransacScope financial assistant.\n\nIn the last 30 days, your net ${isPos ? "profit" : "loss"} is **₱${net}** — with ₱${incomeMatch[1]} income and ₱${expenseMatch[1]} in expenses.\n\nAsk me anything about your finances — trends, breakdowns, or advice!`;
    }

    return "Hi! 👋 I'm your TransacScope financial assistant. I have access to your last 30 days of financial data.\n\nAsk me about your income, expenses, spending patterns, or anything else financial!";
  }

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput("");
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: msg };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    // History = everything except the very first assistant greeting (keep it small)
    const history = nextMessages.slice(1); // drop greeting to avoid bloat, still pass context

    try {
      const res = await api.post<{ reply: string }>("api/ai/chat", {
        message: msg,
        history: history.slice(-10), // last 10 for context window
      });

      const assistantMsg: ChatMessage = { role: "assistant", content: res.data.reply };
      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        setAnimatingIdx(updated.length - 1);
        return updated;
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleReset() {
    hasGreeted.current = false;
    setMessages([]);
    setAnimatingIdx(null);
    setError(null);
    setInput("");
    setContextLoading(true);

    api.get<{ context: string }>("api/ai/context")
      .then(res => {
        const greeting = buildGreeting(res.data.context);
        setMessages([{ role: "assistant", content: greeting }]);
        setAnimatingIdx(0);
      })
      .catch(() => {
        setMessages([{ role: "assistant", content: "Hi! I'm your financial assistant. Ask me anything about your finances." }]);
        setAnimatingIdx(0);
      })
      .finally(() => setContextLoading(false));
  }

  const isEmpty = messages.length === 0 && !contextLoading;

  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      height:        "100%",
      minHeight:     "520px",
      background:    "hsl(var(--page-surface))",
      border:        "1px solid hsl(var(--page-border))",
      borderRadius:  "0.875rem",
      overflow:      "hidden",
      boxShadow:     "0 1px 4px hsl(220 13% 80% / 0.18)",
    }}>

      {/* ── Header ── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "0.875rem 1.1rem",
        borderBottom:   "1px solid hsl(var(--page-border))",
        background:     "hsl(var(--page-surface-sub))",
        flexShrink:     0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width:          "1.85rem",
            height:         "1.85rem",
            borderRadius:   "0.45rem",
            background:     "hsl(var(--primary) / 0.1)",
            border:         "1px solid hsl(var(--primary) / 0.2)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
          }}>
            <Sparkles style={{ width: "0.9rem", height: "0.9rem", color: "hsl(var(--primary))" }} />
          </div>
          <div>
            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "hsl(var(--page-fg))", margin: 0, lineHeight: 1.2 }}>
              AI Financial Assistant
            </p>
            <p style={{ fontSize: "0.68rem", color: "hsl(var(--page-fg-muted))", margin: 0, lineHeight: 1 }}>
              Powered by Groq · Last 30 days
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          title="Reset conversation"
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            "0.3rem",
            background:     "transparent",
            border:         "1px solid hsl(var(--page-border))",
            borderRadius:   "0.4rem",
            padding:        "0.3rem 0.6rem",
            cursor:         "pointer",
            color:          "hsl(var(--page-fg-muted))",
            fontSize:       "0.7rem",
            transition:     "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "hsl(var(--primary))";
            e.currentTarget.style.color       = "hsl(var(--primary))";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "hsl(var(--page-border))";
            e.currentTarget.style.color       = "hsl(var(--page-fg-muted))";
          }}
        >
          <RefreshCw style={{ width: "0.7rem", height: "0.7rem" }} />
          Reset
        </button>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex:       1,
        overflowY:  "auto",
        padding:    "1rem",
        display:    "flex",
        flexDirection: "column",
        gap:        "0.875rem",
      }}>
        {/* Loading skeleton for initial context fetch */}
        {contextLoading && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
            <div className="ts-skeleton" style={{ width: "1.85rem", height: "1.85rem", borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1, maxWidth: "70%" }}>
              <div className="ts-skeleton" style={{ height: "0.75rem", borderRadius: "0.4rem", width: "80%" }} />
              <div className="ts-skeleton" style={{ height: "0.75rem", borderRadius: "0.4rem", width: "60%" }} />
              <div className="ts-skeleton" style={{ height: "0.75rem", borderRadius: "0.4rem", width: "70%" }} />
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) =>
          msg.role === "assistant" ? (
            <AssistantBubble
              key={idx}
              content={msg.content}
              animate={animatingIdx === idx}
              onDone={() => { if (animatingIdx === idx) setAnimatingIdx(null); }}
            />
          ) : (
            <UserBubble key={idx} content={msg.content} />
          )
        )}

        {/* Loading indicator while waiting for AI reply */}
        {loading && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <div style={{
              width:          "1.85rem",
              height:         "1.85rem",
              borderRadius:   "50%",
              background:     "hsl(var(--primary) / 0.12)",
              border:         "1px solid hsl(var(--primary) / 0.25)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
            }}>
              <Bot style={{ width: "0.9rem", height: "0.9rem", color: "hsl(var(--primary))" }} />
            </div>
            <div style={{
              display:    "flex",
              gap:        "0.3rem",
              alignItems: "center",
              padding:    "0.6rem 0.875rem",
              background: "hsl(var(--page-surface))",
              border:     "1px solid hsl(var(--page-border))",
              borderRadius: "0.15rem 0.75rem 0.75rem 0.75rem",
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width:        "0.35rem",
                  height:       "0.35rem",
                  borderRadius: "50%",
                  background:   "hsl(var(--primary))",
                  display:      "block",
                  animation:    `ts-pulse 1.1s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontSize: "0.74rem", color: "hsl(var(--expense))", textAlign: "center", margin: 0 }}>
            {error}
          </p>
        )}

        {/* Suggestion chips — show only before first user message */}
        {!contextLoading && messages.length === 1 && messages[0].role === "assistant" && animatingIdx === null && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.25rem" }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                style={{
                  background:   "hsl(var(--primary) / 0.07)",
                  border:       "1px solid hsl(var(--primary) / 0.2)",
                  borderRadius: "2rem",
                  padding:      "0.3rem 0.75rem",
                  fontSize:     "0.72rem",
                  color:        "hsl(var(--primary))",
                  cursor:       "pointer",
                  transition:   "background 0.15s, border-color 0.15s",
                  whiteSpace:   "nowrap",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background    = "hsl(var(--primary) / 0.15)";
                  e.currentTarget.style.borderColor   = "hsl(var(--primary) / 0.4)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background    = "hsl(var(--primary) / 0.07)";
                  e.currentTarget.style.borderColor   = "hsl(var(--primary) / 0.2)";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div style={{
        padding:      "0.75rem 1rem",
        borderTop:    "1px solid hsl(var(--page-border))",
        background:   "hsl(var(--page-surface-sub))",
        flexShrink:   0,
      }}>
        <div style={{
          display:      "flex",
          gap:          "0.5rem",
          alignItems:   "flex-end",
          background:   "hsl(var(--page-surface))",
          border:       "1px solid hsl(var(--page-border))",
          borderRadius: "0.65rem",
          padding:      "0.4rem 0.5rem 0.4rem 0.75rem",
          transition:   "border-color 0.15s",
        }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.5)")}
          onBlurCapture={e  => (e.currentTarget.style.borderColor = "hsl(var(--page-border))")}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances…"
            rows={1}
            disabled={loading || contextLoading}
            style={{
              flex:        1,
              background:  "transparent",
              border:      "none",
              outline:     "none",
              resize:      "none",
              fontSize:    "0.8rem",
              color:       "hsl(var(--page-fg))",
              lineHeight:  1.5,
              fontFamily:  "inherit",
              maxHeight:   "6rem",
              overflowY:   "auto",
              paddingTop:  "0.2rem",
            }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 96) + "px";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || contextLoading}
            style={{
              width:          "2rem",
              height:         "2rem",
              borderRadius:   "0.45rem",
              border:         "none",
              background:     (!input.trim() || loading || contextLoading)
                ? "hsl(var(--page-border))"
                : "hsl(var(--primary))",
              color:          (!input.trim() || loading || contextLoading)
                ? "hsl(var(--page-fg-muted))"
                : "white",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              cursor:         (!input.trim() || loading || contextLoading) ? "not-allowed" : "pointer",
              transition:     "background 0.15s, color 0.15s",
              flexShrink:     0,
            }}
          >
            {loading
              ? <Loader2 style={{ width: "0.85rem", height: "0.85rem", animation: "spin 0.8s linear infinite" }} />
              : <Send style={{ width: "0.8rem", height: "0.8rem" }} />
            }
          </button>
        </div>
        <p style={{ fontSize: "0.65rem", color: "hsl(var(--page-fg-muted))", margin: "0.4rem 0 0", textAlign: "center" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { user } = useContext(AuthContext);
  const isAdmin  = user!.role_id === 1;
  const [activeMode,  setActiveMode]  = useState<ReportMode | null>(null);
  const [hoveredCard, setHoveredCard] = useState<ReportMode | null>(null);

  return (
    <>
      <title>Reports</title>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: C.primary }} />
            <h1 className="text-2xl font-bold tracking-tight ts-page-fg">Reports</h1>
            <InfoTooltip />
          </div>
          <p className="text-sm ts-page-fg-light">
            {isAdmin
              ? "Generate financial reports across all users"
              : "Generate your personal financial reports"}
          </p>
        </div>

        {/* ── Top: Report cards (full width, horizontal row) ── */}
        <div>
          <p className="ts-section-title" style={{ margin: "0 0 0.75rem" }}>Generate Reports</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reportCards.map((card) => {
              const Icon    = card.icon;
              const hovered = hoveredCard === card.mode;
              return (
                <button
                  key={card.mode}
                  onClick={() => setActiveMode(card.mode)}
                  onMouseEnter={() => setHoveredCard(card.mode)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="ts-action-card"
                  style={{
                    border:    `1px solid ${hovered ? card.color : "hsl(var(--page-border))"}`,
                    boxShadow: hovered
                      ? `0 4px 16px hsl(0 0% 0% / 0.08), 0 0 0 3px ${card.color}1a`
                      : "0 1px 3px hsl(0 0% 0% / 0.06)",
                    transform: hovered ? "translateY(-2px)" : "none",
                  }}
                >
                  <div style={{
                    width:           "2.5rem",
                    height:          "2.5rem",
                    borderRadius:    "0.5rem",
                    backgroundColor: hovered ? card.color : card.bgColor,
                    display:         "flex",
                    alignItems:      "center",
                    justifyContent:  "center",
                    transition:      "background-color 0.15s",
                    flexShrink:      0,
                  }}>
                    <card.icon style={{
                      width:      "1.1rem",
                      height:     "1.1rem",
                      color:      hovered ? "hsl(0,0%,100%)" : card.color,
                      transition: "color 0.15s",
                    }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold ts-page-fg" style={{ marginBottom: "0.2rem" }}>
                      {card.label}
                    </p>
                    <p className="text-xs ts-page-fg-light" style={{ lineHeight: "1.4" }}>
                      {card.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bottom: AI Chat Panel (full width) ── */}
        <div>
          <p className="ts-section-title" style={{ margin: "0 0 0.75rem" }}>AI Financial Assistant</p>
          <AIChatPanel />
        </div>

      </div>

      {activeMode && (
        <GenerateReport
          reportMode={activeMode}
          onClose={() => setActiveMode(null)}
        />
      )}
    </>
  );
}