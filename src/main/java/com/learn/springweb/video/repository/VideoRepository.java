package com.learn.springweb.video.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.learn.springweb.video.model.Video;

public interface VideoRepository extends JpaRepository<Video, Long> {
    List<Video> findAllByOrderByCreatedAtDesc();
}
