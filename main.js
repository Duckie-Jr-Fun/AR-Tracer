const cameraFeed = document.getElementById('camera-feed');
const traceImage = document.getElementById('trace-image');
const imageUpload = document.getElementById('image-upload');
const removeBgToggle = document.getElementById('remove-bg-toggle');
const opacitySlider = document.getElementById('opacity-slider');
const scaleSlider = document.getElementById('scale-slider');
const hideUiBtn = document.getElementById('hide-ui-btn');
const showUiBtn = document.getElementById('show-ui-btn');
const uiPanel = document.getElementById('ui-panel');
const torchBtn = document.getElementById('torch-btn');

let videoTrack = null;
let torchOn = false;

// --- Camera & Flashlight Setup ---
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        cameraFeed.srcObject = stream;
        
        // Save the video track to control the flashlight
        videoTrack = stream.getVideoTracks()[0];
        
        // Check if device has a flashlight
        const capabilities = videoTrack.getCapabilities();
        if (!capabilities.torch) {
            torchBtn.style.display = 'none'; // Hide button if no flashlight
        }
    } catch (err) {
        console.error("Camera error: ", err);
        alert("Could not access the camera.");
    }
}
startCamera();

torchBtn.addEventListener('click', async () => {
    if (videoTrack) {
        try {
            torchOn = !torchOn;
            await videoTrack.applyConstraints({
                advanced: [{ torch: torchOn }]
            });
            torchBtn.style.background = torchOn ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
        } catch (err) {
            console.error("Flashlight error: ", err);
        }
    }
});

// --- Image Upload ---
imageUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            traceImage.src = event.target.result;
            traceImage.style.display = 'block';
            
            // Reset position
            currentX = 0; currentY = 0; currentScale = 1;
            scaleSlider.value = 1; updateTransform();
        }
        reader.readAsDataURL(file);
    }
});

// --- UI Controls ---
opacitySlider.addEventListener('input', (e) => traceImage.style.opacity = e.target.value);

removeBgToggle.addEventListener('change', (e) => {
    e.target.checked ? traceImage.classList.add('remove-bg') : traceImage.classList.remove('remove-bg');
});

hideUiBtn.addEventListener('click', () => {
    uiPanel.style.display = 'none';
    showUiBtn.style.display = 'block';
});

showUiBtn.addEventListener('click', () => {
    uiPanel.style.display = 'block';
    showUiBtn.style.display = 'none';
});

// --- Screen Wake Lock ---
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.warn(`Wake Lock error: ${err.message}`);
    }
}
requestWakeLock();
document.addEventListener('visibilitychange', () => {
    if (wakeLock !== null && document.visibilityState === 'visible') requestWakeLock();
});

// --- Dragging & Scaling Logic ---
let currentScale = 1, currentX = 0, currentY = 0;
let isDragging = false, startX, startY, initialX, initialY;

traceImage.ondragstart = () => false;

function updateTransform() {
    traceImage.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
}

scaleSlider.addEventListener('input', (e) => {
    currentScale = e.target.value; updateTransform();
});

function startDrag(clientX, clientY) {
    isDragging = true; startX = clientX; startY = clientY;
    initialX = currentX; initialY = currentY;
}
function drag(clientX, clientY) {
    if (!isDragging) return;
    currentX = initialX + (clientX - startX);
    currentY = initialY + (clientY - startY);
    updateTransform();
}
function stopDrag() { isDragging = false; }

// Touch
traceImage.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
document.addEventListener('touchmove', (e) => { if (isDragging) drag(e.touches[0].clientX, e.touches[0].clientY); });
document.addEventListener('touchend', stopDrag);

// Mouse
traceImage.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
document.addEventListener('mousemove', (e) => { if (isDragging) drag(e.clientX, e.clientY); });
document.addEventListener('mouseup', stopDrag);
