import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJIS = ['😂', '😡', '😎', '😭', '💀', '🔥', '👀', '🤔'];

const Chat = ({ socket, roomId, localPlayerName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleNewMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    };

    socket.on('chat_message', handleNewMessage);
    return () => socket.off('chat_message', handleNewMessage);
  }, [socket, isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      socket.emit('send_chat_message', {
        roomId,
        message: inputValue.trim(),
        senderName: localPlayerName || 'Player'
      });
      setInputValue('');
    }
  };

  const insertEmoji = (emoji) => {
    setInputValue(prev => prev + emoji);
  };

  return (
    <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', zIndex: 5000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              width: '320px',
              height: '400px',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              marginBottom: '1rem',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: 'white', fontSize: '1.1rem' }}>Room Chat</span>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.length === 0 ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', fontStyle: 'italic' }}>No messages yet. Start trolling!</div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderName === localPlayerName;
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={msg.id || idx} 
                      style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
                    >
                      {!isMe && <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '2px', marginLeft: '4px' }}>{msg.senderName}</div>}
                      <div style={{
                        background: isMe ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255, 255, 255, 0.1)',
                        padding: '8px 12px',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        color: 'white',
                        wordBreak: 'break-word',
                        fontSize: '0.95rem'
                      }}>
                        {msg.message}
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Emoji Bar */}
            <div style={{ display: 'flex', gap: '4px', padding: '6px 12px', background: 'rgba(0,0,0,0.2)', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {EMOJIS.map(e => (
                <button 
                  key={e} 
                  onClick={() => insertEmoji(e)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '4px', transition: 'transform 0.1s' }}
                  onMouseOver={ev => ev.target.style.transform = 'scale(1.2)'}
                  onMouseOut={ev => ev.target.style.transform = 'scale(1)'}
                >{e}</button>
              ))}
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} style={{ padding: '12px', display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <input 
                type="text" 
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Type a message..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '8px 16px', color: 'white', outline: 'none' }}
              />
              <button 
                type="submit"
                style={{ background: '#ec4899', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 15px rgba(236, 72, 153, 0.5)',
          position: 'relative'
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        
        {/* Unread Badge */}
        {!isOpen && unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              minWidth: '22px',
              height: '22px',
              borderRadius: '11px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0 4px',
              border: '2px solid #0f172a'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </motion.button>
    </div>
  );
};

export default Chat;
