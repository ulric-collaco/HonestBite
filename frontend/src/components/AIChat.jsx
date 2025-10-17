import { useState, useRef, useEffect } from 'react'
import { chatWithAgent } from '../services/api'
import './AIChat.css'

function AIChat({ userId, context = {}, placeholder = "Ask me anything about nutrition...", mode = 'default', autoGuidance = false, autoGuidanceOnExpand = false }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [guidanceRequested, setGuidanceRequested] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-request consumption guidance when in guidance mode
  useEffect(() => {
    const shouldAutoRequest = (mode === 'guidance' || autoGuidanceOnExpand) && isExpanded && context?.productInfo && !guidanceRequested && !isLoading
    if (!shouldAutoRequest) return

    const request = async () => {
      setGuidanceRequested(true)
      setIsLoading(true)
      try {
        const response = await chatWithAgent(
          userId,
          'Give a concise, actionable guide on WHEN to consume and HOW MUCH to eat for this product. Use short headings and bullet points. Avoid unrelated analysis. Reply in English only.',
          sessionId,
          { productInfo: context.productInfo, requestType: 'consumption_guidance' }
        )
        if (response.session_id) setSessionId(response.session_id)
        setMessages(prev => ([
          ...prev,
          {
            role: 'assistant',
            content: response.response,
            confidence: response.confidence,
            toolsUsed: response.tools_used,
            timestamp: response.timestamp
          }
        ]))
      } catch (err) {
        console.error('Guidance fetch error:', err)
        setMessages(prev => ([
          ...prev,
          {
            role: 'assistant',
            content: 'Unable to generate guidance right now. Please try again.',
            error: true,
            timestamp: new Date().toISOString()
          }
        ]))
      } finally {
        setIsLoading(false)
      }
    }

    request()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, autoGuidanceOnExpand, isExpanded, context?.productInfo, guidanceRequested, isLoading])

  const sendMessage = async (e) => {
    e.preventDefault()
    
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    // Add user message to chat
    const newMessages = [...messages, { 
      role: 'user', 
      content: userMessage, 
      timestamp: new Date().toISOString() 
    }]
    setMessages(newMessages)

    try {
      const response = await chatWithAgent(userId, userMessage, sessionId, context)
      
      // Update session ID if returned
      if (response.session_id) {
        setSessionId(response.session_id)
      }

      // Add agent response to chat
      setMessages([...newMessages, {
        role: 'assistant',
        content: response.response,
        confidence: response.confidence,
        toolsUsed: response.tools_used,
        timestamp: response.timestamp
      }])

    } catch (error) {
      console.error('Chat error:', error)
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        error: true,
        timestamp: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    setSessionId(null)
  }

  const formatMessage = (content) => {
    // Simple formatting for better readability
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
  }

  const getQuickQuestions = () => {
    if (mode === 'guidance') {
      return [
        'When should I eat this?',
        'How much is a safe portion?',
        'How often can I have it?'
      ]
    }
    return [
      'Is this product healthy for me?',
      'What are the main health concerns?',
      'Can you suggest better alternatives?',
      'Explain the ingredients in simple terms'
    ]
  }

  return (
    <div className={`ai-chat ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="chat-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="chat-title">
          <span className="ai-icon">🤖</span>
          <span>Nutrition Assistant</span>
        </div>
        <button className="toggle-btn" aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}>
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {isExpanded && (
        <div className="chat-content">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="welcome-message">
                <p>👋 Hi! I'm your nutrition assistant. I can help you understand food products, explain health impacts, and suggest healthier alternatives.</p>
                <div className="quick-questions">
                  <p><strong>Quick questions to try:</strong></p>
                  {getQuickQuestions().slice(0, 3).map((question, index) => (
                    <button
                      key={index}
                      className="quick-question"
                      onClick={() => setInputMessage(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-content">
                  <div 
                    className="message-text"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                  {message.toolsUsed && message.toolsUsed.length > 0 && (
                    <div className="tools-used">
                      <small>🔧 Used: {message.toolsUsed.join(', ')}</small>
                    </div>
                  )}
                  {message.confidence && (
                    <div className="confidence">
                      <small>📊 Confidence: {Math.round(message.confidence * 100)}%</small>
                    </div>
                  )}
                </div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message assistant">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {true && (
          <form onSubmit={sendMessage} className="chat-input-form">
            <div className="input-container">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                className="chat-input"
              />
              <button 
                type="submit" 
                disabled={!inputMessage.trim() || isLoading}
                className="send-button"
                aria-label="Send message"
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
            {messages.length > 0 && (
              <button 
                type="button" 
                onClick={clearChat}
                className="clear-chat"
                aria-label="Clear chat"
              >
                🗑️ Clear
              </button>
            )}
          </form>
          )}
        </div>
      )}
    </div>
  )
}

export default AIChat