package com.learn.springweb.video.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.learn.springweb.video.model.Video;
import com.learn.springweb.video.service.VideoService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/videos/api")
@RequiredArgsConstructor
public class VideoController {

	private final VideoService videoService;

	@GetMapping
	public ResponseEntity<List<Video>> getVideos() {
		return ResponseEntity.ok(videoService.getAllVideos());
	}

	@GetMapping("/{id}")
	public ResponseEntity<Video> getVideo(@PathVariable Long id) {
		return ResponseEntity.ok(videoService.getVideo(id));
	}

	@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<Video> upload(@RequestParam String title, @RequestParam MultipartFile file) throws IOException {
		Video video = videoService.upload(file, title);
		return ResponseEntity.accepted().body(video);
	}

}