import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';
import api from '../../lib/axios';

interface Message {
  _id?: string;
  role: 'system' | 'user';
  content: string;
  feedback?: {
    strengths: string;
    improvements: string;
    modelAnswer: string;
    score: number;
  };
}

export const InterviewSimulator = ({ onClose }: { onClose: () => void }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isOver, setIsOver] = useState(false);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await api.post('/interview/start');
        setSessionId(response.data.session._id);
        setMessages(response.data.session.messages);
      } catch (error) {
        console.error('Failed to start session', error);
      } finally {
        setInitializing(false);
      }
    };
    startSession();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || loading || isOver) return;

    const userMessage = input.trim();
    setInput('');
    
    // Optimistic UI update
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post(`/interview/${sessionId}/message`, { answer: userMessage });
      const updatedSession = response.data.session;
      
      setMessages(updatedSession.messages);
      
      if (updatedSession.status === 'COMPLETED') {
        setIsOver(true);
        setAverageScore(updatedSession.averageScore);
      }
    } catch (error) {
      console.error('Failed to send message', error);
      // Remove optimistic message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-slate-900 font-bold">Setting up interview room...</p>
          <p className="text-slate-500 text-sm mt-2">AI is preparing your first question</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">AI Mock Interview</h2>
              <p className="text-sm text-slate-500">Llama-3 Technical Coach</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors font-medium"
          >
            End Interview
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className="flex-shrink-0 mx-3">
                  {msg.role === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex flex-col space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  
                  {/* Feedback Card (if exists on AI message) */}
                  {msg.feedback && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-full max-w-lg mb-2 text-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-700 flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" /> Feedback on your answer
                        </span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          msg.feedback.score >= 80 ? 'bg-green-100 text-green-700' :
                          msg.feedback.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          Score: {msg.feedback.score}/100
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 flex items-center mb-1 text-xs uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" /> Strengths
                        </span>
                        <p className="text-slate-600">{msg.feedback.strengths}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 flex items-center mb-1 text-xs uppercase tracking-wider">
                          <AlertCircle className="w-3 h-3 mr-1 text-red-500" /> Areas to Improve
                        </span>
                        <p className="text-slate-600">{msg.feedback.improvements}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-100">
                        <span className="font-bold text-slate-700 flex items-center mb-1 text-xs uppercase tracking-wider">
                          <Lightbulb className="w-3 h-3 mr-1 text-amber-500" /> Ideal Answer Structure
                        </span>
                        <p className="text-slate-600 italic">"{msg.feedback.modelAnswer}"</p>
                      </div>
                    </div>
                  )}

                  {/* Actual Text */}
                  <div className={`px-5 py-3 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex flex-row max-w-[80%]">
                <div className="flex-shrink-0 mx-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm shadow-sm px-5 py-4 flex space-x-2 items-center">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          {isOver ? (
            <div className="text-center py-4">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Interview Completed!</h3>
              <p className="text-slate-500 mb-4">Your average technical score was <span className="font-bold text-primary">{averageScore}%</span></p>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <div className="flex space-x-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your answer here... (Shift+Enter for new line)"
                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-24"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-6 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
