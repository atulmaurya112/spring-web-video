(() => {
    "use strict";

    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = new Set([
        "mp4", "mov", "m4v", "mkv", "webm"
    ]);

    const form = document.getElementById("uploadForm");
    const titleInput = document.getElementById("title");
    const titleCount = document.getElementById("titleCount");
    const fileInput = document.getElementById("file");
    const dropZone = document.getElementById("dropZone");
    const chooseFile = document.getElementById("chooseFile");
    const removeFile = document.getElementById("removeFile");
    const selectedFile = document.getElementById("selectedFile");
    const fileName = document.getElementById("fileName");
    const fileSize = document.getElementById("fileSize");
    const uploadButton = document.getElementById("uploadButton");
    const message = document.getElementById("message");
    const progress = document.getElementById("uploadProgress");
    const progressBar = document.getElementById("progressBar");

    let uploading = false;

    titleInput.addEventListener("input", () => {
        titleCount.textContent = titleInput.value.length;
    });

    function formatBytes(bytes) {
        if (bytes < 1024) return `${bytes} B`;

        const units = ["KB", "MB", "GB", "TB"];
        let size = bytes / 1024;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    function showMessage(text, type) {
        message.className = `mt-3 alert alert-${type}`;
        message.textContent = text;
    }

    function validateFile(file) {
        if (!file) return "Please select a video file.";

        const extension = file.name.split(".").pop().toLowerCase();

        if (!ALLOWED_EXTENSIONS.has(extension)) {
            return "Unsupported file format. Choose MP4, MOV, M4V, MKV or WEBM.";
        }

        if (file.size === 0) {
            return "The selected file is empty.";
        }

        if (file.size > MAX_FILE_SIZE) {
            return "The maximum file size is 2 GB.";
        }

        return null;
    }

    function displayFile(file) {
        if (!file) return;

        const error = validateFile(file);

        if (error) {
            fileInput.value = "";
            selectedFile.classList.remove("visible");
            showMessage(error, "danger");
            return;
        }

        fileName.textContent = file.name;
        fileSize.textContent = formatBytes(file.size);
        selectedFile.classList.add("visible");
        message.replaceChildren();
        message.className = "mt-3";
    }

    chooseFile.addEventListener("click", () => {
        if (!uploading) fileInput.click();
    });

    dropZone.addEventListener("click", (event) => {
        if (uploading) return;

        if (event.target.closest("#removeFile")) return;
        if (event.target.closest("#chooseFile")) return;

        fileInput.click();
    });

    dropZone.addEventListener("keydown", (event) => {
        if (uploading) return;

        if (event.target !== dropZone) return;

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInput.click();
        }
    });

    fileInput.addEventListener("change", () => {
        displayFile(fileInput.files[0]);
    });

    removeFile.addEventListener("click", () => {
        if (uploading) return;

        fileInput.value = "";
        selectedFile.classList.remove("visible");
        message.replaceChildren();
        message.className = "mt-3";
    });

    ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            if (!uploading) dropZone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.remove("drag-over");
        });
    });

    dropZone.addEventListener("drop", (event) => {
        if (uploading) return;

        const files = event.dataTransfer.files;
        if (!files.length) return;

        fileInput.files = files;
        displayFile(files[0]);
    });

    function setUploading(value) {
        uploading = value;
        uploadButton.disabled = value;
        chooseFile.disabled = value;
        removeFile.disabled = value;
        titleInput.readOnly = value;
        fileInput.disabled = value;

        uploadButton.innerHTML = value
            ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span>Uploading…</span>'
            : '<i class="bi bi-cloud-arrow-up"></i><span>Upload and Process</span>';
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (uploading || !form.reportValidity()) return;

        const title = titleInput.value.trim();
        const file = fileInput.files[0];

        if (!title || title.length > 200) {
            showMessage("Enter a title between 1 and 200 characters.", "danger");
            return;
        }

        const fileError = validateFile(file);
        if (fileError) {
            showMessage(fileError, "danger");
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        setUploading(true);
        progress.classList.remove("d-none");
        progressBar.style.width = "0%";
        progress.setAttribute("aria-valuenow", "0");
        showMessage("Uploading your video…", "info");

        xhr.open("POST", "/videos/api/upload");
        xhr.responseType = "json";

        xhr.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable) return;

            const percentage = Math.round(
                (event.loaded / event.total) * 100
            );

            progressBar.style.width = `${percentage}%`;
            progress.setAttribute("aria-valuenow", String(percentage));
            showMessage(`Uploading your video… ${percentage}%`, "info");
        });

        xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                progressBar.style.width = "100%";
                progress.setAttribute("aria-valuenow", "100");
                showMessage(
                    "Upload successful! Video processing has started.",
                    "success"
                );

                window.setTimeout(() => {
                    window.location.assign("/videos");
                }, 1200);
                return;
            }

            const response = xhr.response;
            const error = response && response.message
                ? response.message
                : "Upload failed. Please try again.";

            showMessage(error, "danger");
            setUploading(false);
        });

        xhr.addEventListener("error", () => {
            showMessage("Network error. Check your connection and retry.", "danger");
            setUploading(false);
        });

        xhr.addEventListener("abort", () => {
            showMessage("Upload was cancelled.", "warning");
            setUploading(false);
        });

        xhr.send(formData);
    });
})();