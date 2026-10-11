(() => {
    "use strict";

    const API_URL = "/videos/api";
    const REFRESH_INTERVAL = 5000;

    const elements = {
        grid: document.getElementById("videoGrid"),
        search: document.getElementById("searchInput"),
        filter: document.getElementById("statusFilter"),
        sort: document.getElementById("sortOrder"),
        loading: document.getElementById("loadingState"),
        empty: document.getElementById("emptyState"),
        emptyTitle: document.getElementById("emptyTitle"),
        emptyDescription: document.getElementById("emptyDescription"),
        noResults: document.getElementById("noResults"),
        error: document.getElementById("loadError"),
        total: document.getElementById("totalCount"),
        completed: document.getElementById("completedCount"),
        processing: document.getElementById("processingCount"),
        failed: document.getElementById("failedCount"),
        footer: document.getElementById("footerText")
    };

    let videos = [];
    let timerId;
    let loading = false;
    let firstLoad = true;

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = String(text);
        }

        return element;
    }

    function formatDate(value) {
        if (!value) return "Date unavailable";

        const normalized = typeof value === "string"
            ? value.replace(" ", "T")
            : value;

        const date = new Date(normalized);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes < 0) return "Size unavailable";
        if (bytes < 1024) return `${bytes} B`;

        const units = ["KB", "MB", "GB", "TB"];
        let size = bytes / 1024;
        let index = 0;

        while (size >= 1024 && index < units.length - 1) {
            size /= 1024;
            index++;
        }

        return `${size.toFixed(1)} ${units[index]}`;
    }

    function statusInfo(status) {
        const statuses = {
            COMPLETED: {
                label: "Completed",
                css: "status-completed",
                icon: "bi-check-circle-fill"
            },
            PROCESSING: {
                label: "Processing",
                css: "status-processing",
                icon: "bi-gear-fill"
            },
            FAILED: {
                label: "Failed",
                css: "status-failed",
                icon: "bi-exclamation-circle-fill"
            }
        };

        return statuses[status] || {
            label: "Unknown",
            css: "status-failed",
            icon: "bi-question-circle-fill"
        };
    }

    function updateStatistics() {
        elements.total.textContent = videos.length;
        elements.completed.textContent =
            videos.filter(video => video.status === "COMPLETED").length;
        elements.processing.textContent =
            videos.filter(video => video.status === "PROCESSING").length;
        elements.failed.textContent =
            videos.filter(video => video.status === "FAILED").length;
    }

    function createThumbnail(video) {
        const thumbnail = createElement("div", "thumbnail");
        const icon = createElement("i", "bi bi-film");

        icon.setAttribute("aria-hidden", "true");
        thumbnail.append(icon);

        /*
         * Optional future enhancement:
         * If the API returns a trusted thumbnail URL, replace this
         * placeholder with an image using that URL.
         */
        return thumbnail;
    }

    function createVideoCard(video) {
        const card = createElement("article", "video-card");
        const thumbnail = createThumbnail(video);
        const status = statusInfo(video.status);

        const badge = createElement(
            "span",
            `status-badge ${status.css}`
        );

        const badgeIcon = createElement("i", `bi ${status.icon}`);
        badgeIcon.setAttribute("aria-hidden", "true");
        badge.append(badgeIcon, document.createTextNode(status.label));
        thumbnail.append(badge);

        card.append(thumbnail);

        const body = createElement("div", "video-body");
        const title = createElement("h2", "video-title", video.title || "Untitled video");
        body.append(title);

        const metadata = createElement("div", "video-meta");

        const date = createElement("span");
        const dateIcon = createElement("i", "bi bi-calendar3");
        dateIcon.setAttribute("aria-hidden", "true");
        date.append(dateIcon, document.createTextNode(formatDate(video.createdAt)));

        const file = createElement("span");
        const fileIcon = createElement("i", "bi bi-file-earmark");
        fileIcon.setAttribute("aria-hidden", "true");
        file.append(fileIcon, document.createTextNode(
            video.fileSize != null
                ? formatBytes(Number(video.fileSize))
                : "Video file"
        ));

        metadata.append(date, file);
        body.append(metadata);

        const actions = createElement("div", "card-actions");

        if (video.status === "COMPLETED") {
            const play = createElement("a", "btn-play");
            play.href = `/videos/watch/${encodeURIComponent(video.id)}`;

            const playIcon = createElement("i", "bi bi-play-fill");
            playIcon.setAttribute("aria-hidden", "true");

            play.append(playIcon, document.createTextNode("Play Video"));
            actions.append(play);
        } else if (video.status === "PROCESSING") {
            const processing = createElement("div", "btn-processing");

            const spinner = createElement("span", "processing-spinner");
            spinner.setAttribute("aria-hidden", "true");

            processing.append(
                spinner,
                document.createTextNode("Processing...")
            );

            processing.setAttribute("role", "status");
            actions.append(processing);
        } else {
            const failed = createElement("div", "btn-failed");
            const failedIcon = createElement("i", "bi bi-exclamation-circle-fill");
            failedIcon.setAttribute("aria-hidden", "true");

            failed.append(
                failedIcon,
                document.createTextNode("Processing failed")
            );

            failed.title = video.errorMessage || "Video processing failed";
            actions.append(failed);
        }

        body.append(actions);
        card.append(body);

        return card;
    }

    function getFilteredVideos() {
        const query = elements.search.value.trim().toLocaleLowerCase();
        const selectedStatus = elements.filter.value;
        const sortOrder = elements.sort.value;

        const result = videos.filter(video => {
            const matchesTitle = String(video.title || "")
                .toLocaleLowerCase()
                .includes(query);

            const matchesStatus = selectedStatus === "ALL"
                || video.status === selectedStatus;

            return matchesTitle && matchesStatus;
        });

        result.sort((first, second) => {
            if (sortOrder === "TITLE") {
                return String(first.title || "").localeCompare(
                    String(second.title || "")
                );
            }

            const firstDate = new Date(first.createdAt || 0).getTime();
            const secondDate = new Date(second.createdAt || 0).getTime();

            return sortOrder === "OLDEST"
                ? firstDate - secondDate
                : secondDate - firstDate;
        });

        return result;
    }

    function renderVideos() {
        const filteredVideos = getFilteredVideos();
        const fragment = document.createDocumentFragment();

        filteredVideos.forEach(video => {
            fragment.append(createVideoCard(video));
        });

        elements.grid.replaceChildren(fragment);

        const hasVideos = videos.length > 0;
        const hasResults = filteredVideos.length > 0;

        elements.empty.classList.toggle("d-none", hasVideos);
        elements.grid.classList.toggle("d-none", !hasResults);
        elements.noResults.classList.toggle(
            "d-none",
            !hasVideos || hasResults
        );

        if (!hasVideos) {
            elements.emptyTitle.textContent = "Your library is empty";
            elements.emptyDescription.textContent =
                "Upload your first video to get started.";
        }

        elements.footer.textContent = hasVideos
            ? `Showing ${filteredVideos.length} of ${videos.length} videos`
            : "Your videos, all in one place";
    }

    async function loadVideos() {
        if (loading) return;

        loading = true;

        try {
            const response = await fetch(API_URL, {
                headers: { Accept: "application/json" },
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("Unable to load your videos.");
            }

            const result = await response.json();

            if (!Array.isArray(result)) {
                throw new Error("Unexpected response from the server.");
            }

            videos = result;
            updateStatistics();
            renderVideos();

            elements.error.classList.add("d-none");
            elements.loading.classList.add("d-none");
            firstLoad = false;
        } catch {
            elements.error.textContent =
                "Could not load videos. Check the server connection and try again.";
            elements.error.classList.remove("d-none");

            if (firstLoad) {
                elements.loading.classList.add("d-none");
            }
        } finally {
            loading = false;
        }
    }

    elements.search.addEventListener("input", renderVideos);
    elements.filter.addEventListener("change", renderVideos);
    elements.sort.addEventListener("change", renderVideos);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            window.clearInterval(timerId);
        } else {
            loadVideos();
            timerId = window.setInterval(loadVideos, REFRESH_INTERVAL);
        }
    });

    loadVideos();
    timerId = window.setInterval(loadVideos, REFRESH_INTERVAL);
})();