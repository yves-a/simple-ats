package com.ats.dto;

/**
 * Request DTO for text-based analysis
 */
public class AnalysisRequest {
    private String resumeText;
    private String jobDescription;
    
    public AnalysisRequest() {}
    
    public AnalysisRequest(String resumeText, String jobDescription) {
        this.resumeText = resumeText;
        this.jobDescription = jobDescription;
    }
    
    public String getResumeText() {
        return resumeText;
    }
    
    public void setResumeText(String resumeText) {
        this.resumeText = resumeText;
    }
    
    public String getJobDescription() {
        return jobDescription;
    }
    
    public void setJobDescription(String jobDescription) {
        this.jobDescription = jobDescription;
    }
}