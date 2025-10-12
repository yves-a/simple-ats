package com.ats.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Response model for similarity calculation results
 */
public class SimilarityResult {
    
    @JsonProperty("similarity_score")
    private double similarityScore;
    
    @JsonProperty("shared_keywords")
    private List<String> sharedKeywords;
    
    @JsonProperty("missing_keywords")
    private List<String> missingKeywords;
    
    public SimilarityResult() {
    }
    
    public SimilarityResult(double similarityScore, List<String> sharedKeywords, List<String> missingKeywords) {
        this.similarityScore = similarityScore;
        this.sharedKeywords = sharedKeywords;
        this.missingKeywords = missingKeywords;
    }
    
    public double getSimilarityScore() {
        return similarityScore;
    }
    
    public void setSimilarityScore(double similarityScore) {
        this.similarityScore = similarityScore;
    }
    
    public List<String> getSharedKeywords() {
        return sharedKeywords;
    }
    
    public void setSharedKeywords(List<String> sharedKeywords) {
        this.sharedKeywords = sharedKeywords;
    }
    
    public List<String> getMissingKeywords() {
        return missingKeywords;
    }
    
    public void setMissingKeywords(List<String> missingKeywords) {
        this.missingKeywords = missingKeywords;
    }
}