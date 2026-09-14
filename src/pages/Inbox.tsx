import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { format } from '../utils/date';

interface Chat {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isGroup: boolean;
}

interface Message {
  id: string;
  chatId: string;
  fromMe: boolean;
  body: string;
  timestamp: string;
  type: 'text' | 'image' | 'order' | 'payment_link';
  orderId?: string;
}

export function Inbox() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load chats
  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load messages when chat selected
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadChats() {
    try {
      const data = await api.whatsapp.getChats();
      setChats(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load chats:', error);
      setLoading(false);
    }
  }

  async function loadMessages(chatId: string) {
    try {
      const chat = await api.whatsapp.getChat(chatId);
      if (chat) {
        setMessages(chat.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sending) return;

    setSending(true);
    try {
      await api.whatsapp.sendMessage(selectedChat.id, newMessage);
      setNewMessage('');
      // Reload messages
      await loadMessages(selectedChat.id);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  }

  async function handleTestMessage() {
    setTestMode(true);
    const testChat = {
      id: 'test-chat',
      contactName: 'Cliente Teste',
      contactPhone: '5565999999999',
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      isGroup: false,
    };
    setSelectedChat(testChat);
    setMessages([
      {
        id: '1',
        chatId: 'test-chat',
        fromMe: false,
        body: 'vi no site, tem cabo tipo c?',
        timestamp: new Date().toISOString(),
        type: 'text',
      }
    ]);
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, 'HH:mm');
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return format(date, 'dd/MM');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Carregando conversas...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-surface rounded-lg shadow overflow-hidden">
      {/* Chat list */}
      <div className="w-full lg:w-96 border-r border-gray-200 flex flex-col h-full">
        {/* Search & Test button */}
        <div className="p-4 border-b border-gray-200 flex flex-col gap-2">
          <input
            type="text"
            placeholder="Buscar conversas..."
            className="px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleTestMessage}
            className="w-full bg-green-500 text-white py-2 rounded font-medium hover:bg-green-600 transition"
          >
            🧪 Testar Lia
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">💬</div>
              <p>Nenhuma conversa ainda</p>
              <p className="text-sm mt-1">Conecte o WhatsApp em Ajustes</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {chats.map(chat => (
                <li key={chat.id}>
                  <button
                    onClick={() => {
                      setSelectedChat(chat);
                      api.whatsapp.markRead(chat.id);
                    }}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                      selectedChat?.id === chat.id ? 'bg-green-50 border-r-2 border-green-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium truncate">{chat.contactName}</h4>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatDate(chat.lastMessageTime)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                          {chat.unreadCount > 0 && (
                            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">
                  {selectedChat.isGroup ? '👥' : '👤'}
                </div>
                <div>
                  <h3 className="font-medium">{selectedChat.contactName}</h3>
                  <p className="text-sm text-gray-500">{selectedChat.contactPhone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {selectedChat.isGroup ? 'Grupo' : 'Privado'}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      msg.fromMe
                        ? 'bg-green-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}
                  >
                    {msg.type === 'order' && msg.orderId && (
                      <div className="mb-2 p-2 bg-white/20 rounded text-sm">
                        📦 Pedido: <strong>{msg.orderId}</strong>
                      </div>
                    )}
                    {msg.type === 'payment_link' && (
                      <a 
                        href={msg.body} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block text-sm underline"
                      >
                        💳 Link de pagamento
                      </a>
                    )}
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                    <span className={`text-xs mt-1 block ${msg.fromMe ? 'text-green-100' : 'text-gray-400'} text-right`}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-6 py-2 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 disabled:opacity-50 transition"
                >
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-lg font-medium mb-1">Selecione uma conversa</h3>
              <p className="text-sm">Ou clique em "Testar Lia" para simular</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}