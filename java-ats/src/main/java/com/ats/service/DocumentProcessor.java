package com.ats.service;

import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;

/**
 * Service for extracting text from various document formats using Apache Tika
 */
@Service
public class DocumentProcessor {
    
    private static final Logger logger = LoggerFactory.getLogger(DocumentProcessor.class);
    private final Tika tika;
    
    public DocumentProcessor() {
        this.tika = new Tika();
    }
    
    /**
     * Extract text content from a document file (PDF, DOCX, etc.)
     *
     * @param file The document file to process
     * @return Extracted text content
     * @throws IOException if file cannot be read
     * @throws TikaException if document parsing fails
     */
    public String extractText(File file) throws IOException, TikaException {
        logger.info("Extracting text from file: {}", file.getAbsolutePath());
        
        if (!file.exists()) {
            throw new IOException("File does not exist: " + file.getAbsolutePath());
        }
        
        if (!file.canRead()) {
            throw new IOException("File is not readable: " + file.getAbsolutePath());
        }
        
        try {
            String extractedText = tika.parseToString(file);
            
            // Clean up the text
            String cleanText = cleanExtractedText(extractedText);
            
            logger.info("Successfully extracted {} characters from {}", 
                cleanText.length(), file.getName());
            
            return cleanText;
            
        } catch (Exception e) {
            logger.error("Failed to extract text from file: {}", file.getAbsolutePath(), e);
            throw new TikaException("Failed to parse document: " + e.getMessage(), e);
        }
    }
    
    /**
     * Clean and normalize extracted text
     */
    private String cleanExtractedText(String text) {
        if (text == null) {
            return "";
        }
        
        return text
            .trim()
            .replaceAll("\\s+", " ")  // Replace multiple whitespaces with single space
            .replaceAll("\\r\\n|\\r|\\n", " ")  // Replace line breaks with spaces
            .replaceAll("[\\x00-\\x1F]", "");  // Remove control characters
    }
    
    /**
     * Check if file type is supported
     */
    public boolean isSupported(File file) {
        if (file == null || !file.exists()) {
            return false;
        }
        
        String fileName = file.getName().toLowerCase();
        return fileName.endsWith(".pdf") || 
               fileName.endsWith(".docx") || 
               fileName.endsWith(".doc") ||
               fileName.endsWith(".txt") ||
               fileName.endsWith(".rtf") ||
               fileName.endsWith(".odt");
    }
    
    /**
     * Get file type description for logging
     */
    public String getFileType(File file) {
        if (file == null || !file.exists()) {
            return "Unknown";
        }
        
        String fileName = file.getName().toLowerCase();
        if (fileName.endsWith(".pdf")) return "PDF";
        if (fileName.endsWith(".docx")) return "Word (DOCX)";
        if (fileName.endsWith(".doc")) return "Word (DOC)";
        if (fileName.endsWith(".txt")) return "Plain Text";
        if (fileName.endsWith(".rtf")) return "Rich Text Format";
        if (fileName.endsWith(".odt")) return "OpenDocument Text";
        
        return "Unknown";
    }
}