
// ==========================================
// CLIPFORGE — MAIN JAVASCRIPT
// ==========================================

// 1. HTML ELEMENTS
const fileInput = document.getElementById("videoFile");
const video = document.getElementById("videoPreview");
const videoInfo = document.getElementById("videoInfo");

const startInput = document.getElementById("startTime");
const endInput = document.getElementById("endTime");

const addButton = document.getElementById("addButton");
const previewButton = document.getElementById("previewButton");
const clipList = document.getElementById("clipList");

const transcribeButton = document.getElementById("transcribeButton");
const transcriptionStatus = document.getElementById("transcriptionStatus");
const transcriptResults = document.getElementById("transcriptResults");

// 2. BACKEND CONNECTION
// Keep your actual Render URL here, without a trailing slash.
const API_URL = "https://clipforge-backend-kxds.onrender.com";

// 3. APP VARIABLES
let videoURL = null;
let duration = 0;
let clips = [];
let previewEnd = null;

// 4. FORMAT TIME
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);

    return minutes + ":" + String(remaining).padStart(2, "0");
}

// ==========================================
// 5. VIDEO UPLOAD AND PREVIEW
// ==========================================

fileInput.addEventListener("change", function () {
    const file = fileInput.files[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {
        alert("Please select a valid video file.");
        fileInput.value = "";
        return;
    }

    // Release previous video URL
    if (videoURL) {
        URL.revokeObjectURL(videoURL);
    }

    videoURL = URL.createObjectURL(file);
    duration = 0;
    previewEnd = null;

    video.pause();
    video.src = videoURL;
    video.load();

    videoInfo.textContent = "Loading video...";

    video.onloadedmetadata = function () {
        duration = video.duration;

        if (!Number.isFinite(duration) || duration <= 0) {
            videoInfo.textContent = "Unable to read video duration.";
            return;
        }

        videoInfo.textContent =
            file.name + " | Duration: " + formatTime(duration);

        startInput.value = 0;
        endInput.value = Math.min(15, duration);

        startInput.max = duration;
        endInput.max = duration;

        clips = [];
        renderClips();
    };

    video.onerror = function () {
        videoInfo.textContent = "Unable to preview this video.";
        alert("This video could not be opened. Try another video.");
    };
});

// Stop playback at the selected clip's end
video.addEventListener("timeupdate", function () {
    if (previewEnd !== null && video.currentTime >= previewEnd) {
        video.pause();
        video.currentTime = previewEnd;
        previewEnd = null;
    }
});

// ==========================================
// 6. PREVIEW SELECTED CLIP
// ==========================================

previewButton.addEventListener("click", function () {
    if (!videoURL || duration <= 0) {
        alert("Please upload a video first.");
        return;
    }

    const from = Number(startInput.value);
    const to = Number(endInput.value);

    if (
        !Number.isFinite(from) ||
        !Number.isFinite(to) ||
        from < 0 ||
        from >= duration ||
        to <= from ||
        to > duration
    ) {
        alert("Please enter valid clip times.");
        return;
    }

    previewEnd = to;
    video.currentTime = from;

    video.play().catch(function () {
        alert("Tap the video play button to start playback.");
    });
});

// ==========================================
// 7. ADD CLIP
// ==========================================

addButton.addEventListener("click", function () {
    if (!videoURL || duration <= 0) {
        alert("Upload a video first.");
        return;
    }

    const from = Number(startInput.value);
    const to = Number(endInput.value);

    if (
        !Number.isFinite(from) ||
        !Number.isFinite(to) ||
        from < 0 ||
        from >= duration ||
        to <= from ||
        to > duration
    ) {
        alert("Please enter valid start and end times.");
        return;
    }

    clips.push({
        id: Date.now() + Math.random(),
        start: from,
        end: to
    });

    renderClips();
});

// ==========================================
// 8. DISPLAY AND REMOVE CLIPS
// ==========================================

function renderClips() {
    clipList.innerHTML = "";

    if (clips.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "Your clips will appear here.";
        clipList.appendChild(empty);
        return;
    }

    clips.forEach(function (clip, index) {
        const card = document.createElement("div");
        card.className = "clip-card";

        const title = document.createElement("div");
        title.className = "clip-title";
        title.textContent = "✂ Clip " + (index + 1);

        const time = document.createElement("div");
        time.className = "clip-time";

        time.textContent =
            formatTime(clip.start) +
            " – " +
            formatTime(clip.end) +
            " (" +
            (clip.end - clip.start).toFixed(1) +
            " seconds)";

        const remove = document.createElement("button");
        remove.className = "remove-button";
        remove.textContent = "Remove";

        remove.addEventListener("click", function () {
            clips = clips.filter(function (item) {
                return item.id !== clip.id;
            });

            renderClips();
        });

        card.appendChild(title);
        card.appendChild(time);
        card.appendChild(remove);

        clipList.appendChild(card);
    });
}

// ==========================================
// 9. AI TRANSCRIPTION
// ==========================================

transcribeButton.addEventListener("click", async function () {
    const file = fileInput.files[0];

    if (!file) {
        alert("Please upload a video first.");
        return;
    }

    if (file.size > 25 * 1024 * 1024) {
        alert("This first version supports videos up to 25 MB.");
        return;
    }

    const formData = new FormData();

    formData.append("file", file);

    const language = document.getElementById("language").value;

    if (language) {
        formData.append("language", language);
    }

    transcribeButton.disabled = true;

    transcriptionStatus.textContent =
        "AI is processing your video...";

    transcriptResults.innerHTML = "";

    try {
        const response = await fetch(
            API_URL + "/api/transcribe",
            {
                method: "POST",
                body: formData
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.detail || "Transcription failed."
            );
        }

        const segments = result.segments || [];

        if (segments.length === 0) {
            transcriptResults.textContent =
                result.text || "No speech was detected.";
        } else {
            segments.forEach(function (segment) {
                const card = document.createElement("div");
                card.className = "transcript-line";

                const time = document.createElement("div");
                time.className = "transcript-time";

                time.textContent =
                    Number(segment.start).toFixed(1) +
                    "s – " +
                    Number(segment.end).toFixed(1) + "s";

                const text = document.createElement("div");
                text.className = "transcript-text";
                text.textContent = segment.text;

                card.appendChild(time);
                card.appendChild(text);

                transcriptResults.appendChild(card);
            });
        }

        transcriptionStatus.textContent =
            "Transcription completed successfully!";

    } catch (error) {
        transcriptionStatus.textContent =
            "Error: " + error.message;

    } finally {
        transcribeButton.disabled = false;
    }
});
