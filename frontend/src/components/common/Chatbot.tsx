// src/components/common/Chatbot.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Fab,
  Paper,
  Typography,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemText,
  Fade,
  Avatar,
  Divider,
  CircularProgress,
  useTheme,
  styled,
} from '@mui/material';
import {
  SmartToy as RobotIcon,
  Close as CloseIcon,
  Send as SendIcon,
  Person as PersonIcon,
  ClearAll as ClearIcon,
} from '@mui/icons-material';
import { chatbotService } from '../../services/chatbotService';
import { ChatMessage, ChatTurn } from '../../types/chatbot';

const ChatButton = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: 24,
  right: 24,
  zIndex: 1000,
  transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  '&:hover': {
    transform: 'scale(1.1)',
  },
}));

const ChatWindow = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: 96,
  right: 24,
  width: 400,
  height: 600,
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 1000,
  overflow: 'hidden',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  background: theme.palette.mode === 'dark' 
    ? 'rgba(30, 30, 30, 0.95)' 
    : 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  border: `1px solid ${theme.palette.divider}`,
  [theme.breakpoints.down('sm')]: {
    width: 'calc(100vw - 48px)',
    bottom: 88,
  },
}));

const MessageList = styled(List)({
  flexGrow: 1,
  overflowY: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser?: boolean }>(({ theme, isUser }) => ({
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  maxWidth: '85%',
  padding: '10px 16px',
  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
  backgroundColor: isUser 
    ? theme.palette.primary.main 
    : theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  position: 'relative',
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
}));

const Chatbot: React.FC = () => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I'm FinBot, your personal financial assistant. How can I help you with your portfolio today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat history cleared. How else can I help you?",
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to state
    const newUserMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    // Prepare history for API
    const history: ChatTurn[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    // Placeholder for bot response
    const botMsgPlaceholder: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, botMsgPlaceholder]);

    await chatbotService.streamChat(
      userMessage,
      history,
      (chunk) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === 'assistant') {
            lastMsg.content += chunk;
          }
          return newMessages;
        });
      },
      () => {
        setIsLoading(false);
      },
      (error) => {
        console.error('Chatbot error:', error);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: "Sorry, I encountered an error connecting to the AI service. Please check your connection and try again.",
            timestamp: new Date().toISOString(),
          }
        ]);
        setIsLoading(false);
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <ChatButton color="primary" onClick={toggleChat}>
        <RobotIcon />
      </ChatButton>

      <Fade in={isOpen}>
        <ChatWindow elevation={8}>
          {/* Header */}
          <Box sx={{ 
            p: 2, 
            background: theme.palette.primary.main, 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'white' }}>
                <RobotIcon color="primary" />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', lineHeight: 1.2 }}>FinBot AI</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Online · Powered by Llama 3.1</Typography>
              </Box>
            </Box>
            <Box>
              <IconButton size="small" onClick={handleClear} sx={{ color: 'white' }} title="Clear History">
                <ClearIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={toggleChat} sx={{ color: 'white' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Divider />

          {/* Messages */}
          <MessageList>
            {messages.map((msg, index) => (
              <Box 
                key={index} 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  <Avatar 
                    sx={{ 
                      width: 28, 
                      height: 28, 
                      fontSize: '0.8rem',
                      bgcolor: msg.role === 'user' ? theme.palette.secondary.main : theme.palette.grey[400]
                    }}
                  >
                    {msg.role === 'user' ? <PersonIcon fontSize="small" /> : <RobotIcon fontSize="small" />}
                  </Avatar>
                  <MessageBubble isUser={msg.role === 'user'}>
                    <Typography variant="body2">{msg.content}</Typography>
                  </MessageBubble>
                </Box>
                <Typography variant="caption" sx={{ mt: 0.5, opacity: 0.5, mx: 5 }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            ))}
            {isLoading && messages[messages.length - 1].content === '' && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: theme.palette.grey[400] }}>
                  <RobotIcon fontSize="small" />
                </Avatar>
                <Box sx={{ p: 1, bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100], borderRadius: 2 }}>
                  <CircularProgress size={16} color="inherit" />
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </MessageList>

          <Divider />

          {/* Input */}
          <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              placeholder="Ask about your portfolio..."
              multiline
              maxRows={4}
              variant="outlined"
              size="small"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              InputProps={{
                sx: { 
                  borderRadius: 4,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'
                }
              }}
            />
            <IconButton 
              color="primary" 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              sx={{ 
                bgcolor: theme.palette.primary.main, 
                color: 'white',
                '&:hover': { bgcolor: theme.palette.primary.dark },
                '&.Mui-disabled': { bgcolor: theme.palette.grey[300], color: 'white' }
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </ChatWindow>
      </Fade>
    </>
  );
};

export default Chatbot;
