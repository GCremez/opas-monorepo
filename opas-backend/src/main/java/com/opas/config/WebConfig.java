package com.opas.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            opas:
                cors:allowed-origins: https://app.opas.com,https://admin.opas.com

                @Value("${opas.cors.allowed-origins}")
                private List<String> allowedOrigins;

                registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.toArray(String[0]::new))
                .allowedMethods("GET", "POST")
                .allowedHeaders("Authorization", "Content-Type");
            }
    }
}

