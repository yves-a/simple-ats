package com.ats.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

/**
 * Response model for AI-powered resume advice
 */
public class AdviceResponse {
    
    private Map<String, Object> advice;
    
    @JsonProperty("llm_available")
    private Boolean llmAvailable;
    
    // Constructors
    public AdviceResponse() {}
    
    public AdviceResponse(Map<String, Object> advice, Boolean llmAvailable) {
        this.advice = advice;
        this.llmAvailable = llmAvailable;
    }
    
    // Getters and Setters
    public Map<String, Object> getAdvice() { return advice; }
    public void setAdvice(Map<String, Object> advice) { this.advice = advice; }
    
    public Boolean getLlmAvailable() { return llmAvailable; }
    public void setLlmAvailable(Boolean llmAvailable) { this.llmAvailable = llmAvailable; }
}