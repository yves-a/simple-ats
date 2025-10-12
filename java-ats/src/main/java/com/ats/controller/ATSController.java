package com.ats.controller;

import com.ats.service.DocumentProcessor;
import com.ats.service.SimilarityService;
import com.ats.service.WebScrapingService;
import com.ats.model.SimilarityResult;
import com.ats.model.AnalysisResult;
import com.ats.dto.AnalysisRequest;
import com.ats.dto.AnalysisResponse;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * REST Controller for ATS Analysis
 */
@RestController
@RequestMapping("/api/ats")
@CrossOrigin(origins = "http://localhost:3000")
public class ATSController {
    
    private final DocumentProcessor documentProcessor;
    private final SimilarityService similarityService;
    private final WebScrapingService webScrapingService;
    
    @Autowired
    public ATSController(DocumentProcessor documentProcessor, SimilarityService similarityService, WebScrapingService webScrapingService) {
        this.documentProcessor = documentProcessor;
        this.similarityService = similarityService;
        this.webScrapingService = webScrapingService;
    }
    
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("{\"status\": \"healthy\", \"service\": \"ATS Java API\"}");
    }
    
    @PostMapping("/analyze")
    public ResponseEntity<AnalysisResponse> analyzeResume(
            @RequestParam("resume") MultipartFile resumeFile,
            @RequestParam("jobDescription") String jobDescription) {
        
        try {
            // Validate inputs
            if (resumeFile.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new AnalysisResponse(false, "Resume file is required", null));
            }
            
            if (jobDescription == null || jobDescription.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new AnalysisResponse(false, "Job description is required", null));
            }
            
            // Save uploaded file temporarily
            Path tempFile = Files.createTempFile("resume_", "_" + resumeFile.getOriginalFilename());
            Files.copy(resumeFile.getInputStream(), tempFile, StandardCopyOption.REPLACE_EXISTING);
            
            try {
                File file = tempFile.toFile();
                
                // Check if file type is supported
                if (!documentProcessor.isSupported(file)) {
                    return ResponseEntity.badRequest()
                        .body(new AnalysisResponse(false, "Unsupported file type. Supported: PDF, DOCX, DOC, TXT, RTF, ODT", null));
                }
                
                // Extract text from resume
                String resumeText = documentProcessor.extractText(file);
                
                // Call Python service for similarity calculation
                SimilarityResult result = similarityService.calculateSimilarity(resumeText, jobDescription);
                
                // Return successful response
                return ResponseEntity.ok(new AnalysisResponse(true, "Analysis completed successfully", result));
                
            } finally {
                // Clean up temporary file
                Files.deleteIfExists(tempFile);
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AnalysisResponse(false, "Analysis failed: " + e.getMessage(), null));
        }
    }
    
    @PostMapping("/analyze-text")
    public ResponseEntity<AnalysisResponse> analyzeResumeText(@RequestBody AnalysisRequest request) {
        try {
            // Validate inputs
            if (request.getResumeText() == null || request.getResumeText().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new AnalysisResponse(false, "Resume text is required", null));
            }
            
            if (request.getJobDescription() == null || request.getJobDescription().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new AnalysisResponse(false, "Job description is required", null));
            }
            
            // Call Python service for similarity calculation
            SimilarityResult result = similarityService.calculateSimilarity(
                request.getResumeText(), 
                request.getJobDescription()
            );
            
            // Return successful response
            return ResponseEntity.ok(new AnalysisResponse(true, "Analysis completed successfully", result));
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AnalysisResponse(false, "Analysis failed: " + e.getMessage(), null));
        }
    }
    
    @PostMapping("/analyze-with-advice")
    public ResponseEntity<?> analyzeResumeWithAdvice(@RequestBody AnalysisRequest request) {
        try {
            // Validate inputs
            if (request.getResumeText() == null || request.getResumeText().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new AnalysisResponse(false, "Resume text is required", null));
            }
            
            if (request.getJobDescription() == null || request.getJobDescription().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new AnalysisResponse(false, "Job description is required", null));
            }
            
            // Get complete analysis with AI advice
            AnalysisResult result = similarityService.getCompleteAnalysis(
                request.getResumeText(), 
                request.getJobDescription()
            );
            
            // Return successful response
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AnalysisResponse(false, "Analysis failed: " + e.getMessage(), null));
        }
    }
    
    @PostMapping("/fetch-job-description")
    public ResponseEntity<?> fetchJobDescription(@RequestBody JobUrlRequest request) {
        try {
            // Validate URL
            if (request.getUrl() == null || request.getUrl().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new JobDescriptionResponse(false, "URL is required", null));
            }
            
            // Extract job description from URL
            String jobDescription = webScrapingService.extractJobDescription(request.getUrl());
            
            return ResponseEntity.ok(new JobDescriptionResponse(true, "Job description extracted successfully", jobDescription));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new JobDescriptionResponse(false, "Failed to fetch job description: " + e.getMessage(), null));
        }
    }
    
    // Request/Response classes for job URL fetching
    public static class JobUrlRequest {
        private String url;
        
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
    }
    
    public static class JobDescriptionResponse {
        private boolean success;
        private String message;
        private String jobDescription;
        
        public JobDescriptionResponse(boolean success, String message, String jobDescription) {
            this.success = success;
            this.message = message;
            this.jobDescription = jobDescription;
        }
        
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public String getJobDescription() { return jobDescription; }
    }
}