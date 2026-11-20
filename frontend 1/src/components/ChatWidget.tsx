import { useState, useRef, useEffect } from "react";
import { usePlan } from "@/context/PlanContext";
import { useStartup } from "@/hooks/useStartup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Send, Bot, Sparkles, ShieldCheck, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    role: "user" | "ai";
    text: string;
}

// ── Lightweight Markdown Renderer ────────────────────────────────────────────
const renderInline = (text: string): React.ReactNode[] => {
    // Bold, italic, inline code
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
            return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
            return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
            return <code key={i} className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-xs font-mono">{part.slice(1, -1)}</code>;
        return part;
    });
};

const MarkdownMessage = ({ text }: { text: string }) => {
    const lines = text.split("\n");
    const nodes: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Code block
        if (line.startsWith("```")) {
            const lang = line.slice(3).trim();
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            nodes.push(
                <pre key={i} className="bg-black/10 dark:bg-white/10 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2 whitespace-pre-wrap">
                    <code>{codeLines.join("\n")}</code>
                </pre>
            );
            i++;
            continue;
        }

        // Heading
        const hMatch = line.match(/^(#{1,3})\s+(.+)/);
        if (hMatch) {
            const level = hMatch[1].length;
            const cls = level === 1 ? "text-base font-bold mt-2" : level === 2 ? "text-sm font-bold mt-1.5" : "text-sm font-semibold mt-1";
            nodes.push(<p key={i} className={cls}>{renderInline(hMatch[2])}</p>);
            i++;
            continue;
        }

        // Bullet list
        if (/^[-*•]\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
                items.push(lines[i].replace(/^[-*•]\s/, ""));
                i++;
            }
            nodes.push(
                <ul key={i} className="list-none space-y-1 my-1">
                    {items.map((item, j) => (
                        <li key={j} className="flex gap-2 items-start">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                            <span>{renderInline(item)}</span>
                        </li>
                    ))}
                </ul>
            );
            continue;
        }

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\.\s/, ""));
                i++;
            }
            nodes.push(
                <ol key={i} className="space-y-1 my-1 pl-1">
                    {items.map((item, j) => (
                        <li key={j} className="flex gap-2 items-start">
                            <span className="shrink-0 font-semibold text-primary/80 text-xs mt-0.5">{j + 1}.</span>
                            <span>{renderInline(item)}</span>
                        </li>
                    ))}
                </ol>
            );
            continue;
        }

        // Horizontal rule
        if (/^---+$/.test(line.trim())) {
            nodes.push(<hr key={i} className="border-border/50 my-2" />);
            i++;
            continue;
        }

        // Empty line → small gap
        if (line.trim() === "") {
            nodes.push(<div key={i} className="h-1" />);
            i++;
            continue;
        }

        // Regular paragraph
        nodes.push(<p key={i} className="leading-relaxed">{renderInline(line)}</p>);
        i++;
    }

    return <div className="space-y-0.5 text-sm">{nodes}</div>;
};
// ─────────────────────────────────────────────────────────────────────────────

