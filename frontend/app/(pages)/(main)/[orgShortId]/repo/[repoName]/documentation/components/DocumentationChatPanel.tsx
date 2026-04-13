'use client';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { ChatbotOrgContext } from '@/app/components/Chatbot';
import ChatMessageMarkdown from '@/app/components/ChatMessageMarkdown';
import { useDocumentation } from '../context/DocumentationContext';
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
const SUGGESTIONS: {
    label: string;
    prefill: string;
}[] = [
    { label: 'Overview', prefill: 'Give me a high-level overview of what this documentation covers.' },
    { label: 'Explain simply', prefill: 'Explain this in simple terms. What is the main idea?' },
    { label: 'Key concepts', prefill: 'Summarize the key concepts and ideas covered in this documentation.' },
    { label: 'Definitions & terms', prefill: 'What important definitions, terms, or details should I know?' },
    { label: 'Where to begin', prefill: 'What should I read first? Where is the best place to begin?' },
];
function createNewChat(): Chat {
    return {
        id: `chat-${Date.now()}`,
        title: 'New chat',
        messages: [],
    };
}
function formatChatRelativeTime(chat: Chat): string {
    const lastMsg = chat.messages[chat.messages.length - 1];
    const date = lastMsg?.timestamp ? new Date(lastMsg.timestamp) : new Date();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'Now';
    if (diffMins < 60)
        return `${diffMins}m`;
    if (diffHours < 24)
        return `${diffHours}h`;
    if (diffDays < 7)
        return `${diffDays}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function getChatSubtitle(chat: Chat): string {
    const userMessages = chat.messages.filter((m) => m.sender === 'user');
    if (userMessages.length === 0)
        return 'No messages yet';
    const last = userMessages[userMessages.length - 1];
    const text = last.text.trim();
    if (!text)
        return 'No changes';
    return text.length > 24 ? text.slice(0, 24) + '…' : text;
}
function isServerChatId(id: string): boolean {
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
    const content = (m.content ?? m.text ?? '').trim();
    const sender = (m.sender === 'bot' || m.role === 'assistant') ? ('bot' as const) : ('user' as const);
    return {
        id: m.id ?? `msg-${Date.now()}`,
        text: content,
        sender,
        timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
    };
}
function serverChatToChat(server: {
    id: string;
    title?: string;
    messages?: unknown[];
}): Chat {
    const messages = (server.messages ?? []).map((m) => serverMessageToMessage(m as Parameters<typeof serverMessageToMessage>[0]));
    return {
        id: server.id,
        title: server.title ?? 'New chat',
        messages,
    };
}
function buildDocumentationContent(doc: {
    title: string;
    sections: Array<{
        id: string;
        title: string;
        description: string;
        subsections?: Array<{
            id: string;
            title: string;
            description: string;
        }>;
    }>;
} | null): string {
    if (!doc?.sections?.length)
        return '';
    const parts: string[] = [`# ${doc.title}\n`];
    for (const s of doc.sections) {
        parts.push(`## ${s.id}. ${s.title}\n\n${(s.description || '').trimEnd()}\n`);
        if (s.subsections?.length) {
            for (const sub of s.subsections) {
                parts.push(`### ${sub.id}. ${sub.title}\n\n${(sub.description || '').trimEnd()}\n`);
            }
        }
    }
    return parts.join('\n');
}
function TypingIndicator() {
    return (<div className="flex justify-start w-full">
      <div className="w-full py-2 border-l-2 border-[var(--color-primary)]/50 pl-3 text-white/90">
        <span className="inline-flex gap-1 items-center text-sm">
          <span className="w-2 h-2 rounded-full bg-white/70 animate-[typing-bounce_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}/>
          <span className="w-2 h-2 rounded-full bg-white/70 animate-[typing-bounce_1.4s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }}/>
          <span className="w-2 h-2 rounded-full bg-white/70 animate-[typing-bounce_1.4s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }}/>
        </span>
      </div>
    </div>);
}
interface DocumentationChatPanelProps {
    orgContext?: ChatbotOrgContext;
    contextId?: string;
    width?: number;
}
export default function DocumentationChatPanel({ orgContext, contextId, width: propWidth }: DocumentationChatPanelProps) {
    const { data: session, status: sessionStatus } = useSession();
    const userId = session?.user?.id ?? null;
    const { documentation } = useDocumentation();
    const documentationContent = buildDocumentationContent(documentation);
    const [chats, setChats] = useState<Chat[]>(() => [createNewChat()]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [headerIconError, setHeaderIconError] = useState(false);
    const [chatsDrawerOpen, setChatsDrawerOpen] = useState(false);
    const [chatsLoaded, setChatsLoaded] = useState(false);
    const [typewriter, setTypewriter] = useState<{
        messageId: string;
        fullText: string;
        visibleLength: number;
        chatId: string;
    } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const activeChat = activeChatId
        ? chats.find((c) => c.id === activeChatId) ?? chats[0]
        : chats[0];
    const messages = activeChat?.messages ?? [];
    const displayMessages = messages.filter((m) => m.id !== 'welcome');
    const filteredChats = chatSearchQuery.trim()
        ? chats.filter((c) => c.title.toLowerCase().includes(chatSearchQuery.trim().toLowerCase()))
        : chats;
    const panelWidth = propWidth ?? 400;
    useEffect(() => {
        if (sessionStatus === 'loading' || !userId) {
            if (sessionStatus === 'unauthenticated')
                setChatsLoaded(true);
            return;
        }
        if (contextId) {
            setChats([createNewChat()]);
            setActiveChatId(null);
            setChatsLoaded(false);
        }
        let cancelled = false;
        const listUrl = contextId
            ? `/api/chat/list?context_id=${encodeURIComponent(contextId)}`
            : '/api/chat/list';
        (async () => {
            try {
                const res = await fetch(listUrl);
                if (!res.ok || cancelled)
                    return;
                const data = await res.json();
                const list = data.chats ?? [];
                const createBody = contextId
                    ? JSON.stringify({ title: 'New chat', context_id: contextId })
                    : JSON.stringify({ title: 'New chat' });
                if (list.length === 0) {
                    const createRes = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: createBody });
                    if (!createRes.ok || cancelled) {
                        setChatsLoaded(true);
                        return;
                    }
                    const createData = await createRes.json();
                    const chat = createData.chat ? serverChatToChat(createData.chat) : serverChatToChat({ id: createData.chatId ?? createData.chat_id, title: 'New chat', messages: [] });
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
                                    setChats((prev) => prev.map((c) => (c.id === firstId ? full : c)));
                            }
                        }
                        catch {
                        }
                    }
                }
            }
            catch {
            }
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
        const activeExists = activeChatId && chats.some((c) => c.id === activeChatId);
        if (!activeExists)
            setActiveChatId(chats[0].id);
    }, [chats.length]);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    const adjustTextareaHeight = () => {
        const el = inputRef.current;
        if (!el)
            return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    };
    useEffect(() => {
        adjustTextareaHeight();
    }, [inputValue]);
    useEffect(() => {
        scrollToBottom();
    }, [messages.length]);
    useEffect(() => {
        if (!typewriter)
            return;
        const { messageId, fullText, chatId } = typewriter;
        if (typewriter.visibleLength >= fullText.length) {
            setChats((prev) => prev.map((chat) => chat.id === chatId
                ? {
                    ...chat,
                    messages: chat.messages.map((m) => m.id === messageId ? { ...m, text: fullText } : m),
                }
                : chat));
            setTypewriter(null);
            return;
        }
        const t = setTimeout(() => {
            setTypewriter((tw) => !tw ? null : { ...tw, visibleLength: Math.min(tw.visibleLength + TYPEWRITER_CHARS_PER_TICK, tw.fullText.length) });
        }, TYPEWRITER_TICK_MS);
        return () => clearTimeout(t);
    }, [typewriter]);
    const handleNewChat = async () => {
        if (!userId) {
            const newChat = createNewChat();
            setChats((prev) => [newChat, ...prev]);
            setActiveChatId(newChat.id);
            setInputValue('');
            setChatsDrawerOpen(false);
            return;
        }
        try {
            const createBody = contextId
                ? JSON.stringify({ title: 'New chat', context_id: contextId })
                : JSON.stringify({ title: 'New chat' });
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: createBody });
            if (!res.ok)
                throw new Error('Failed to create chat');
            const data = await res.json();
            const chat = data.chat ? serverChatToChat(data.chat) : serverChatToChat({ id: data.chatId ?? data.chat_id, title: 'New chat', messages: [] });
            setChats((prev) => [chat, ...prev]);
            setActiveChatId(chat.id);
            setInputValue('');
            setChatsDrawerOpen(false);
        }
        catch {
            const newChat = createNewChat();
            setChats((prev) => [newChat, ...prev]);
            setActiveChatId(newChat.id);
            setInputValue('');
            setChatsDrawerOpen(false);
        }
    };
    const handleSelectChat = async (chatId: string) => {
        setActiveChatId(chatId);
        setChatsDrawerOpen(false);
        if (!userId || !isServerChatId(chatId))
            return;
        const chat = chats.find((c) => c.id === chatId);
        if (chat && chat.messages.length > 0)
            return;
        try {
            const res = await fetch(`/api/chat/${encodeURIComponent(chatId)}`);
            if (!res.ok)
                return;
            const data = await res.json();
            const full = serverChatToChat(data.chat ?? data);
            setChats((prev) => prev.map((c) => (c.id === chatId ? full : c)));
        }
        catch {
        }
    };
    const handleSuggestionClick = (text: string) => {
        setInputValue(text);
        setTimeout(() => inputRef.current?.focus(), 0);
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
        setChats((prev) => prev.map((chat) => {
            if (chat.id !== activeChat.id)
                return chat;
            const isFirstUserMessage = chat.messages.every((m) => m.sender !== 'user');
            const nextMessages = [...chat.messages, userMessage];
            const title = isFirstUserMessage && chat.title === 'New chat'
                ? userMessage.text.slice(0, 36).trim() + (userMessage.text.length > 36 ? '…' : '')
                : chat.title;
            return { ...chat, messages: nextMessages, title };
        }));
        setIsSending(true);
        let chatIdToUse = activeChat.id;
        try {
            if (userId && !isServerChatId(activeChat.id)) {
                const existingServer = chats.find((c) => isServerChatId(c.id));
                if (existingServer) {
                    chatIdToUse = existingServer.id;
                    setActiveChatId(chatIdToUse);
                    setChats((prev) => prev
                        .filter((c) => c.id !== activeChat.id)
                        .map((c) => (c.id === chatIdToUse ? { ...c, messages: [...c.messages, userMessage] } : c)));
                }
                else {
                    const createRes = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: activeChat.title === 'New chat' ? userMessage.text.slice(0, 36).trim() + (userMessage.text.length > 36 ? '…' : '') : activeChat.title,
                            ...(contextId ? { context_id: contextId } : {}),
                        }),
                    });
                    if (!createRes.ok)
                        throw new Error('Failed to create chat');
                    const createData = await createRes.json();
                    chatIdToUse = createData.chatId ?? createData.chat_id;
                    const newChat = createData.chat ? serverChatToChat(createData.chat) : serverChatToChat({ id: chatIdToUse, title: activeChat.title, messages: [...activeChat.messages, userMessage] });
                    setChats((prev) => prev.map((c) => (c.id === activeChat.id ? { ...newChat, id: chatIdToUse } : c)));
                    setActiveChatId(chatIdToUse);
                }
            }
            if (userId && isServerChatId(chatIdToUse)) {
                const res = await fetch(`/api/chat/${encodeURIComponent(chatIdToUse)}/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: userMessage.text,
                        ...(documentationContent ? { documentation_content: documentationContent } : {}),
                    }),
                });
                const data = await res.json();
                const reply = res.ok ? (data.reply ?? '') : (data.error ?? data.details ?? 'Something went wrong.');
                if (res.ok && data.chat) {
                    const updated = serverChatToChat(data.chat);
                    setChats((prev) => prev.map((c) => (c.id === chatIdToUse ? updated : c)));
                    const lastBot = updated.messages.filter((m) => m.sender === 'bot').pop();
                    if (lastBot) {
                        setTypewriter({ messageId: lastBot.id, fullText: lastBot.text, visibleLength: 0, chatId: chatIdToUse });
                    }
                }
                else {
                    const botMessageId = (Date.now() + 1).toString();
                    const botMessage: Message = {
                        id: botMessageId,
                        text: '',
                        sender: 'bot',
                        timestamp: new Date(),
                    };
                    setChats((prev) => prev.map((c) => (c.id === chatIdToUse ? { ...c, messages: [...c.messages, botMessage] } : c)));
                    setTypewriter({ messageId: botMessageId, fullText: reply, visibleLength: 0, chatId: chatIdToUse });
                }
            }
            else if (!userId) {
                const res = await fetch('/api/chat/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: userMessage.text,
                        history: activeChat.messages
                            .filter((m) => m.sender === 'user' || m.sender === 'bot')
                            .map((m) => ({ role: m.sender === 'user' ? ('user' as const) : ('assistant' as const), content: m.text })),
                        ...(documentationContent ? { documentation_content: documentationContent } : {}),
                    }),
                });
                const data = await res.json();
                const reply = res.ok ? (data.reply ?? '') : (data.error ?? data.details ?? 'Something went wrong.');
                const botMessageId = (Date.now() + 1).toString();
                const botMessage: Message = {
                    id: botMessageId,
                    text: '',
                    sender: 'bot',
                    timestamp: new Date(),
                };
                setChats((prev) => prev.map((chat) => chat.id === (chatIdToUse || activeChat.id) ? { ...chat, messages: [...chat.messages, botMessage] } : chat));
                setTypewriter({ messageId: botMessageId, fullText: reply, visibleLength: 0, chatId: chatIdToUse || activeChat.id });
            }
        }
        catch {
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Failed to send message. Please try again.',
                sender: 'bot',
                timestamp: new Date(),
            };
            setChats((prev) => prev.map((chat) => chat.id === (chatIdToUse || activeChat.id) ? { ...chat, messages: [...chat.messages, botMessage] } : chat));
        }
        finally {
            setIsSending(false);
        }
    };
    return (<div className="h-full flex flex-col bg-[#121215] border-l border-[#262626] flex-shrink-0 overflow-hidden" style={{ width: panelWidth, minWidth: 280 }}>
      
      <div className="bg-[#1a1a1d] border-b border-[#262626] px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {headerIconError ? (<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
          </svg>) : (<img src="/icon.png" alt="NeuroCode" className="w-6 h-6 object-contain" onError={() => setHeaderIconError(true)}/>)}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm">AI Assistant</h3>
          <p className="text-white/60 text-xs">Documentation</p>
        </div>
        <button type="button" onClick={() => setChatsDrawerOpen((prev) => !prev)} className="text-white/50 hover:text-white p-1 rounded cursor-pointer" aria-label={chatsDrawerOpen ? 'Close chats list' : 'Open chats list'}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
        </button>
      </div>

      
      <div className="flex flex-1 flex-col min-h-0 min-w-0 relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {displayMessages.length === 0 ? (<div className="flex flex-col items-center justify-center min-h-[240px] gap-5">
              <p className="doc-chat-welcome-text text-white/70 text-sm text-center">
                Ask me anything about this documentation
              </p>
              <div className="flex flex-col items-center gap-3">
                <div className="flex justify-center gap-2">
                  {SUGGESTIONS.slice(0, 3).map((s, i) => (<button key={i} type="button" onClick={() => handleSuggestionClick(s.prefill)} className="doc-chat-bubble-enter px-3 py-2 rounded-full bg-[#1a1a1d] border border-[#262626] text-white/90 text-xs hover:bg-[#262626] hover:border-white/20 transition-colors cursor-pointer whitespace-nowrap" style={{ animationDelay: `${0.1 + i * 0.07}s` }}>
                      {s.label}
                    </button>))}
                </div>
                <div className="flex justify-center gap-2">
                  {SUGGESTIONS.slice(3, 5).map((s, i) => (<button key={i + 3} type="button" onClick={() => handleSuggestionClick(s.prefill)} className="doc-chat-bubble-enter px-3 py-2 rounded-full bg-[#1a1a1d] border border-[#262626] text-white/90 text-xs hover:bg-[#262626] hover:border-white/20 transition-colors cursor-pointer whitespace-nowrap" style={{ animationDelay: `${0.31 + i * 0.07}s` }}>
                      {s.label}
                    </button>))}
                </div>
              </div>
            </div>) : (<>
              {displayMessages.map((message) => message.sender === 'user' ? (<div key={message.id} className="w-full">
                    <div className="w-full rounded-lg px-4 py-2.5 bg-[#1a1a1d] text-white border border-[#262626]">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    </div>
                  </div>) : (<div key={message.id} className="flex justify-start w-full">
                    <div className="w-full py-2 border-l-2 border-[var(--color-primary)]/50 pl-3 text-white/90 min-w-0">
                      <div className="text-sm">
                        <ChatMessageMarkdown>
                          {typewriter?.messageId === message.id
                    ? typewriter.fullText.slice(0, typewriter.visibleLength)
                    : message.text}
                        </ChatMessageMarkdown>
                        {typewriter?.messageId === message.id && (<span className="inline-block w-2 h-4 ml-0.5 bg-white/80 animate-pulse align-middle" aria-hidden/>)}
                      </div>
                      {typewriter?.messageId !== message.id && (<p className="text-xs mt-1 text-white/50">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>)}
                    </div>
                  </div>))}
              {isSending && <TypingIndicator />}
              <div ref={messagesEndRef}/>
            </>)}
        </div>

        <form onSubmit={handleSend} className="flex-shrink-0 p-3">
          <div className="bg-[#1a1a1d] border border-[#262626] rounded-lg overflow-hidden flex flex-col">
            <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onInput={adjustTextareaHeight} onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (inputValue.trim())
                    handleSend(e as unknown as React.FormEvent);
            }
        }} placeholder="Ask about this documentation..." rows={1} className="w-full bg-transparent px-4 py-3 text-white text-sm placeholder-white/40 focus:outline-none resize-none min-h-[48px] overflow-hidden border-0 rounded-none"/>
            <div className="flex items-center justify-end px-2 py-2">
              <button type="submit" disabled={!inputValue.trim() || isSending} className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer" aria-label="Send message">
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
            <div className="p-2 flex flex-col gap-2 flex-shrink-0">
              <input type="text" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} placeholder="Search chats..." className="w-full bg-[#1a1a1d] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-transparent"/>
              <button type="button" onClick={handleNewChat} className="w-full py-2 rounded-lg text-sm font-medium text-white bg-[#1a1a1d] border border-[#262626] hover:bg-[#262626] transition-colors cursor-pointer">
                New chat
              </button>
            </div>
            <p className="text-white/50 text-xs font-medium px-3 pt-1 pb-1 flex-shrink-0">
              Chats
            </p>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 min-h-0">
              {filteredChats.map((chat) => {
            const isActive = activeChat?.id === chat.id;
            return (<button key={chat.id} type="button" onClick={() => handleSelectChat(chat.id)} className={`w-full text-left rounded-lg px-2 py-2.5 flex items-start gap-2 transition-colors cursor-pointer ${isActive ? 'bg-[#262626]' : 'hover:bg-[#1a1a1d]'}`} title={chat.title}>
                    <span className="flex-shrink-0 mt-0.5 text-white/80 text-xs" aria-hidden>
                      ✔
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isActive ? 'text-white font-medium' : 'text-white/90'}`}>
                        {chat.title}
                      </p>
                      <p className="text-xs text-white/50 truncate mt-0.5">
                        {getChatSubtitle(chat)}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-white/50">
                      {formatChatRelativeTime(chat)}
                    </span>
                  </button>);
        })}
            </div>
          </div>
        </>
      </div>
    </div>);
}
