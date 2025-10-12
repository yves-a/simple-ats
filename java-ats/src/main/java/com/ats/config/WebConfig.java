package com.ats.config;

import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web configuration for handling long-running requests like AI advice generation
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        // Set async request timeout to 5 minutes for LLM operations
        configurer.setDefaultTimeout(300_000); // 5 minutes in milliseconds
    }

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> containerCustomizer() {
        return factory -> {
            // Set connection timeout to 5 minutes
            factory.addConnectorCustomizers(connector -> {
                connector.setAsyncTimeout(300_000); // 5 minutes
                connector.setProperty("connectionTimeout", "300000"); // 5 minutes
                connector.setProperty("keepAliveTimeout", "300000"); // 5 minutes
            });
        };
    }
}