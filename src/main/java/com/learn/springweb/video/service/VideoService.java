package com.learn.springweb.video.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.learn.springweb.video.enums.VideoStatus;
import com.learn.springweb.video.model.Video;
import com.learn.springweb.video.repository.VideoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VideoService {

    private static final long MAX_UPLOAD_BYTES = 2L * 1024 * 1024 * 1024;
    private static final List<String> ALLOWED_EXTENSIONS = List.of(".mp4", ".mov", ".m4v", ".mkv", ".webm");

    private final VideoRepository videoRepository;
    private final VideoProcessingService videoProcessingService;

    @Value("${video.storage.path}")
    private String storagePath;

    public Video upload(MultipartFile file, String title) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Select a non-empty video file.");
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new IllegalArgumentException("Video exceeds the 2 GB upload limit.");
        }

        String safeTitle = title == null ? "" : title.strip();
        if (safeTitle.isBlank() || safeTitle.length() > 200) {
            throw new IllegalArgumentException("Title must contain 1–200 characters.");
        }

        String suppliedName = file.getOriginalFilename();
        String originalName = suppliedName == null ? "video" : Path.of(suppliedName).getFileName().toString();
        String lowerName = originalName.toLowerCase(Locale.ROOT);
        if (ALLOWED_EXTENSIONS.stream().noneMatch(lowerName::endsWith)) {
            throw new IllegalArgumentException("Unsupported file extension. Use MP4, MOV, M4V, MKV, or WEBM.");
        }

        Path root = Path.of(storagePath).toAbsolutePath().normalize();
        Path originalDirectory = root.resolve("original");
        Files.createDirectories(originalDirectory);

        Video video = new Video();
        video.setTitle(safeTitle);
        video.setOriginalFileName(originalName);
        video.setStatus(VideoStatus.PROCESSING);
        video.setCreatedAt(LocalDateTime.now());
        video = videoRepository.saveAndFlush(video);

        Path destination = originalDirectory.resolve(video.getId() + ".upload");
        try {
            file.transferTo(destination);
            Path finalPath = originalDirectory.resolve(video.getId() + extensionOf(lowerName));
            Files.move(destination, finalPath);
            video.setOriginalPath(finalPath.toString());
            video = videoRepository.save(video);
        } catch (IOException | RuntimeException exception) {
            Files.deleteIfExists(destination);
            video.setStatus(VideoStatus.FAILED);
            video.setErrorMessage("Upload could not be saved.");
            videoRepository.save(video);
            throw exception;
        }

        videoProcessingService.processAsync(video.getId());
        return video;
    }

    @Transactional(readOnly = true)
    public List<Video> getAllVideos() {
        return videoRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Video getVideo(Long id) {
        return videoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Video not found: " + id));
    }

    private String extensionOf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? ".bin" : fileName.substring(dot);
    }
}
