package com.learn.springweb.video.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FfmpegService {

    private final String ffmpegPath;
    private final Duration timeout;

    public FfmpegService(
            @Value("${ffmpeg.path}") String ffmpegPath,
            @Value("${video.processing.timeout:PT2H}") Duration timeout) {
        this.ffmpegPath = ffmpegPath;
        this.timeout = timeout;
    }

    public void processVideo(Path input, Path outputDirectory) throws IOException, InterruptedException {
        Files.createDirectories(outputDirectory);
        createVariant(input, outputDirectory.resolve("360p"), 360, "800k", "96k");
        createVariant(input, outputDirectory.resolve("720p"), 720, "2500k", "128k");
        createVariant(input, outputDirectory.resolve("1080p"), 1080, "5000k", "192k");
        writeMasterPlaylist(outputDirectory);
    }

    private void createVariant(Path input, Path output, int height, String videoBitrate, String audioBitrate)
            throws IOException, InterruptedException {
        Files.createDirectories(output);
        Path playlist = output.resolve("playlist.m3u8");
        Path segments = output.resolve("segment_%03d.ts");

        List<String> command = List.of(
                ffmpegPath, "-hide_banner", "-nostdin", "-y",
                "-i", input.toAbsolutePath().toString(),
                "-vf", "scale=-2:" + height,
                "-c:v", "libx264", "-preset", "veryfast", "-b:v", videoBitrate,
                "-c:a", "aac", "-b:a", audioBitrate,
                "-f", "hls", "-hls_time", "6", "-hls_playlist_type", "vod",
                "-hls_segment_filename", segments.toAbsolutePath().toString(),
                playlist.toAbsolutePath().toString());

        Process process = new ProcessBuilder(command)
                .redirectErrorStream(true)
                .redirectOutput(output.resolve("ffmpeg.log").toFile())
                .start();

        boolean finished = process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new IOException("FFmpeg timed out while generating " + height + "p.");
        }
        if (process.exitValue() != 0) {
            String log = Files.exists(output.resolve("ffmpeg.log"))
                    ? Files.readString(output.resolve("ffmpeg.log"))
                    : "No FFmpeg log was produced.";
            throw new IOException("FFmpeg failed for " + height + "p (exit " + process.exitValue() + "): "
                    + log.substring(0, Math.min(log.length(), 5000)));
        }
    }

    private void writeMasterPlaylist(Path directory) throws IOException {
        String content = """
                #EXTM3U
                #EXT-X-VERSION:3
                #EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=640x360
                360p/playlist.m3u8
                #EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
                720p/playlist.m3u8
                #EXT-X-STREAM-INF:BANDWIDTH=5400000,RESOLUTION=1920x1080
                1080p/playlist.m3u8
                """;
        Files.writeString(directory.resolve("master.m3u8"), content);
    }
}
