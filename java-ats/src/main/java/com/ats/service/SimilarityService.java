package com.ats.service;

import com.ats.model.SimilarityRequest;
import com.ats.model.SimilarityResult;
import com.ats.model.AdviceRequest;
import com.ats.model.AdviceResponse;
import com.ats.model.AnalysisResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Service for calling Python microservice to calculate resume-job similarity
 */
@Service
public class SimilarityService {
    
    private static final Logger logger = LoggerFactory.getLogger(SimilarityService.class);
    private static final String PYTHON_SERVICE_URL = System.getenv("PYTHON_SERVICE_URL") != null 
        ? System.getenv("PYTHON_SERVICE_URL") 
        : "http://localhost:8000";
    
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    
    public SimilarityService() {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .version(HttpClient.Version.HTTP_1_1)
            // Increase connection pool for better handling of concurrent requests
            .build();
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * Calculate similarity between resume text and job description
     *
     * @param resumeText The extracted resume text
     * @param jobDescription The job description text
     * @return Similarity result with score and keywords
     * @throws IOException if HTTP request fails
     * @throws InterruptedException if request is interrupted
     */
    public SimilarityResult calculateSimilarity(String resumeText, String jobDescription) 
            throws IOException, InterruptedException {
        
        logger.info("Sending similarity request to Python service...");
        
        // Create request payload
        SimilarityRequest request = new SimilarityRequest(resumeText, jobDescription);
        String jsonRequest = objectMapper.writeValueAsString(request);
        
        logger.info("Request JSON: {}", jsonRequest);
        logger.info("JSON length: {} characters", jsonRequest.length());
        
        // Validate that we have actual content
        if (jsonRequest == null || jsonRequest.trim().isEmpty() || jsonRequest.equals("{}")) {
            logger.error("Invalid JSON request generated: '{}'", jsonRequest);
            throw new IOException("Failed to create valid JSON request payload");
        }
        
        // Get byte array for proper length calculation
        byte[] jsonBytes = jsonRequest.getBytes(StandardCharsets.UTF_8);
        logger.info("JSON bytes length: {} bytes", jsonBytes.length);
        logger.info("Request payload content: resumeText length={}, jobDescription length={}", 
            resumeText != null ? resumeText.length() : 0, 
            jobDescription != null ? jobDescription.length() : 0);
        
        // Build HTTP request with proper encoding
        HttpRequest httpRequest = HttpRequest.newBuilder()
            .uri(URI.create(PYTHON_SERVICE_URL + "/similarity"))
            .header("Content-Type", "application/json; charset=UTF-8")
            .header("Accept", "application/json")
            .timeout(Duration.ofSeconds(30))
            .POST(HttpRequest.BodyPublishers.ofByteArray(jsonBytes))
            .build();
            
        logger.info("Sending request to: {}", httpRequest.uri());
        
        try {
            // Send request
            HttpResponse<String> response = httpClient.send(httpRequest, 
                HttpResponse.BodyHandlers.ofString());
            
            logger.info("Received response from Python service: status={}", response.statusCode());
            logger.info("Response body: {}", response.body());
            
            if (response.statusCode() != 200) {
                logger.error("Python service error - Status: {}, Body: {}", response.statusCode(), response.body());
                throw new IOException("Python service returned error: " + 
                    response.statusCode() + " - " + response.body());
            }
            
            // Parse response
            SimilarityResult result = objectMapper.readValue(response.body(), SimilarityResult.class);
            
            logger.info("Similarity calculation completed: score={:.2f}", result.getSimilarityScore());
            
            return result;
            
        } catch (Exception e) {
            logger.error("Failed to call Python similarity service", e);
            
            // Check if service is running
            if (e.getMessage().contains("Connection refused")) {
                throw new IOException("Python service is not running. Please start it first on port 8000.", e);
            }
            
            throw new IOException("Failed to calculate similarity: " + e.getMessage(), e);
        }
    }
    
    /**
     * Check if Python service is available
     */
    public boolean isServiceAvailable() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(PYTHON_SERVICE_URL + "/health"))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
                
            HttpResponse<String> response = httpClient.send(request, 
                HttpResponse.BodyHandlers.ofString());
                
            return response.statusCode() == 200;
            
        } catch (Exception e) {
            logger.warn("Python service health check failed: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Get AI-powered resume advice based on similarity analysis
     */
    public AdviceResponse getAdvice(String resumeText, String jobDescription, SimilarityResult similarityResult) 
            throws IOException, InterruptedException {
        
        logger.info("Requesting AI advice from Python service...");
        logger.info("Similarity score: {}, Shared: {}, Missing: {}", 
            similarityResult.getSimilarityScore(), 
            similarityResult.getSharedKeywords().size(), 
            similarityResult.getMissingKeywords().size());
        
        // Create advice request
        AdviceRequest request = new AdviceRequest(
            resumeText, 
            jobDescription,
            similarityResult.getSimilarityScore(),
            similarityResult.getSharedKeywords(),
            similarityResult.getMissingKeywords()
        );
        
        String jsonRequest = objectMapper.writeValueAsString(request);
        
        // Build HTTP request
        HttpRequest httpRequest = HttpRequest.newBuilder()
            .uri(URI.create(PYTHON_SERVICE_URL + "/advice"))
            .header("Content-Type", "application/json; charset=UTF-8")
            .header("Accept", "application/json")
            .timeout(Duration.ofSeconds(180)) // Reduced timeout - local Ollama should be faster
            .POST(HttpRequest.BodyPublishers.ofString(jsonRequest, StandardCharsets.UTF_8))
            .build();
            
        logger.info("Sending advice request to: {}", httpRequest.uri());
        
        try {
            HttpResponse<String> response = httpClient.send(httpRequest, 
                HttpResponse.BodyHandlers.ofString());
            
            logger.info("Received advice response: status={}", response.statusCode());
            
            if (response.statusCode() != 200) {
                logger.error("Advice service error - Status: {}, Body: {}", response.statusCode(), response.body());
                throw new IOException("Advice service returned error: " + response.statusCode());
            }
            
            return objectMapper.readValue(response.body(), AdviceResponse.class);
            
        } catch (Exception e) {
            logger.error("Failed to get advice from Python service", e);
            throw new IOException("Failed to get advice: " + e.getMessage(), e);
        }
    }
    
    /**
     * Complete analysis with similarity and AI advice
     */
    public AnalysisResult getCompleteAnalysis(String resumeText, String jobDescription) 
            throws IOException, InterruptedException {
        
        // First get similarity analysis
        SimilarityResult similarityResult = calculateSimilarity(resumeText, jobDescription);
        
        // Then get AI advice
        try {
            AdviceResponse adviceResponse = getAdvice(resumeText, jobDescription, similarityResult);
            return new AnalysisResult(similarityResult, adviceResponse);
        } catch (Exception e) {
            logger.warn("Could not get AI advice, returning similarity only: {}", e.getMessage());
            // Return analysis without advice if LLM fails
            AdviceResponse emptyAdvice = new AdviceResponse(null, false);
            return new AnalysisResult(similarityResult, emptyAdvice);
        }
    }
}