const RobotEye = ({ className = "" }: { className?: string }) => {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            {/* Outer White Frame */}
            <div className="w-12 h-10 bg-[#f8f9fa] rounded-[14px] flex items-center justify-center shadow-inner overflow-hidden border-2 border-white/50">
                {/* Inner Dark Display */}
                <div className="w-[85%] h-[80%] bg-[#1a1a1a] rounded-[10px] flex items-center justify-center gap-1.5 relative">
                    {/* Glossy Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />

                    {/* Left Eye */}
                    <motion.div
                        className="w-2.5 h-4 bg-[#4ade80] rounded-full shadow-[0_0_8px_#4ade80]"
                        animate={{
                            scaleY: [1, 1, 0.1, 1, 1, 1, 0.1, 1, 1],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            times: [0, 0.45, 0.5, 0.55, 0.6, 0.85, 0.9, 0.95, 1],
                            ease: "easeInOut"
                        }}
                    />
                    {/* Right Eye */}
                    <motion.div
                        className="w-2.5 h-4 bg-[#4ade80] rounded-full shadow-[0_0_8px_#4ade80]"
                        animate={{
                            scaleY: [1, 1, 0.1, 1, 1, 1, 0.1, 1, 1],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            times: [0, 0.45, 0.5, 0.55, 0.6, 0.85, 0.9, 0.95, 1],
                            ease: "easeInOut"
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { activeStartup } = useStartup();
    const { plan } = usePlan();

    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", text: "Hi! I'm **Dude**, your Executive AI Startup Advisor & Co-Founder." },
        { role: "ai", text: "I specialize exclusively in venture guidance, customer validation, moats, and execution. Ask me anything about your startup!" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Update greeting when active startup loads
    useEffect(() => {
        if (activeStartup?.name) {
            setMessages([
                { role: "ai", text: `Hi! I'm **Dude**, your Executive Startup Advisor.` },
                { role: "ai", text: `I am specialized in **${activeStartup.name}**. I can analyze your value proposition, customer acquisition loops, unit economics, or current sprint. Ask me anything!` }
            ]);
        }
    }, [activeStartup?.name]);

    // Quick suggestion prompts
    const quickPrompts = [
        "Critique our core value proposition",
        "How do we get our first 5 reference customers?",
        "What unscalable 48-hr validation test should we run?",
        "Review our pricing & unit economics",
    ];

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async (overrideMsg?: string) => {
        const userMsg = overrideMsg || input;
        if (!userMsg.trim()) return;

        if (!overrideMsg) setInput("");
        setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
        setIsLoading(true);

        try {
            // Build isolated context strictly for the user's active startup
            let context = "";
            if (activeStartup) {
                context += `Startup: ${activeStartup.name}\nVision: ${activeStartup.vision || "Not specified"}\n`;
            }
            if (plan) {
                const allTasks = plan.phases.flatMap(p =>
                    p.days.flatMap(d =>
                        d.tasks.map(t => `- ${t.title} (${t.phase}: ${t.status})`)
                    )
                );

                context += `
Plan Title: ${plan.title}
Summary: ${plan.summary}
Current Progress: ${plan.overallProgress}%
Active Day: ${plan.currentDay}

Top KPIs:
${plan.kpis.map(k => `- ${k.name}: ${k.value}/${k.target}`).join("\n")}

Active Sprints:
${plan.sprints.map(s => `- Week ${s.weekNumber}: ${s.goal} (${s.completed ? 'Done' : 'In Progress'})`).join("\n")}

Key Tasks:
${allTasks.slice(0, 15).join("\n")}${allTasks.length > 15 ? "\n...and more." : ""}
        `.trim();
            }

            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

            // Attempt to fetch from backend
            const response = await fetch(`${backendUrl}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    context: context || "Early stage startup exploration",
                    startup_name: activeStartup?.name || "",
                    startup_vision: activeStartup?.vision || "",
                    startup_phase: (activeStartup as any)?.current_phase || "Validation",
                    startup_id: activeStartup?.id || "",
                    history: messages.slice(-6).map(m => ({ role: m.role, text: m.text })),
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: "Unknown error" }));
                throw new Error(errData.detail || "Failed to get response");
            }

            const data = await response.json();
            setMessages((prev) => [...prev, { role: "ai", text: data.response }]);

        } catch (error: any) {
            console.error("Chat error:", error);
            setMessages((prev) => [...prev, { role: "ai", text: "I apologize, I encountered a temporary connection issue. Please retry in a moment." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-6 w-80 sm:w-96 z-50 shadow-2xl"
                    >
                        <Card className="border-primary/20 bg-background/95 backdrop-blur shadow-2xl overflow-hidden rounded-2xl">
                            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3.5 flex flex-row items-center justify-between border-b">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <div className="scale-50 -ml-3 -mr-3">
                                        <RobotEye />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span>Dude</span>
                                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                                                Advisor
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-normal flex items-center gap-1">
                                            <ShieldCheck className="h-3 w-3 text-emerald-600" /> Confidential & Isolated to Your Startup
                                        </p>
                                    </div>
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setIsOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="h-80 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
                                    {messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            {msg.role === "ai" && (
                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-0.5">
                                                    <Bot className="h-3.5 w-3.5 text-primary" />
                                                </div>
                                            )}
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === "user"
                                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                    : "bg-muted/80 text-foreground border border-border/40 rounded-tl-sm"
                                                    }`}
                                            >
                                                {msg.role === "ai"
                                                    ? <MarkdownMessage text={msg.text} />
                                                    : <p className="text-sm leading-relaxed">{msg.text}</p>
                                                }
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start items-center gap-2">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Bot className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <div className="bg-muted/80 border border-border/40 px-4 py-2.5 rounded-2xl rounded-tl-sm">
                                                <div className="flex gap-1 items-center h-4">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Quick prompt pills */}
                                {messages.length <= 4 && !isLoading && (
                                    <div className="px-3 pb-2 pt-1 border-t border-border/40 bg-muted/10">
                                        <p className="text-[10px] text-muted-foreground font-semibold mb-1 uppercase tracking-wider">
                                            Quick Advisory Questions:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {quickPrompts.slice(0, 3).map((prompt, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSend(prompt)}
                                                    className="text-[11px] px-2 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors text-left flex items-center gap-1 border border-border/40"
                                                >
                                                    <Sparkles className="h-2.5 w-2.5 text-primary" />
                                                    <span>{prompt}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 border-t bg-muted/20 flex gap-2">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                        placeholder="Ask about strategy, validation, GTM..."
                                        className="flex-1 bg-background text-xs sm:text-sm"
                                    />
                                    <Button size="icon" onClick={() => handleSend()} disabled={isLoading || !input.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-transparent shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50 p-0 overflow-hidden"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                drag
                dragMomentum={false}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="scale-100">
                    <RobotEye />
                </div>
            </motion.button>
        </>
    );
}
            </motion.button>
        </>
    );
}


