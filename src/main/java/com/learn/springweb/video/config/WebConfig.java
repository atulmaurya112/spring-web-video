package com.learn.springweb.video.config;

import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final Path hlsDirectory;

    public WebConfig(@Value("${video.storage.path}") String storagePath) {
        this.hlsDirectory = Path.of(storagePath).toAbsolutePath().normalize().resolve("hls");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = hlsDirectory.toUri().toString();
        registry.addResourceHandler("/hls/**").addResourceLocations(location);
    }
    
}
