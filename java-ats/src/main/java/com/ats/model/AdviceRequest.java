package com.ats.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * Request model for AI-powered resume advice
 */
public class AdviceRequest {
    
    @JsonProperty("resume_text")
    private String resumeText;
    
    @JsonProperty("job_description")
    private String jobDescription;
    
    @JsonProperty("similarity_score")
    private Double similarityScore;
    
    @JsonProperty("shared_keywords")
    private List<String> sharedKeywords;
    
    @JsonProperty("missing_keywords")
    private List<String> missingKeywords;
    
    // Constructors
    public AdviceRequest() {}
    
    public AdviceRequest(String resumeText, String jobDescription, Double similarityScore, 
                        List<String> sharedKeywords, List<String> missingKeywords) {
        this.resumeText = resumeText;
        this.jobDescription = jobDescription;
        this.similarityScore = similarityScore;
        this.sharedKeywords = sharedKeywords;
        this.missingKeywords = missingKeywords;
    }
    
    // Getters and Setters
    public String getResumeText() { return resumeText; }
    public void setResumeText(String resumeText) { this.resumeText = resumeText; }
    
    public String getJobDescription() { return jobDescription; }
    public void setJobDescription(String jobDescription) { this.jobDescription = jobDescription; }
    
    public Double getSimilarityScore() { return similarityScore; }
    public void setSimilarityScore(Double similarityScore) { this.similarityScore = similarityScore; }
    
    public List<String> getSharedKeywords() { return sharedKeywords; }
    public void setSharedKeywords(List<String> sharedKeywords) { this.sharedKeywords = sharedKeywords; }
    
    public List<String> getMissingKeywords() { return missingKeywords; }
    public void setMissingKeywords(List<String> missingKeywords) { this.missingKeywords = missingKeywords; }
}