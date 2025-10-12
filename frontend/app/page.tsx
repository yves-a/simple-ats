'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileText, Brain, Target, CheckCircle2, XCircle, TrendingUp, Link, Loader2, ChevronDown, ChevronRight, Eye, Lightbulb, Sparkles } from 'lucide-react'
import pdfToText from 'react-pdftotext'
import { Input } from '@/components/ui/input'

// Job URL Input Component
function JobUrlInput({ onJobDescriptionExtracted, onError }: {
  onJobDescriptionExtracted: (text: string) => void
  onError: (error: string) => void
}) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchJobDescription = async () => {
    if (!url.trim()) {
      onError('Please enter a valid URL')
      return
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      onError('Please enter a valid URL (e.g., https://example.com/job-posting)')
      return
    }

    setIsLoading(true)
    onError('')

    try {
      const response = await fetch('http://localhost:8080/api/ats/fetch-job-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch job description`)
      }
      
      const data = await response.json()
      
      if (data.success && data.jobDescription) {
        onJobDescriptionExtracted(data.jobDescription)
        setUrl('') // Clear the URL input on success
      } else {
        throw new Error(data.message || 'Failed to extract job description')
      }
      
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to fetch job description')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="job-url">Job Posting URL</Label>
        <div className="flex space-x-2">
          <Input
            id="job-url"
            type="url"
            placeholder="https://company.com/jobs/software-engineer"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
          />
          <Button
            onClick={fetchJobDescription}
            disabled={!url.trim() || isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Enter the URL of a job posting and we'll extract the description automatically.
      </p>
    </div>
  )
}

export default function ATSPage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState<string>('')
  const [jobDescription, setJobDescription] = useState('')
  const [results, setResults] = useState<any>(null)
  const [advice, setAdvice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResumeText, setShowResumeText] = useState(false)

  const canAnalyze = resumeText.trim().length > 50 && jobDescription.trim().length > 50

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const text = await pdfToText(file)
      
      // Clean up the extracted text
      const cleanText = text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
      
      if (cleanText.length < 50) {
        throw new Error('Could not extract sufficient text from PDF. Please try a different file or paste text manually.')
      }
      
      return cleanText
    } catch (error) {
      throw new Error('Failed to extract text from PDF. Please try converting to TXT format or paste the text manually.')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setResumeFile(file)
    setIsProcessingFile(true)

    try {
      let text = ''
      
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file)
      } else if (file.type === 'text/plain') {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsText(file)
        })
      } else {
        throw new Error('Unsupported file format. Please upload a PDF or TXT file.')
      }

      setResumeText(text)
      
      // Auto-expand text area when file is processed
      setShowResumeText(true)
      
      // Show success message for PDF files
      if (file.type === 'application/pdf') {
        console.log(`Successfully extracted ${text.length} characters from PDF`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file')
      setResumeFile(null)
    } finally {
      setIsProcessingFile(false)
    }
  }

  const analyzeResume = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Please upload a resume and enter a job description.')
      return
    }

    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      // Call Java API which will then call Python service
      const response = await fetch('http://localhost:8080/api/ats/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: resumeText,
          jobDescription: jobDescription
        })
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`)
      }

      const result = await response.json()
      
      // Handle direct response from Java service (which passes through Python response)
      if (result.similarity_score !== undefined) {
        // Direct response format from Python via Java
        setResults({
          similarity_score: result.similarity_score,
          shared_keywords: result.shared_keywords || [],
          missing_keywords: result.missing_keywords || []
        })
      } else if (result.success && result.data) {
        // Alternative wrapped format (if Java adds wrapper)
        setResults({
          similarity_score: result.data.similarityScore || result.data.similarity_score,
          shared_keywords: result.data.sharedKeywords || result.data.shared_keywords || [],
          missing_keywords: result.data.missingKeywords || result.data.missing_keywords || []
        })
      } else {
        throw new Error(result.message || 'Analysis failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsLoading(false)
    }
  }

  const getAIAdvice = async () => {
    if (!results || !resumeText.trim() || !jobDescription.trim()) {
      setError('Please complete the similarity analysis first')
      return
    }

    setIsLoadingAdvice(true)
    setError(null)

    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutes timeout

      const response = await fetch('http://localhost:8080/api/ats/analyze-with-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: resumeText,
          jobDescription: jobDescription
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to get AI advice: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.advice) {
        // Map new advice fields to frontend keys
        setAdvice({
          ...result.advice,
          skills_to_add: result.advice["skills_to end up with"] || result.advice.skills_to_add,
          resume_structure: result.advice["resume structure tips to emphasize these skills in the 'Computer Science and Technology' industry, focusing on security aspects as well. Provide a brief strategy for keyword optimization specific to this context."] || result.advice.resume_structure,
          keyword_strategy: result.advice["keyword strategy"] || result.advice.keyword_strategy,
          overall_priority: result.advice.overall_priority || [
            "Highlight your most relevant skills and experience at the top of your resume.",
            "Use clear section headings and bullet points for readability.",
            "Tailor your resume to the job description by including matching keywords."
          ]
        })
      } else {
        throw new Error('No advice received from AI service')
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI advice')
    } finally {
      setIsLoadingAdvice(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
                <img src="/favicon.ico" alt="Smart ATS Logo" className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Smart ATS
              </h1>
              <p className="text-gray-600">AI-Powered Resume Job Matcher</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Resume Upload */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>Upload Resume</span>
                </CardTitle>
                <CardDescription>
                  Upload your resume file (TXT recommended, PDF supported)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept=".txt,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="resume-upload"
                    disabled={isProcessingFile}
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    {isProcessingFile ? (
                      <Brain className="mx-auto h-12 w-12 text-blue-600 animate-pulse" />
                    ) : (
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    )}
                    <p className="mt-2 text-sm font-medium text-gray-900">
                      {isProcessingFile 
                        ? 'Processing file...' 
                        : resumeFile 
                          ? resumeFile.name 
                          : 'Click to upload resume'
                      }
                    </p>
                    <p className="text-xs text-gray-500">TXT (recommended) or PDF files</p>
                  </label>
                  {resumeFile && !isProcessingFile && (
                    <div className="mt-2 space-y-2">
                      <Badge className="bg-green-100 text-green-800">
                        ✓ File processed ({resumeText.length} characters)
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setResumeFile(null)
                          setResumeText('')
                          setShowResumeText(false)
                        }}
                        className="text-xs"
                      >
                        Clear Resume
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resume Text Input/Preview - Collapsible */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowResumeText(!showResumeText)}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">Resume Text</span>
                    {resumeText && (
                      <Badge variant="outline" className="text-xs">
                        {resumeText.length} chars
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {resumeText && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowResumeText(true)
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    )}
                    {showResumeText ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </div>
                <CardDescription>
                  {resumeFile ? 'Review extracted text or edit as needed' : 'Or paste your resume text directly'}
                </CardDescription>
              </CardHeader>
              
              {showResumeText && (
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="resume-text">Resume Content</Label>
                    <Textarea
                      id="resume-text"
                      placeholder="Paste your resume text here, or upload a file above..."
                      className="min-h-[200px] resize-none"
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {resumeText.length} characters
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResumeText(false)}
                      className="text-xs"
                    >
                      Hide Text
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Job Description */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <span>Job Description</span>
                </CardTitle>
                <CardDescription>
                  Enter a job posting URL or paste the description manually
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="manual" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url">From URL</TabsTrigger>
                    <TabsTrigger value="manual">Manual Input</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="url" className="space-y-4">
                    <JobUrlInput 
                      onJobDescriptionExtracted={setJobDescription}
                      onError={setError}
                    />
                  </TabsContent>
                  
                  <TabsContent value="manual" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="job-description">Job Requirements</Label>
                      <Textarea
                        id="job-description"
                        placeholder="Paste the job description here..."
                        className="min-h-[300px] resize-none"
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="text-sm text-gray-500">
                  {jobDescription.length} characters
                </div>
              </CardContent>
            </Card>

            {/* Analyze Button */}
            <div className="flex justify-center">
              <Button
                onClick={analyzeResume}
                disabled={!canAnalyze || isLoading}
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Brain className="mr-2 h-5 w-5 animate-pulse" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-5 w-5" />
                    Analyze Match
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results Section */}
          <div>
            {isLoading && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-blue-600 animate-pulse" />
                    <span>AI Analysis in Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            )}

            {results && !isLoading && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span>Match Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Score Display */}
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {Math.round(results.similarity_score * 100)}%
                    </div>
                    <Progress value={results.similarity_score * 100} className="h-3" />
                    <p className="text-sm text-gray-600 mt-2">Match Score</p>
                  </div>

                  {/* Keywords Tabs */}
                  <Tabs defaultValue="shared" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="shared">
                        Shared ({results.shared_keywords?.length || 0})
                      </TabsTrigger>
                      <TabsTrigger value="missing">
                        Missing ({results.missing_keywords?.length || 0})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="shared" className="mt-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-green-700 flex items-center">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Skills You Have
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {results.shared_keywords?.map((keyword: string, index: number) => (
                                              <Badge key={index} className="bg-green-100 text-green-800 text-xs">
                                                 {keyword.replace("_", " ")}
                                              </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="missing" className="mt-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-orange-700 flex items-center">
                          <XCircle className="h-4 w-4 mr-1" />
                          Skills to Consider
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {results.missing_keywords?.slice(0, 10).map((keyword: string, index: number) => (
                                              <Badge key={index} variant="outline" className="text-xs border-orange-300 text-orange-700">
                                                {keyword.replace("_", " ")}
                                              </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-2">
                    <Button
                      onClick={getAIAdvice}
                      disabled={isLoadingAdvice}
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isLoadingAdvice ? (
                        <>
                          <Brain className="h-4 w-4 mr-1 animate-pulse" />
                          Getting AI Advice...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="h-4 w-4 mr-1" />
                          Get AI Advice
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setResults(null)
                        setAdvice(null)
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      New Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Advice Section */}
            {advice && !isLoadingAdvice && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur mt-6">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center space-x-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <span>AI-Powered Resume Advice</span>
                  </CardTitle>
                  <CardDescription>
                    Personalized recommendations to improve your ATS compatibility
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs defaultValue="skills" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="skills">Skills & Keywords</TabsTrigger>
                      <TabsTrigger value="structure">Structure</TabsTrigger>
                      <TabsTrigger value="priority">Quick Wins</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="skills" className="mt-4 space-y-4">
                      {advice.skills_to_add && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-purple-700 flex items-center">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Skills to Add
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {advice.skills_to_add.map((skill: string, index: number) => (
                              <Badge key={index} className="bg-purple-100 text-purple-800 text-xs">
                                + {skill.replace("_", " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {advice.skills_to_emphasize && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-blue-700 flex items-center">
                            <Target className="h-4 w-4 mr-1" />
                            Skills to Emphasize
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {advice.skills_to_emphasize.map((skill: string, index: number) => (
                              <Badge key={index} className="bg-blue-100 text-blue-800 text-xs">
                                ⭐ {skill.replace("_", " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {advice.keyword_strategy && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-green-700">Keyword Strategy</h4>
                          <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg">
                            {advice.keyword_strategy}
                          </p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="structure" className="mt-4 space-y-4">
                      {advice.resume_structure && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-indigo-700">Structure Improvements</h4>
                          <ul className="space-y-2">
                            {advice.resume_structure.map((item: string, index: number) => (
                              <li key={index} className="text-sm text-gray-700 flex items-start">
                                <CheckCircle2 className="h-4 w-4 mr-2 text-indigo-600 mt-0.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {advice.content_optimization && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-amber-700">Content Optimization</h4>
                          <ul className="space-y-2">
                            {advice.content_optimization.map((item: string, index: number) => (
                              <li key={index} className="text-sm text-gray-700 flex items-start">
                                <Lightbulb className="h-4 w-4 mr-2 text-amber-600 mt-0.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="priority" className="mt-4 space-y-4">
                      {advice.overall_priority && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-red-700 flex items-center">
                            <Target className="h-4 w-4 mr-1" />
                            Top Priority Actions
                          </h4>
                          <div className="space-y-3">
                            {advice.overall_priority.map((item: string, index: number) => (
                              <div key={index} className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
                                <div className="flex items-start">
                                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5">
                                    {index + 1}
                                  </span>
                                  <p className="text-sm text-red-800 font-medium">{item.replace("_", " ")}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <Button
                    onClick={() => setAdvice(null)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Hide Advice
                  </Button>
                </CardContent>
              </Card>
            )}

            {!results && !isLoading && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardContent className="py-12">
                  <div className="text-center">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Ready to Analyze
                    </h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      Upload your resume and paste a job description to get AI-powered matching insights.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
