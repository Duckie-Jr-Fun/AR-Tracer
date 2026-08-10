// --- Element Selection ---
const cameraFeed = document.getElementById('camera-feed');
const traceImage = document.getElementById('trace-image');
const imageUpload = document.getElementById('image-upload');
const removeBgToggle = document.getElementById('remove-bg-toggle');
const opacitySlider = document.getElementById('opacity-slider');
const scaleSlider = document.getElementById('scale-slider');
const hideUiBtn = document.getElementById('hide-ui-btn');
const showUiBtn = document.getElementById('show-ui-btn');
const uiPanel = document.getElementById('ui-panel');

// --- 1. Rear Camera Setup ---
async function startCamera() {
    try {
        // Request the environment (back) camera
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        cameraFeed.srcObject = stream;
    } catch (err) {
        console.error("Error accessing the camera: ", err);
        alert("Could not access the back camera. Please check permissions.");
    }
}
startCamera();

// --- 2. Image Upload Handling ---
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
// Prevents the screen from turning off while you are tracing
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
    }
}

// Request lock initially and re-request if the user switches tabs and comes back
requestWakeLock();
document.addEventListener('visibilitychange', () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
    }
});

// --- 5. Movement & Scaling Logic (Dragging) ---
let currentScale = 1;
let currentX = 0;
let currentY = 0;
let isDragging = false;
let startX, startY, initialX, initialY;

// Prevent default browser drag behaviors (like trying to save the image)
traceImage.ondragstart = () => false;

function updateTransform() {
    traceImage.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
}

scaleSlider.addEventListener('input', (e) => {
    currentScale = e.target.value;
    updateTransform();
});

// Dragging Mechanics
function startDrag(clientX, clientY) {
    isDragging = true;
    startX = clientX;
    startY = clientY;
    initialX = currentX;
    initialY = currentY;
}

function drag(clientX, clientY) {
    if (!isDragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    currentX = initialX + dx;
    currentY = initialY + dy;
    updateTransform();
}

function stopDrag() {
    isDragging = false;
}

// Mobile Touch Events
traceImage.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (isDragging) {
        const touch = e.touches[0];
        drag(touch.clientX, touch.clientY);
    }
});

document.addEventListener('touchend', stopDrag);

// Desktop Mouse Events (Useful for testing on a computer)
traceImage.addEventListener('mousedown', (e) => {
    startDrag(e.clientX, e.clientY);
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) drag(e.clientX, e.clientY);
});

document.addEventListener('mouseup', stopDrag);
