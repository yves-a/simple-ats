package com.ats;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot REST API for ATS Application
 */
@SpringBootApplication
public class ATSRestApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(ATSRestApplication.class, args);
    }
}