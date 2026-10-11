(() => {
    "use strict";

    const videoId = /*[[${videoId}]]*/ 0;
    const source = `/hls/${encodeURIComponent(videoId)}/master.m3u8`;

    const video = document.getElementById("video");
    const qualitySelect = document.getElementById("quality");
    const qualityStatus = document.getElementById("qualityStatus");
    const message = document.getElementById("playerMessage");
    const title = document.getElementById("videoTitle");

    let hls;
    let destroyed = false;

    function showMessage(text, type = "info") {
        message.textContent = text;
        message.className = `alert alert-${type}`;
    }

    function hideMessage() {
        message.textContent = "";
        message.className = "alert alert-info d-none";
    }

    function initializeQualityOptions(levels) {
        qualitySelect.replaceChildren();

        const autoOption = document.createElement("option");
        autoOption.value = "-1";
        autoOption.textContent = "Auto";
        qualitySelect.append(autoOption);

        const sortedLevels = levels
            .map((level, index) => ({
                index,
                height: level.height,
                bitrate: level.bitrate
            }))
            .sort((first, second) =>
                first.height - second.height || first.index - second.index
            );

        sortedLevels.forEach(level => {
            const option = document.createElement("option");
            option.value = String(level.index);
            option.textContent = level.height
                ? `${level.height}p`
                : `${Math.round(level.bitrate / 1000)} kbps`;

            qualitySelect.append(option);
        });

        qualitySelect.disabled = sortedLevels.length === 0;
        qualityStatus.textContent = sortedLevels.length
            ? `${sortedLevels.length} quality level(s) available`
            : "No quality levels available";
    }

    function destroyPlayer() {
        if (destroyed) return;

        destroyed = true;

        if (hls) {
            hls.destroy();
            hls = undefined;
        }
    }

    function initializePlayer() {
        if (window.Hls && Hls.isSupported()) {
            hls = new Hls({
                enableWorker: true,
                capLevelToPlayerSize: true
            });

            hls.attachMedia(video);
            hls.loadSource(source);

            hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
                initializeQualityOptions(data.levels);
                qualityStatus.textContent = "Ready to play";
                hideMessage();
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
                if (data.level < 0) {
                    qualityStatus.textContent = "Automatic quality";
                    return;
                }

                const level = hls.levels[data.level];
                qualityStatus.textContent = level.height
                    ? `Playing at ${level.height}p`
                    : "Quality switched";
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (!data.fatal) return;

                qualityStatus.textContent = "Playback error";
                showMessage(
                    "Unable to play this video. Verify that processing completed and the HLS files are accessible.",
                    "danger"
                );

                destroyPlayer();
            });

            qualitySelect.addEventListener("change", () => {
                if (hls && !destroyed) {
                    hls.currentLevel = Number.parseInt(
                        qualitySelect.value, 10
                    );
                }
            });

            return;
        }

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = source;
            qualitySelect.disabled = true;
            qualitySelect.title =
                "Manual quality selection is unavailable with native HLS playback.";
            qualityStatus.textContent = "Native HLS playback";
            return;
        }

        qualitySelect.disabled = true;
        qualityStatus.textContent = "Unsupported browser";
        showMessage(
            "This browser does not support HLS playback. Try a supported browser.",
            "warning"
        );
    }

    title.textContent = `Video #${videoId}`;
    initializePlayer();

    window.addEventListener("pagehide", destroyPlayer, { once: true });
})();