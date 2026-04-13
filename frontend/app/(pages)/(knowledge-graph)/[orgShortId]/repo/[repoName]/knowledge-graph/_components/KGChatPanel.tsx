'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import ChatMessageMarkdown from '@/app/components/ChatMessageMarkdown';
import { useKGState } from '../../../../../_lib/useKGState';
const TYPEWRITER_TICK_MS = 8;
const TYPEWRITER_CHARS_PER_TICK = 10;
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}
interface Chat {
    id: string;
    title: string;
    messages: Message[];
}
const SUGGESTIONS_DEFAULT = [
    { label: 'Architecture overview', prefill: 'Give me a high-level overview of this codebase architecture.' },
    { label: 'Entry points', prefill: 'What are the main entry points of this codebase?' },
    { label: 'Key modules', prefill: 'What are the most important modules or files in this codebase?' },
    { label: 'Dependencies', prefill: 'Explain the main dependencies between modules in this codebase.' },
];
const SUGGESTIONS_NODE = (name: string, label: string) => [
    { label: `Explain ${name}`, prefill: `Explain what ${name} (${label}) does.` },
    { label: 'Who calls this?', prefill: `What functions or modules call ${name}?` },
    { label: 'Dependencies', prefill: `What does ${name} depend on?` },
    { label: 'Potential issues', prefill: `Are there any potential issues or improvements for ${name}?` },
];
function createNewChat(): Chat {
    return { id: `chat-${Date.now()}`, title: 'New chat', messages: [] };
}
function formatRelativeTime(chat: Chat): string {
    const lastMsg = chat.messages[chat.messages.length - 1];
    const date = lastMsg?.timestamp ? new Date(lastMsg.timestamp) : new Date();
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1)
        return 'Now';
    if (mins < 60)
        return `${mins}m`;
    const hours = Math.floor(diffMs / 3600000);
    if (hours < 24)
        return `${hours}h`;
    return `${Math.floor(diffMs / 86400000)}d`;
}
function getChatSubtitle(chat: Chat): string {
    const user = chat.messages.filter(m => m.sender === 'user').pop();
    if (!user)
        return 'No messages yet';
    return user.text.length > 28 ? user.text.slice(0, 28) + '…' : user.text;
}
function isServerChatId(id: string) {
    return /^[a-f0-9]{24}$/i.test(id) && !id.startsWith('chat-');
}
function serverMessageToMessage(m: {
    id?: string;
    role?: string;
    content?: string;
    text?: string;
    sender?: string;
    createdAt?: string;
}): Message {
    return {
        id: m.id ?? `msg-${Date.now()}`,
        text: (m.content ?? m.text ?? '').trim(),
        sender: (m.sender === 'bot' || m.role === 'assistant') ? 'bot' : 'user',
        timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
    };
}
function serverChatToChat(server: {
    id: string;
    title?: string;
    messages?: unknown[];
}): Chat {
    return {
        id: server.id,
        title: server.title ?? 'New chat',
        messages: (server.messages ?? []).map(m => serverMessageToMessage(m as Parameters<typeof serverMessageToMessage>[0])),
    };
}
function TypingIndicator() {
    return (<div className="flex justify-start w-full">
            <div className="w-full py-2 border-l-2 border-[var(--color-primary)]/50 pl-3">
                <span className="inline-flex gap-1 items-center text-sm">
                    <span className="w-2 h-2 rounded-full bg-white/70 animate-[typing-bounce_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}/>
                    <span className="w-2 h-2 rounded-full bg-white/70 animate-[typing-bounce_1.4s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }}/>
                    <span className="w-2 h-2 rounded-full bg-white/70 animate-[typing-bounce_1.4s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }}/>
                </span>
            </div>
        </div>);
}
interface KGChatPanelProps {
    orgShortId: string;
    repoFullName: string;
    mongoRepoId: string;
}
export default function KGChatPanel({ orgShortId, repoFullName, mongoRepoId }: KGChatPanelProps) {
    const { data: session, status: sessionStatus } = useSession();
    const userId = session?.user?.id ?? null;
    const { selectedNode } = useKGState();
    const contextId = `kg:${orgShortId}:${repoFullName}`;
    const [panelWidth, setPanelWidth] = useState(380);
    const isResizing = useRef(false);
    const resizeStartX = useRef(0);
    const resizeStartW = useRef(0);
    const [chats, setChats] = useState<Chat[]>(() => [createNewChat()]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [chatsDrawerOpen, setChatsDrawerOpen] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [chatsLoaded, setChatsLoaded] = useState(false);
    const [headerIconError, setHeaderIconError] = useState(false);
    const [typewriter, setTypewriter] = useState<{
        messageId: string;
        fullText: string;
        visibleLength: number;
        chatId: string;
    } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const activeChat = activeChatId
        ? chats.find(c => c.id === activeChatId) ?? chats[0]
        : chats[0];
    const messages = activeChat?.messages ?? [];
    const displayMessages = messages.filter(m => m.id !== 'welcome');
    const filteredChats = chatSearchQuery.trim()
        ? chats.filter(c => c.title.toLowerCase().includes(chatSearchQuery.toLowerCase()))
        : chats;
    const suggestions = selectedNode
        ? SUGGESTIONS_NODE(selectedNode.properties.name, selectedNode.label)
        : SUGGESTIONS_DEFAULT;
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        resizeStartX.current = e.clientX;
        resizeStartW.current = panelWidth;
        const onMove = (ev: MouseEvent) => {
            if (!isResizing.current)
                return;
            const delta = resizeStartX.current - ev.clientX;
            setPanelWidth(Math.max(280, Math.min(700, resizeStartW.current + delta)));
        };
        const onUp = () => {
            isResizing.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [panelWidth]);
    useEffect(() => {
        if (sessionStatus === 'loading' || !userId) {
            if (sessionStatus === 'unauthenticated')
                setChatsLoaded(true);
            return;
        }
        setChats([createNewChat()]);
        setActiveChatId(null);
        setChatsLoaded(false);
        let cancelled = false;
        const listUrl = `/api/chat/list?context_id=${encodeURIComponent(contextId)}`;
        (async () => {
            try {
                const res = await fetch(listUrl);
                if (!res.ok || cancelled)
                    return;
                const data = await res.json();
                const list = data.chats ?? [];
                if (list.length === 0) {
                    const createRes = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: 'New chat', context_id: contextId }),
                    });
                    if (!createRes.ok || cancelled) {
                        setChatsLoaded(true);
                        return;
                    }
                    const createData = await createRes.json();
                    const chat = createData.chat
                        ? serverChatToChat(createData.chat)
                        : serverChatToChat({ id: createData.chatId ?? createData.chat_id, title: 'New chat', messages: [] });
                    if (!cancelled) {
                        setChats([chat]);
                        setActiveChatId(chat.id);
                    }
                }
                else {
                    const loaded = list.map((c: {
                        id: string;
                        title?: string;
                    }) => ({ id: c.id, title: c.title ?? 'New chat', messages: [] as Message[] }));
                    if (!cancelled) {
                        setChats(loaded);
                        setActiveChatId(loaded[0]?.id ?? null);
                    }
                    const firstId = loaded[0]?.id;
                    if (firstId && !cancelled) {
                        try {
                            const getRes = await fetch(`/api/chat/${encodeURIComponent(firstId)}`);
                            if (getRes.ok) {
                                const getData = await getRes.json();
                                const full = serverChatToChat(getData.chat ?? getData);
                                if (!cancelled)
                                    setChats(prev => prev.map(c => c.id === firstId ? full : c));
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }
            finally {
                if (!cancelled)
                    setChatsLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [userId, sessionStatus, contextId]);
    useEffect(() => {
        if (chats.length === 0)
            return;
        const exists = activeChatId && chats.some(c => c.id === activeChatId);
        if (!exists)
            setActiveChatId(chats[0].id);
    }, [chats.length]);
    const adjustTextareaHeight = () => {
        const el = inputRef.current;
        if (!el)
            return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    };
    useEffect(() => { adjustTextareaHeight(); }, [inputValue]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
    useEffect(() => {
        if (!typewriter)
            return;
        const { messageId, fullText, chatId } = typewriter;
        if (typewriter.visibleLength >= fullText.length) {
            setChats(prev => prev.map(chat => chat.id === chatId
                ? { ...chat, messages: chat.messages.map(m => m.id === messageId ? { ...m, text: fullText } : m) }
                : chat));
            setTypewriter(null);
            return;
        }
        const t = setTimeout(() => {
            setTypewriter(tw => !tw ? null : { ...tw, visibleLength: Math.min(tw.visibleLength + TYPEWRITER_CHARS_PER_TICK, tw.fullText.length) });
        }, TYPEWRITER_TICK_MS);
        return () => clearTimeout(t);
    }, [typewriter]);
    const handleNewChat = async () => {
        if (!userId) {
            const chat = createNewChat();
            setChats(prev => [chat, ...prev]);
            setActiveChatId(chat.id);
            setInputValue('');
            setChatsDrawerOpen(false);
            return;
        }
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New chat', context_id: contextId }),
            });
            if (!res.ok)
                throw new Error();
            const data = await res.json();
            const chat = data.chat ? serverChatToChat(data.chat) : serverChatToChat({ id: data.chatId ?? data.chat_id, title: 'New chat', messages: [] });
            setChats(prev => [chat, ...prev]);
            setActiveChatId(chat.id);
            setInputValue('');
            setChatsDrawerOpen(false);
        }
        catch {
            const chat = createNewChat();
            setChats(prev => [chat, ...prev]);
            setActiveChatId(chat.id);
            setInputValue('');
            setChatsDrawerOpen(false);
        }
    };
    const handleSelectChat = async (chatId: string) => {
        setActiveChatId(chatId);
        setChatsDrawerOpen(false);
        if (!userId || !isServerChatId(chatId))
            return;
        const existing = chats.find(c => c.id === chatId);
        if (existing && existing.messages.length > 0)
            return;
        try {
            const res = await fetch(`/api/chat/${encodeURIComponent(chatId)}`);
            if (!res.ok)
                return;
            const data = await res.json();
            const full = serverChatToChat(data.chat ?? data);
            setChats(prev => prev.map(c => c.id === chatId ? full : c));
        }
        catch { }
    };
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !activeChat || isSending)
            return;
        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputValue.trim(),
            sender: 'user',
            timestamp: new Date(),
        };
        setInputValue('');
        setChats(prev => prev.map(chat => {
            if (chat.id !== activeChat.id)
                return chat;
            const isFirst = chat.messages.every(m => m.sender !== 'user');
            return {
                ...chat,
                messages: [...chat.messages, userMessage],
                title: isFirst && chat.title === 'New chat'
                    ? userMessage.text.slice(0, 36) + (userMessage.text.length > 36 ? '…' : '')
                    : chat.title,
            };
        }));
        setIsSending(true);
        let chatIdToUse = activeChat.id;
        try {
            if (userId && !isServerChatId(activeChat.id)) {
                const existing = chats.find(c => isServerChatId(c.id));
                if (existing) {
                    chatIdToUse = existing.id;
                    setActiveChatId(chatIdToUse);
                    setChats(prev => prev.filter(c => c.id !== activeChat.id).map(c => c.id === chatIdToUse ? { ...c, messages: [...c.messages, userMessage] } : c));
                }
                else {
                    const createRes = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: activeChat.title === 'New chat' ? userMessage.text.slice(0, 36).trim() + (userMessage.text.length > 36 ? '…' : '') : activeChat.title,
                            context_id: contextId,
                        }),
                    });
                    if (!createRes.ok)
                        throw new Error('Failed to create chat');
                    const createData = await createRes.json();
                    chatIdToUse = createData.chatId ?? createData.chat_id;
                    const newChat = createData.chat
                        ? serverChatToChat(createData.chat)
                        : serverChatToChat({ id: chatIdToUse, title: activeChat.title, messages: [...activeChat.messages, userMessage] });
                    setChats(prev => prev.map(c => c.id === activeChat.id ? { ...newChat, id: chatIdToUse } : c));
                    setActiveChatId(chatIdToUse);
                }
            }
            const currentChatId = chatIdToUse || activeChat.id;
            const botId = (Date.now() + 1).toString();
            setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: [...c.messages, { id: botId, text: '', sender: 'bot' as const, timestamp: new Date() }] }
                : c));
            const historyForAgent = activeChat.messages
                .filter(m => m.sender === 'user' || m.sender === 'bot')
                .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
            let selectedNodeCtx = '';
            if (selectedNode) {
                const p = selectedNode.properties;
                selectedNodeCtx = [
                    `Name: ${p.name}`,
                    `Type: ${selectedNode.label}`,
                    p.filePath ? `File: ${p.filePath}` : '',
                    p.startLine ? `Lines: ${p.startLine}–${p.endLine ?? p.startLine}` : '',
                ].filter(Boolean).join('\n');
            }
            const res = await fetch(`/api/knowledge-graph/${encodeURIComponent(mongoRepoId)}/agent-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.text,
                    history: historyForAgent,
                    selected_node_context: selectedNodeCtx || undefined,
                    chat_id: isServerChatId(chatIdToUse) ? chatIdToUse : undefined,
                }),
            });
            if (!res.ok || !res.body) {
                throw new Error(`Agent request failed (HTTP ${res.status})`);
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) {
                    if (!line.startsWith('data: '))
                        continue;
                    try {
                        const event = JSON.parse(line.slice(6)) as {
                            type: string;
                            reply?: string;
                            message?: string;
                            query?: string;
                            preview?: string;
                        };
                        if (event.type === 'done') {
                            const reply = (event.reply ?? '').trim() || 'No response generated.';
                            setTypewriter({ messageId: botId, fullText: reply, visibleLength: 0, chatId: currentChatId });
                        }
                        else if (event.type === 'error') {
                            const errText = event.message || 'Something went wrong.';
                            setChats(prev => prev.map(c => c.id === currentChatId
                                ? { ...c, messages: c.messages.map(m => m.id === botId ? { ...m, text: errText } : m) }
                                : c));
                        }
                    }
                    catch { }
                }
            }
        }
        catch {
            const currentChatId = chatIdToUse || activeChat.id;
            const botId = (Date.now() + 2).toString();
            setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: [...c.messages, { id: botId, text: 'Failed to send message. Please try again.', sender: 'bot' as const, timestamp: new Date() }] }
                : c));
        }
        finally {
            setIsSending(false);
        }
    };
    return (<div className="absolute top-14 right-4 bottom-4 z-20 flex flex-col bg-[#121215] border border-[#262626] rounded-xl shadow-2xl shadow-black/50 overflow-hidden" style={{ width: panelWidth }}>
            
            <div onMouseDown={handleResizeStart} className="absolute top-0 left-0 bottom-0 w-1.5 z-10 cursor-ew-resize group">
                <div className="absolute inset-y-0 left-0 w-px bg-[#262626] group-hover:w-1 group-hover:bg-[var(--color-primary)]/40 transition-all duration-150"/>
            </div>

            
            <div className="bg-[#1a1a1d] border-b border-[#262626] px-4 py-3 flex items-center gap-3 shrink-0">
                {headerIconError ? (<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                    </svg>) : (<img src="/icon.png" alt="NeuroCode" className="w-6 h-6 object-contain" onError={() => setHeaderIconError(true)}/>)}
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm">AI Assistant</h3>
                    <p className="text-white/60 text-xs truncate">
                        {selectedNode ? `${selectedNode.label}: ${selectedNode.properties.name}` : 'Knowledge Graph'}
                    </p>
                </div>
                <button type="button" onClick={() => setChatsDrawerOpen(v => !v)} className="text-white/50 hover:text-white p-1 rounded cursor-pointer" aria-label="Toggle chats">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                    </svg>
                </button>
            </div>

            
            <div className="flex flex-1 flex-col min-h-0 min-w-0 relative">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                    {displayMessages.length === 0 ? (<div className="flex flex-col items-center justify-center min-h-[200px] gap-5">
                            <p className="text-white/60 text-sm text-center leading-relaxed">
                                {selectedNode
                ? `Ask me about ${selectedNode.properties.name}`
                : 'Ask me anything about this codebase'}
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {suggestions.map((s, i) => (<button key={i} type="button" onClick={() => { setInputValue(s.prefill); setTimeout(() => inputRef.current?.focus(), 0); }} className="px-3 py-2 rounded-full bg-[#1a1a1d] border border-[#262626] text-white/80 text-xs hover:bg-[#262626] hover:border-white/20 transition-colors cursor-pointer">
                                        {s.label}
                                    </button>))}
                            </div>
                        </div>) : (<>
                            {displayMessages.map(msg => msg.sender === 'user' ? (<div key={msg.id} className="w-full">
                                        <div className="w-full rounded-lg px-4 py-2.5 bg-[#1a1a1d] text-white border border-[#262626]">
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    </div>) : (<div key={msg.id} className="flex justify-start w-full">
                                        <div className="w-full py-2 border-l-2 border-[var(--color-primary)]/50 pl-3 text-white/90 min-w-0">
                                            <div className="text-sm">
                                                <ChatMessageMarkdown>
                                                    {typewriter?.messageId === msg.id
                    ? typewriter.fullText.slice(0, typewriter.visibleLength)
                    : msg.text}
                                                </ChatMessageMarkdown>
                                                {typewriter?.messageId === msg.id && (<span className="inline-block w-2 h-4 ml-0.5 bg-white/80 animate-pulse align-middle" aria-hidden/>)}
                                            </div>
                                            {typewriter?.messageId !== msg.id && (<p className="text-xs mt-1 text-white/40">
                                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>)}
                                        </div>
                                    </div>))}
                            {isSending && <TypingIndicator />}
                            <div ref={messagesEndRef}/>
                        </>)}
                </div>

                
                <form onSubmit={handleSend} className="shrink-0 p-3">
                    <div className="bg-[#1a1a1d] border border-[#262626] rounded-lg overflow-hidden flex flex-col">
                        <textarea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onInput={adjustTextareaHeight} onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (inputValue.trim())
                    handleSend(e as unknown as React.FormEvent);
            }
        }} placeholder={selectedNode ? `Ask about ${selectedNode.properties.name}...` : 'Ask about this codebase...'} rows={1} className="w-full bg-transparent px-4 py-3 text-white text-sm placeholder-white/40 focus:outline-none resize-none min-h-[48px] overflow-hidden border-0 rounded-none"/>
                        <div className="flex items-center justify-end px-2 py-2">
                            <button type="submit" disabled={!inputValue.trim() || isSending} className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                                {isSending ? (<span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>) : (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                                    </svg>)}
                            </button>
                        </div>
                    </div>
                </form>

                
                <>
                    <div role="presentation" onClick={() => setChatsDrawerOpen(false)} className={`absolute inset-0 bg-black/50 z-10 transition-opacity duration-300 ${chatsDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} aria-hidden/>
                    <div className={`absolute top-0 right-0 bottom-0 w-[220px] bg-[#0d0d0f] border-l border-[#262626] shadow-xl z-20 flex flex-col transition-transform duration-300 ease-out ${chatsDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        <div className="p-2 flex flex-col gap-2 shrink-0">
                            <input type="text" value={chatSearchQuery} onChange={e => setChatSearchQuery(e.target.value)} placeholder="Search chats..." className="w-full bg-[#1a1a1d] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-transparent"/>
                            <button type="button" onClick={handleNewChat} className="w-full py-2 rounded-lg text-sm font-medium text-white bg-[#1a1a1d] border border-[#262626] hover:bg-[#262626] transition-colors cursor-pointer">
                                New chat
                            </button>
                        </div>
                        <p className="text-white/50 text-xs font-medium px-3 pt-1 pb-1 shrink-0">Chats</p>
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 min-h-0">
                            {filteredChats.map(chat => {
            const isActive = activeChat?.id === chat.id;
            return (<button key={chat.id} type="button" onClick={() => handleSelectChat(chat.id)} className={`w-full text-left rounded-lg px-2 py-2.5 flex items-start gap-2 transition-colors cursor-pointer ${isActive ? 'bg-[#262626]' : 'hover:bg-[#1a1a1d]'}`}>
                                        <span className="shrink-0 mt-0.5 text-white/80 text-xs">✔</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm truncate ${isActive ? 'text-white font-medium' : 'text-white/90'}`}>{chat.title}</p>
                                            <p className="text-xs text-white/50 truncate mt-0.5">{getChatSubtitle(chat)}</p>
                                        </div>
                                        <span className="shrink-0 text-xs text-white/50">{formatRelativeTime(chat)}</span>
                                    </button>);
        })}
                        </div>
                    </div>
                </>
            </div>
        </div>);
}
