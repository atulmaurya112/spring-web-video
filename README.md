# Video Stream — refactored baseline

## What changed
- Moved async FFmpeg work to a separate Spring bean. Calling an `@Async` method on the same bean does not pass through Spring's async proxy.
- Added a bounded task executor and FFmpeg timeout/log file.
- Replaced jQuery and HTML string concatenation with Fetch API, DOM APIs, and `textContent` to prevent DOM-based XSS.
- Added basic upload validation and configurable environment variables.
- Removed unused `HttpRangeResource` and `LimitedInputStream`; HLS does not require custom byte-range resources.
- Kept local filesystem storage, PostgreSQL metadata, Thymeleaf, and Spring Boot-served HLS.

## Run
1. Create PostgreSQL database `video_streaming`.
2. Verify `ffmpeg.path` points to `ffmpeg.exe` on Windows. On Linux, set `FFMPEG_PATH=/usr/bin/ffmpeg`.
3. Run `mvn spring-boot:run`.
4. Open `/videos`, then upload and play a video.

## Important limitations to address before production
- Extension checks are not sufficient security validation. Inspect actual media content with FFprobe, restrict upload access, and scan/validate files.
- The three renditions are encoded sequentially and every input is forced to 360p/720p/1080p. Smaller source videos can be upscaled. Use FFprobe and generate only appropriate renditions.
- `ddl-auto=update` is suitable for local learning, not controlled production schema changes; use Flyway or Liquibase.
- Do not expose raw FFmpeg logs or exception details to end users. Restrict access to uploaded media and HLS paths as appropriate.
- `@Async` is in-process: queued jobs are lost on application shutdown. For durable processing, add a persistent job queue and recovery strategy.
- The HLS master playlist bandwidth/resolution values are approximate and currently assume standard rendition dimensions. Derive these from actual encoded output for a production implementation.
- Confirm the selected Spring Boot version exists in your configured Maven repositories. If not, use a released version compatible with your project.
