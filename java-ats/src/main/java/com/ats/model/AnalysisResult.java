package com.ats.model;

import java.util.Map;

/**
 * Combined response containing both similarity analysis and AI advice
 */
public class AnalysisResult {
    
    private Double similarityScore;
    private java.util.List<String> sharedKeywords;
    private java.util.List<String> missingKeywords;
    private Map<String, Object> advice;
    private Boolean llmAvailable;
    
    // Constructors
    public AnalysisResult() {}
    
    public AnalysisResult(SimilarityResult similarity, AdviceResponse advice) {
        this.similarityScore = similarity.getSimilarityScore();
        this.sharedKeywords = similarity.getSharedKeywords();
        this.missingKeywords = similarity.getMissingKeywords();
        this.advice = advice.getAdvice();
        this.llmAvailable = advice.getLlmAvailable();
    }
    
    // Getters and Setters
    public Double getSimilarityScore() { return similarityScore; }
    public void setSimilarityScore(Double similarityScore) { this.similarityScore = similarityScore; }
    
    public java.util.List<String> getSharedKeywords() { return sharedKeywords; }
    public void setSharedKeywords(java.util.List<String> sharedKeywords) { this.sharedKeywords = sharedKeywords; }
    
    public java.util.List<String> getMissingKeywords() { return missingKeywords; }
    public void setMissingKeywords(java.util.List<String> missingKeywords) { this.missingKeywords = missingKeywords; }
    
    public Map<String, Object> getAdvice() { return advice; }
    public void setAdvice(Map<String, Object> advice) { this.advice = advice; }
    
    public Boolean getLlmAvailable() { return llmAvailable; }
    public void setLlmAvailable(Boolean llmAvailable) { this.llmAvailable = llmAvailable; }
}