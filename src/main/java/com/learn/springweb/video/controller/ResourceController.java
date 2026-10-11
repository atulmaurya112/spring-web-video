package com.learn.springweb.video.controller;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.ModelAndView;

import com.learn.springweb.video.service.VideoService;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class ResourceController {

	private final VideoService videoService;

	@GetMapping("/videos")
	public ModelAndView videosPage() {
		return new ModelAndView("videos");
	}

	@GetMapping("/videos/upload")
	public ModelAndView uploadPage() {
		return new ModelAndView("upload");
	}

	@GetMapping("/videos/watch/{id}")
	public ModelAndView watchPage(@PathVariable Long id) {
		try {
			videoService.getVideo(id);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found.");
		}

		ModelAndView modelAndView = new ModelAndView("watch");
		modelAndView.addObject("videoId", id);
		return modelAndView;
	}

}
