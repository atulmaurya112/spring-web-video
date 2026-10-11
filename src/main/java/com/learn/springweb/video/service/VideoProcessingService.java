package com.learn.springweb.video.service;

import java.nio.file.Path;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.learn.springweb.video.enums.VideoStatus;
import com.learn.springweb.video.model.Video;
import com.learn.springweb.video.repository.VideoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VideoProcessingService {

    private final VideoRepository videoRepository;
    private final FfmpegService ffmpegService;

    @Value("${video.storage.path}")
    private String storagePath;

    @Async("videoTaskExecutor")
    public void processAsync(Long videoId) {
        Video video = videoRepository.findById(videoId).orElse(null);
        if (video == null) {
            return;
        }

        try {
            Path root = Path.of(storagePath).toAbsolutePath().normalize();
            Path output = root.resolve("hls").resolve(videoId.toString()).normalize();
            if (!output.startsWith(root.resolve("hls"))) {
                throw new IllegalArgumentException("Invalid output path.");
            }

            ffmpegService.processVideo(Path.of(video.getOriginalPath()), output);
            updateStatus(videoId, VideoStatus.COMPLETED, output.toString(), null);
        } catch (Exception exception) {
            String message = exception.getMessage() == null ? "Video processing failed." : exception.getMessage();
            updateStatus(videoId, VideoStatus.FAILED, null, message.substring(0, Math.min(message.length(), 1900)));
        }
    }

    @Transactional
    protected void updateStatus(Long videoId, VideoStatus status, String hlsPath, String errorMessage) {
        videoRepository.findById(videoId).ifPresent(video -> {
            video.setStatus(status);
            if (hlsPath != null) {
                video.setHlsPath(hlsPath);
                video.setCompletedAt(LocalDateTime.now());
            }
            video.setErrorMessage(errorMessage);
            videoRepository.save(video);
        });
    }
}
