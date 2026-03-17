import { useState, useRef, useEffect } from "react";
import { usePlan } from "@/context/PlanContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Send, Bot } from "lucide-react";
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
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", text: "Hi! I'm **Dude**." },
        { role: "ai", text: "I'm your startup mentor. Ask me anything about your plan!" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { plan } = usePlan();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
        setIsLoading(true);

        try {
            // Build context from the current plan
            let context = "No specific plan loaded yet.";
            if (plan) {
                const allTasks = plan.phases.flatMap(p =>
                    p.days.flatMap(d =>
                        d.tasks.map(t => `- ${t.title} (${t.phase}: ${t.status})`)
                    )
                );

                context = `
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

            // Attempt to fetch from backend
            const response = await fetch("http://localhost:8000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    context: context,
                    message: userMsg,
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
            setMessages((prev) => [...prev, { role: "ai", text: "I'm sorry, I'm having trouble processing your request right now." }]);
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
                        className="fixed bottom-24 right-6 w-80 md:w-96 z-50 shadow-2xl"
                    >
                        <Card className="border-primary/20 bg-background/95 backdrop-blur shadow-2xl overflow-hidden">
                            <CardHeader className="bg-primary/5 p-4 flex flex-row items-center justify-between border-b">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <div className="scale-50 -ml-3 -mr-3">
                                        <RobotEye />
                                    </div>
                                    Dude
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
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
                                                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === "user"
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
                                <div className="p-3 border-t bg-muted/20 flex gap-2">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                        placeholder="Ask about your startup..."
                                        className="flex-1 bg-background"
                                    />
                                    <Button size="icon" onClick={handleSend} disabled={isLoading}>
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


