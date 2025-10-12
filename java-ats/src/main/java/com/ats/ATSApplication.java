package com.ats;

import com.ats.service.DocumentProcessor;
import com.ats.service.SimilarityService;
import com.ats.model.SimilarityResult;

import java.io.File;
import java.util.Scanner;

/**
 * Simple ATS Application - Command Line Interface
 */
public class ATSApplication {
    
    private final DocumentProcessor documentProcessor;
    private final SimilarityService similarityService;
    
    public ATSApplication() {
        this.documentProcessor = new DocumentProcessor();
        this.similarityService = new SimilarityService();
    }
    
    public static void main(String[] args) {
        ATSApplication app = new ATSApplication();
        app.run(args);
    }
    
    public void run(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        try {
            System.out.println("=== Simple ATS - Resume Job Matcher ===");
            
            // Get resume file path
            String resumePath;
            if (args.length > 0) {
                resumePath = args[0];
            } else {
                System.out.print("Enter resume file path (PDF/DOCX/TXT): ");
                resumePath = scanner.nextLine().trim();
            }
            
            // Get job description (text or file path)
            String jobDescription;
            if (args.length > 1) {
                String jobInput = args[1];
                jobDescription = getJobDescription(jobInput);
            } else {
                System.out.print("Enter job description (text or file path ending with .txt): ");
                String jobInput = scanner.nextLine().trim();
                jobDescription = getJobDescription(jobInput);
            }
            
            // Process the comparison
            processResumeComparison(resumePath, jobDescription);
            
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        } finally {
            scanner.close();
        }
    }
    
    private String getJobDescription(String input) {
        // Check if input is a file path (ends with .txt)
        if (input.toLowerCase().endsWith(".txt")) {
            try {
                File jobFile = new File(input);
                if (!jobFile.exists()) {
                    throw new IllegalArgumentException("Job description file not found: " + input);
                }
                
                System.out.println("Reading job description from file: " + input);
                return documentProcessor.extractText(jobFile);
                
            } catch (Exception e) {
                System.err.println("Failed to read job description file: " + e.getMessage());
                throw new RuntimeException(e);
            }
        } else {
            // Treat as direct text input
            return input;
        }
    }
    
    private void processResumeComparison(String resumePath, String jobDescription) {
        try {
            System.out.println("\nProcessing documents...");
            
            // Extract text from resume
            File resumeFile = new File(resumePath);
            if (!resumeFile.exists()) {
                throw new IllegalArgumentException("Resume file not found: " + resumePath);
            }
            
            if (!documentProcessor.isSupported(resumeFile)) {
                throw new IllegalArgumentException("Unsupported resume file type. Supported: PDF, DOCX, DOC, TXT, RTF, ODT");
            }
            
            String fileType = documentProcessor.getFileType(resumeFile);
            System.out.println("Processing " + fileType + " resume: " + resumeFile.getName());
            
            String resumeText = documentProcessor.extractText(resumeFile);
            System.out.println("✓ Resume text extracted (" + resumeText.length() + " characters)");
            
            System.out.println("✓ Job description loaded (" + jobDescription.length() + " characters)");
            
            // Call Python service for similarity calculation
            System.out.println("\nCalculating AI-powered similarity...");
            SimilarityResult result = similarityService.calculateSimilarity(resumeText, jobDescription);
            
            // Display results
            displayResults(result);
            
        } catch (Exception e) {
            System.err.println("Failed to process documents: " + e.getMessage());
            throw new RuntimeException(e);
        }
    }
    
    private void displayResults(SimilarityResult result) {
        System.out.println("\n=== RESULTS ===");
        System.out.printf("Resume vs Job Match: %.2f (%.0f%%)\n", 
            result.getSimilarityScore(), 
            result.getSimilarityScore() * 100);
        
        if (result.getSharedKeywords() != null && !result.getSharedKeywords().isEmpty()) {
            System.out.println("\nShared Keywords:");
            result.getSharedKeywords().forEach(keyword -> 
                System.out.println("  ✓ " + keyword));
        }
        
        if (result.getMissingKeywords() != null && !result.getMissingKeywords().isEmpty()) {
            System.out.println("\nMissing Keywords:");
            result.getMissingKeywords().forEach(keyword -> 
                System.out.println("  ✗ " + keyword));
        }
        
        System.out.println("\nProcessing completed successfully!");
    }
}