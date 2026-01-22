'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Sparkles,
  Target,
  ArrowRight,
  Star
} from 'lucide-react'

interface StarAnalysis {
  situation: { present: boolean; feedback: string }
  task: { present: boolean; feedback: string }
  action: { present: boolean; feedback: string }
  result: { present: boolean; feedback: string }
}

interface Evaluation {
  star_analysis: StarAnalysis
  score: number
  strengths: string[]
  improvements: string[]
  improved_answer_snippet: string
}

interface InterviewMessage {
  type: 'interviewer' | 'candidate' | 'feedback'
  content: string
  evaluation?: Evaluation
  category?: string
}

const CATEGORIES = [
  { id: 'leadership', label: 'Leadership', emoji: '👑' },
  { id: 'problem_solving', label: 'Problem Solving', emoji: '🧩' },
  { id: 'teamwork', label: 'Teamwork', emoji: '🤝' },
  { id: 'adaptability', label: 'Adaptability', emoji: '🔄' },
  { id: 'communication', label: 'Communication', emoji: '💬' },
  { id: 'pressure', label: 'Under Pressure', emoji: '⚡' },
]

export default function InterviewPractice() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [messages, setMessages] = useState<InterviewMessage[]>([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentCategory, setCurrentCategory] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const recognitionRef = useRef<any>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Text-to-speech
  const speak = useCallback((text: string) => {
    if (!ttsEnabled || typeof window === 'undefined') return
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.volume = 1
    
    // Try to get a natural voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v => 
      v.name.includes('Samantha') || 
      v.name.includes('Google') || 
      v.name.includes('Natural')
    ) || voices[0]
    
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    
    speechSynthRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [ttsEnabled])

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  // WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    setIsConnecting(true)
    setError(null)
    
    const ws = new WebSocket('ws://localhost:8001/ws/interview')
    
    ws.onopen = () => {
      setIsConnected(true)
      setIsConnecting(false)
      console.log('Interview WebSocket connected')
    }
    
    ws.onclose = () => {
      setIsConnected(false)
      setIsConnecting(false)
      console.log('Interview WebSocket disconnected')
    }
    
    ws.onerror = (e) => {
      console.error('WebSocket error:', e)
      setError('Failed to connect to interview service')
      setIsConnecting(false)
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleMessage(data)
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    }
    
    wsRef.current = ws
  }, [])

  const disconnect = useCallback(() => {
    stopSpeaking()
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
    setMessages([])
    setCurrentQuestion('')
    setCurrentCategory('')
  }, [stopSpeaking])

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'question':
        setCurrentQuestion(data.question)
        setCurrentCategory(data.category)
        setMessages(prev => [...prev, {
          type: 'interviewer',
          content: data.question,
          category: data.category
        }])
        speak(data.question)
        break
        
      case 'evaluating':
        setIsEvaluating(true)
        break
        
      case 'evaluation_progress':
        // Could show streaming progress here
        break
        
      case 'evaluation_complete':
        setIsEvaluating(false)
        setMessages(prev => [...prev, {
          type: 'feedback',
          content: 'Evaluation complete',
          evaluation: data.data
        }])
        
        // Speak a summary
        if (data.data?.score) {
          const summary = `You scored ${data.data.score} out of 10. ${data.data.strengths?.[0] || ''}`
          speak(summary)
        }
        break
        
      case 'followup':
        setCurrentQuestion(data.question)
        setMessages(prev => [...prev, {
          type: 'interviewer',
          content: data.question
        }])
        speak(data.question)
        break
        
      case 'error':
        setError(data.message)
        setIsEvaluating(false)
        break
    }
  }, [speak])

  // Request a new question
  const getNewQuestion = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connect()
      return
    }
    
    setCurrentAnswer('')
    wsRef.current.send(JSON.stringify({
      type: 'get_question',
      category: selectedCategory
    }))
  }, [selectedCategory, connect])

  // Submit answer for evaluation
  const submitAnswer = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    if (!currentAnswer.trim()) return
    
    // Add candidate's answer to messages
    setMessages(prev => [...prev, {
      type: 'candidate',
      content: currentAnswer
    }])
    
    // Send for evaluation
    wsRef.current.send(JSON.stringify({
      type: 'submit_answer',
      question: currentQuestion,
      answer: currentAnswer
    }))
    
    setCurrentAnswer('')
  }, [currentAnswer, currentQuestion])

  // Get follow-up question
  const getFollowup = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    
    const lastAnswer = messages.filter(m => m.type === 'candidate').pop()?.content
    if (!lastAnswer) return
    
    wsRef.current.send(JSON.stringify({
      type: 'get_followup',
      question: currentQuestion,
      answer: lastAnswer
    }))
  }, [messages, currentQuestion])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Load voices
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.getVoices()
    }
  }, [])

  // Setup speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.log('Speech recognition not supported')
      return
    }
    
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    
    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }
      
      if (finalTranscript) {
        setCurrentAnswer(prev => prev + finalTranscript)
      }
    }
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error !== 'no-speech') {
        setError(`Voice recognition error: ${event.error}`)
      }
      setIsRecording(false)
    }
    
    recognition.onend = () => {
      setIsRecording(false)
    }
    
    recognitionRef.current = recognition
    
    return () => {
      recognition.stop()
    }
  }, [])

  // Toggle voice recording
  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser')
      return
    }
    
    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      // Stop any TTS first
      stopSpeaking()
      setCurrentAnswer('') // Clear previous answer when starting new recording
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }, [isRecording, stopSpeaking])

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-green-100'
    if (score >= 6) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Connection Status & Controls */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                <span>Mock Interview</span>
              </CardTitle>
              <CardDescription>
                Practice behavioral interviews with AI-powered feedback
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {/* TTS Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isSpeaking) stopSpeaking()
                  setTtsEnabled(!ttsEnabled)
                }}
                className={ttsEnabled ? 'text-indigo-600' : 'text-gray-400'}
              >
                {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              
              {/* Connection Button */}
              {!isConnected ? (
                <Button
                  onClick={connect}
                  disabled={isConnecting}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mic className="h-4 w-4 mr-2" />
                  )}
                  {isConnecting ? 'Connecting...' : 'Start Interview'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={disconnect}
                  className="text-red-600 hover:text-red-700"
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {isConnected && messages.length === 0 && (
          <CardContent>
            {/* Category Selection */}
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Select a topic or get a random question:</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    className={selectedCategory === cat.id ? 'bg-indigo-600' : ''}
                  >
                    {cat.emoji} {cat.label}
                  </Button>
                ))}
              </div>
              <Button
                onClick={getNewQuestion}
                className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {selectedCategory ? `Get ${CATEGORIES.find(c => c.id === selectedCategory)?.label} Question` : 'Get Random Question'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Interview Chat */}
      {messages.length > 0 && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
          <CardContent className="p-4">
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {messages.map((msg, idx) => (
                <div key={idx} className={`${msg.type === 'candidate' ? 'ml-8' : 'mr-8'}`}>
                  {msg.type === 'interviewer' && (
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-indigo-900">Interviewer</span>
                        {msg.category && (
                          <Badge variant="outline" className="text-xs">
                            {msg.category.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-800">{msg.content}</p>
                    </div>
                  )}
                  
                  {msg.type === 'candidate' && (
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">You</span>
                        </div>
                        <span className="font-medium text-gray-900">Your Answer</span>
                      </div>
                      <p className="text-gray-800">{msg.content}</p>
                    </div>
                  )}
                  
                  {msg.type === 'feedback' && msg.evaluation && (
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="h-5 w-5 text-purple-600" />
                          <span className="font-semibold text-purple-900">AI Feedback</span>
                        </div>
                        <div className={`text-2xl font-bold ${getScoreColor(msg.evaluation.score)} ${getScoreBg(msg.evaluation.score)} px-3 py-1 rounded-full`}>
                          {msg.evaluation.score}/10
                        </div>
                      </div>
                      
                      {/* STAR Analysis */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {Object.entries(msg.evaluation.star_analysis).map(([key, value]) => (
                          <div 
                            key={key} 
                            className={`p-2 rounded ${value.present ? 'bg-green-100' : 'bg-orange-100'}`}
                          >
                            <div className="flex items-center space-x-1">
                              {value.present ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-orange-600" />
                              )}
                              <span className="font-medium capitalize text-sm">{key}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{value.feedback}</p>
                          </div>
                        ))}
                      </div>
                      
                      {/* Strengths */}
                      {msg.evaluation.strengths?.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-green-700 flex items-center mb-1">
                            <Star className="h-4 w-4 mr-1" />
                            Strengths
                          </h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {msg.evaluation.strengths.map((s, i) => (
                              <li key={i} className="flex items-start">
                                <span className="text-green-500 mr-2">✓</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Improvements */}
                      {msg.evaluation.improvements?.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-orange-700 flex items-center mb-1">
                            <Target className="h-4 w-4 mr-1" />
                            To Improve
                          </h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {msg.evaluation.improvements.map((s, i) => (
                              <li key={i} className="flex items-start">
                                <span className="text-orange-500 mr-2">→</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Example Improvement */}
                      {msg.evaluation.improved_answer_snippet && (
                        <div className="bg-white rounded p-3 border border-purple-200">
                          <h4 className="text-sm font-medium text-purple-700 mb-1">💡 Example Improvement</h4>
                          <p className="text-sm text-gray-700 italic">
                            "{msg.evaluation.improved_answer_snippet}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {isEvaluating && (
                <div className="flex items-center space-x-2 text-indigo-600 ml-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing your response...</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Answer Input */}
            {currentQuestion && !isEvaluating && (
              <div className="mt-4 space-y-3 border-t pt-4">
                {/* Voice Recording Button - Primary */}
                <div className="flex flex-col items-center space-y-3">
                  <Button
                    onClick={toggleRecording}
                    size="lg"
                    className={`w-32 h-32 rounded-full transition-all duration-300 ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {isRecording ? (
                      <MicOff className="h-12 w-12" />
                    ) : (
                      <Mic className="h-12 w-12" />
                    )}
                  </Button>
                  <p className="text-sm text-gray-600">
                    {isRecording ? (
                      <span className="text-red-600 font-medium flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                        Recording... Click to stop
                      </span>
                    ) : (
                      'Click to start speaking your answer'
                    )}
                  </p>
                </div>

                {/* Transcript Preview */}
                {currentAnswer && (
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Your Answer:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentAnswer('')}
                        className="text-xs text-gray-500 h-6"
                      >
                        Clear
                      </Button>
                    </div>
                    <p className="text-gray-800 text-sm">{currentAnswer}</p>
                    <p className="text-xs text-gray-500 mt-2">{currentAnswer.length} characters</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-center space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={getFollowup}
                    disabled={messages.filter(m => m.type === 'candidate').length === 0}
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Follow-up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={getNewQuestion}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    New Question
                  </Button>
                  <Button
                    onClick={submitAnswer}
                    disabled={!currentAnswer.trim() || isRecording}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Submit Answer
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tips Card */}
      {messages.length === 0 && isConnected && (
        <Card className="shadow-lg border-0 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-indigo-900 mb-3">💡 STAR Method Tips</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p><strong className="text-indigo-700">S - Situation:</strong> Set the scene. What was the context?</p>
                <p><strong className="text-indigo-700">T - Task:</strong> What was your responsibility or goal?</p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-indigo-700">A - Action:</strong> What specific steps did YOU take?</p>
                <p><strong className="text-indigo-700">R - Result:</strong> What was the outcome? Use numbers if possible.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
