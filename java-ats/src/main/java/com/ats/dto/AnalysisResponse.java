package com.ats.dto;

import com.ats.model.SimilarityResult;

/**
 * Response DTO for analysis results
 */
public class AnalysisResponse {
    private boolean success;
    private String message;
    private SimilarityResult data;
    
    public AnalysisResponse() {}
    
    public AnalysisResponse(boolean success, String message, SimilarityResult data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }
    
    public boolean isSuccess() {
        return success;
    }
    
    public void setSuccess(boolean success) {
        this.success = success;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public SimilarityResult getData() {
        return data;
    }
    
    public void setData(SimilarityResult data) {
        this.data = data;
    }
}