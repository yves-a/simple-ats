package com.ats.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Service
public class WebScrapingService {
    
    private static final Logger logger = LoggerFactory.getLogger(WebScrapingService.class);
    
    // Common job description selectors for popular job sites
    private static final List<String> JOB_DESCRIPTION_SELECTORS = Arrays.asList(
        "[data-testid='job-description']",  // LinkedIn
        ".job-description",                 // Generic
        ".jobsearch-jobDescriptionText",    // Indeed
        ".job-details",                     // Generic
        ".description",                     // Generic
        ".content",                         // Generic
        "article",                          // Generic article tag
        ".posting-content",                 // Some job boards
        ".job-posting-description",         // Some job boards
        "main"                              // Fallback to main content
    );
    
    public String extractJobDescription(String url) throws IOException {
        logger.info("Fetching job description from URL: {}", url);
        
        try {
            // Fetch the webpage with a proper User-Agent to avoid blocking
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
                    .timeout(10000)  // 10 second timeout
                    .get();
            
            String jobDescription = null;
            
            // Try different selectors to find job description content
            for (String selector : JOB_DESCRIPTION_SELECTORS) {
                Elements elements = doc.select(selector);
                if (!elements.isEmpty()) {
                    Element element = elements.first();
                    String text = element.text();
                    
                    // Check if this looks like a substantial job description
                    if (text.length() > 200 && containsJobKeywords(text)) {
                        jobDescription = text;
                        logger.info("Found job description using selector: {}, length: {}", selector, text.length());
                        break;
                    }
                }
            }
            
            // Fallback: try to extract from body if no specific selectors worked
            if (jobDescription == null) {
                String bodyText = doc.body().text();
                if (bodyText.length() > 200) {
                    // Try to find job-related content by looking for common patterns
                    String[] sentences = bodyText.split("\\.");
                    StringBuilder jobContent = new StringBuilder();
                    
                    boolean inJobSection = false;
                    for (String sentence : sentences) {
                        String lowerSentence = sentence.toLowerCase();
                        
                        // Start capturing when we hit job-related content
                        if (containsJobKeywords(lowerSentence)) {
                            inJobSection = true;
                        }
                        
                        if (inJobSection) {
                            jobContent.append(sentence.trim()).append(". ");
                            
                            // Stop if we hit footer/contact info
                            if (lowerSentence.contains("contact us") || 
                                lowerSentence.contains("apply now") ||
                                lowerSentence.contains("privacy policy")) {
                                break;
                            }
                        }
                    }
                    
                    jobDescription = jobContent.toString().trim();
                }
            }
            
            if (jobDescription == null || jobDescription.length() < 100) {
                throw new IOException("Could not extract job description from the provided URL. The page might not contain a job posting or may be protected.");
            }
            
            // Clean up the text
            jobDescription = cleanJobDescription(jobDescription);
            
            logger.info("Successfully extracted job description, final length: {}", jobDescription.length());
            return jobDescription;
            
        } catch (IOException e) {
            logger.error("Failed to fetch job description from URL: {}", url, e);
            throw new IOException("Failed to fetch job description: " + e.getMessage());
        }
    }
    
    private boolean containsJobKeywords(String text) {
        String lowerText = text.toLowerCase();
        String[] jobKeywords = {
            "responsibilities", "requirements", "qualifications", "experience", 
            "skills", "role", "position", "job", "candidate", "we are looking for",
            "what you'll do", "what we offer", "about the role", "key responsibilities"
        };
        
        for (String keyword : jobKeywords) {
            if (lowerText.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
    
    private String cleanJobDescription(String text) {
        return text
                .replaceAll("\\s+", " ")  // Normalize whitespace
                .replaceAll("\\n+", "\n")  // Normalize line breaks
                .trim();
    }
}