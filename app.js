// --- DOM Elements ---
const cameraFeed = document.getElementById('camera-feed');
const traceImage = document.getElementById('trace-image');
const imageUpload = document.getElementById('image-upload');
const removeBgToggle = document.getElementById('remove-bg-toggle');
const opacitySlider = document.getElementById('opacity-slider');
const scaleSlider = document.getElementById('scale-slider');
const hideUiBtn = document.getElementById('hide-ui-btn');
const showUiBtn = document.getElementById('show-ui-btn');
const uiPanel = document.getElementById('ui-panel');
const torchGroup = document.getElementById('torch-group');
const torchToggle = document.getElementById('torch-toggle');

let videoTrack = null;
let torchOn = false;

// --- 1. Camera & Flashlight Setup ---
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        cameraFeed.srcObject = stream;
        
        // Save the video track to control the flashlight
        videoTrack = stream.getVideoTracks()[0];
        
        // Check if device has a flashlight and show the button if it does
        const capabilities = videoTrack.getCapabilities();
        if (capabilities.torch) {
            torchBtn.style.display = 'inline-block';
        }
    } catch (err) {
        console.error("Camera error: ", err);
        alert("Could not access the camera. Please check permissions.");
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
            // Highlight the button when the flashlight is on
            torchBtn.style.background = torchOn ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
        } catch (err) {
            console.error("Flashlight error: ", err);
        }
    }
});

// --- 2. Image Upload ---
imageUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            traceImage.src = event.target.result;
            traceImage.style.display = 'block';
            
            // Reset position and scale when a new image is loaded
            currentX = 0; 
            currentY = 0; 
            currentScale = 1;
            scaleSlider.value = 1; 
            updateTransform();
        }
        reader.readAsDataURL(file);
    }
});

// --- 3. UI Controls ---
opacitySlider.addEventListener('input', (e) => {
    traceImage.style.opacity = e.target.value;
});

removeBgToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        traceImage.classList.add('remove-bg');
    } else {
        traceImage.classList.remove('remove-bg');
    }
});

hideUiBtn.addEventListener('click', () => {
    uiPanel.style.display = 'none';
    showUiBtn.style.display = 'block';
});

showUiBtn.addEventListener('click', () => {
    uiPanel.style.display = 'block';
    showUiBtn.style.display = 'none';
});

// --- 4. Screen Wake Lock API ---
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

// Re-request lock if the user leaves the app and comes back
document.addEventListener('visibilitychange', () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
    }
});

// --- 5. Dragging & Scaling Logic ---
let currentScale = 1;
let currentX = 0;
let currentY = 0;
let isDragging = false;
let startX, startY, initialX, initialY;

// Prevent default browser behavior on drag
traceImage.ondragstart = () => false;

function updateTransform() {
    traceImage.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
}

scaleSlider.addEventListener('input', (e) => {
    currentScale = e.target.value; 
    updateTransform();
});

// Movement math
function startDrag(clientX, clientY) {
    isDragging = true; 
    startX = clientX; 
    startY = clientY;
    initialX = currentX; 
    initialY = currentY;
}

function drag(clientX, clientY) {
    if (!isDragging) return;
    currentX = initialX + (clientX - startX);
    currentY = initialY + (clientY - startY);
    updateTransform();
}

function stopDrag() { 
    isDragging = false; 
}

// Mobile Touch Events
traceImage.addEventListener('touchstart', (e) => {
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

document.addEventListener('touchmove', (e) => { 
    if (isDragging) drag(e.touches[0].clientX, e.touches[0].clientY); 
});

document.addEventListener('touchend', stopDrag);

// Desktop Mouse Events (For testing on PC)
traceImage.addEventListener('mousedown', (e) => {
    startDrag(e.clientX, e.clientY);
});

document.addEventListener('mousemove', (e) => { 
    if (isDragging) drag(e.clientX, e.clientY); 
});

document.addEventListener('mouseup', stopDrag);
