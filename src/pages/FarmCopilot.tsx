import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/contexts/FarmContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Send, Plus, Mic, MicOff, FileDown, Trash2, Bot, User as UserIcon, MessageSquare, Square,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { applyBrandedHeader, applyBrandedFooter } from "@/lib/pdf-branding";
import { CopilotActionCard, parseCopilotActions } from "@/components/copilot/CopilotActionCard";

type Msg = { id: string; role: "user" | "assistant"; content: string; created_at?: string };
type Thread = { id: string; title: string; updated_at: string };

const SUGGESTIONS = [
  "How much profit have we made this month?",
  "Which crop is performing best this season?",
  "Forecast my capsicum harvest for the next 30 days.",
  "List all low-stock inventory items I should reorder.",
  "Summarize loan and salary obligations.",
  "Recommend a fertilizer schedule for crops under 40 days.",
  "Generate a monthly farm performance summary.",
  "Which livestock batches are underperforming?",
  "Schedule spraying for my capsicum this Friday.",
  "Create a weekly feeding task for the poultry batch.",
];

export default function FarmCopilot() {
  const { activeFarm } = useFarm();
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadThreads = async () => {
    if (!activeFarm || !user) return;
    const { data } = await supabase
      .from("copilot_threads" as any).select("*")
      .eq("farm_id", activeFarm.id).eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    const list = (data || []) as unknown as Thread[];
    setThreads(list);
    if (!activeId && list.length) setActiveId(list[0].id);
  };

  const loadMessages = async (tid: string) => {
    const { data } = await supabase
      .from("copilot_messages" as any).select("*")
      .eq("thread_id", tid).order("created_at");
    setMessages((data || []) as unknown as Msg[]);
  };

  useEffect(() => { loadThreads(); }, [activeFarm?.id, user?.id]);
  useEffect(() => { if (activeId) loadMessages(activeId); else setMessages([]); }, [activeId]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);
  useEffect(() => { inputRef.current?.focus(); }, [activeId]);

  const newThread = async () => {
    if (!activeFarm || !user) return;
    const { data, error } = await supabase
      .from("copilot_threads" as any)
      .insert({ farm_id: activeFarm.id, user_id: user.id, title: "New conversation" } as any)
      .select().single();
    if (error) { toast({ variant: "destructive", title: "Could not create thread", description: error.message }); return; }
    const t = data as unknown as Thread;
    setThreads((p) => [t, ...p]);
    setActiveId(t.id);
    setMessages([]);
  };

  const deleteThread = async (id: string) => {
    await supabase.from("copilot_threads" as any).delete().eq("id", id);
    setThreads((p) => p.filter((t) => t.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const renameIfNeeded = async (tid: string, firstUserMsg: string) => {
    const t = threads.find((x) => x.id === tid);
    if (!t || t.title !== "New conversation") return;
    const title = firstUserMsg.slice(0, 60);
    await supabase.from("copilot_threads" as any).update({ title } as any).eq("id", tid);
    setThreads((p) => p.map((x) => (x.id === tid ? { ...x, title } : x)));
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming || !activeFarm || !user) return;
    let tid = activeId;
    if (!tid) {
      const { data } = await supabase
        .from("copilot_threads" as any)
        .insert({ farm_id: activeFarm.id, user_id: user.id, title: text.slice(0, 60) } as any)
        .select().single();
      const t = data as unknown as Thread;
      tid = t.id; setActiveId(tid); setThreads((p) => [t, ...p]);
    }

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    setMessages((p) => [...p, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");

    await supabase.from("copilot_messages" as any).insert({ thread_id: tid, role: "user", content: text } as any);
    renameIfNeeded(tid!, text);

    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/farm-copilot`;
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(url, {
        method: "POST",
        signal: abortRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: history, farmId: activeFarm.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((p) => p.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)));
            }
          } catch { /* keepalive */ }
        }
      }

      await supabase.from("copilot_messages" as any).insert({
        thread_id: tid, role: "assistant", content: acc,
      } as any);
      await supabase.from("copilot_threads" as any).update({ updated_at: new Date().toISOString() } as any).eq("id", tid);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        toast({ title: "Stopped" });
      } else {
        toast({ variant: "destructive", title: "AI error", description: e?.message || "Failed to get response" });
        setMessages((p) => p.map((m) => (m.id === assistantId ? { ...m, content: "_Error: " + (e?.message || "failed") + "_" } : m)));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const toggleVoice = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ variant: "destructive", title: "Voice unavailable", description: "Try Chrome or Edge." }); return; }
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.lang = "en-US"; r.interimResults = true; r.continuous = false;
    r.onresult = (e: any) => {
      let txt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setInput((prev) => (prev ? prev + " " : "") + txt);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    r.start(); setListening(true);
  };

  const exportPDF = async () => {
    if (!messages.length) { toast({ title: "Nothing to export" }); return; }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = await applyBrandedHeader(doc, {
      title: "FarmCopilot Conversation",
      subtitle: threads.find((t) => t.id === activeId)?.title || "Conversation",
    });
    doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    for (const m of messages) {
      const label = m.role === "user" ? "You" : "FarmCopilot";
      doc.setFont("helvetica", "bold"); doc.setTextColor(76, 111, 60);
      doc.text(label, 14, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(m.content.replace(/[*_`#>]/g, ""), pageWidth - 28);
      for (const line of lines) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 14, y); y += 5;
      }
      y += 4;
    }
    await applyBrandedFooter(doc, "copilot");
    doc.save(`farmcopilot-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const activeTitle = useMemo(() => threads.find((t) => t.id === activeId)?.title, [threads, activeId]);

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="w-9 h-9 rounded-lg bg-farm-gradient flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </span>
              FarmCopilot
            </h1>
            <p className="text-sm text-muted-foreground">
              Your AI farm analyst. Ask anything about crops, livestock, finances or inventory — and let it schedule and manage tasks for you.
            </p>
          </div>
          <Badge variant="outline" className="gap-1"><Bot className="h-3 w-3" /> Tasks &amp; notes need your confirmation</Badge>
        </div>

        <div className="grid md:grid-cols-[260px_1fr] gap-4 flex-1 min-h-0">
          {/* Threads */}
          <Card className="p-3 flex flex-col min-h-0">
            <Button onClick={newThread} className="w-full mb-2 gap-2"><Plus className="h-4 w-4" /> New chat</Button>
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {threads.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">No conversations yet.</p>
                )}
                {threads.map((t) => (
                  <div key={t.id}
                    className={`group flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-sm transition ${
                      activeId === t.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                    onClick={() => setActiveId(t.id)}>
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate flex-1">{t.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat */}
          <Card className="flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <div className="text-sm font-medium truncate">{activeTitle || "Start a new conversation"}</div>
              <Button size="sm" variant="outline" onClick={exportPDF} className="gap-2">
                <FileDown className="h-4 w-4" /> Export PDF
              </Button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-2xl bg-farm-gradient flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="h-7 w-7 text-white" />
                    </div>
                    <h2 className="font-semibold text-lg">Welcome to FarmCopilot</h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      I analyze your farm data to answer questions, forecast yields and monitor finances. I can also schedule, update and complete tasks — every change waits for your confirmation.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Try asking:</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} onClick={() => sendMessage(s)}
                          className="text-left text-sm p-3 rounded-lg border hover:bg-muted hover:border-primary/40 transition">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-farm-gradient flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 border"
                  }`}>
                    {m.role === "assistant" ? (
                      (() => {
                        const { text, actions } = parseCopilotActions(m.content);
                        return (
                          <>
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1">
                              <ReactMarkdown>{text || (m.content ? "" : "_Thinking…_")}</ReactMarkdown>
                            </div>
                            {activeFarm && actions.map((a, i) => (
                              <CopilotActionCard key={`${m.id}-${i}`} action={a} farmId={activeFarm.id} />
                            ))}
                          </>
                        );
                      })()
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t p-3 space-y-2">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                  }}
                  placeholder="Ask about yields, profit, inventory, livestock, recommendations…"
                  className="min-h-[48px] max-h-32 resize-none"
                  disabled={streaming}
                />
                <Button size="icon" variant={listening ? "destructive" : "outline"} onClick={toggleVoice} title="Voice input">
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                {streaming ? (
                  <Button size="icon" variant="destructive" onClick={stop}><Square className="h-4 w-4" /></Button>
                ) : (
                  <Button size="icon" onClick={() => sendMessage(input)} disabled={!input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                FarmCopilot analyzes your data in real time. Task and note changes are only applied after you confirm them.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
