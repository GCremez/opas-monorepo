package com.opas.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {

    @Value("${opas.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**").allowedOrigins(allowedOrigins.toArray(new String[0]))
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                        .allowedHeaders("Authorization", "Content-Type");
            }
        };
    }
}
