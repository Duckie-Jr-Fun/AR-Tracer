// --- DOM Elements ---
const cameraFeed = document.getElementById('camera-feed');
const traceImage = document.getElementById('trace-image');
const imageUpload = document.getElementById('image-upload');
const bgToleranceSlider = document.getElementById('bg-tolerance');
const opacitySlider = document.getElementById('opacity-slider');
const scaleSlider = document.getElementById('scale-slider');
const hideUiBtn = document.getElementById('hide-ui-btn');
const showUiBtn = document.getElementById('show-ui-btn');
const uiPanel = document.getElementById('ui-panel');
const torchGroup = document.getElementById('torch-group');
const torchToggle = document.getElementById('torch-toggle');

let videoTrack = null;

// Variables for true background removal
let originalImageData = null;
const processingCanvas = document.createElement('canvas');
const ctx = processingCanvas.getContext('2d', { willReadFrequently: true });

// --- 1. Camera & Flashlight Setup ---
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        cameraFeed.srcObject = stream;
        videoTrack = stream.getVideoTracks()[0];
        
        if (videoTrack.getCapabilities().torch) {
            torchGroup.style.display = 'flex';
        }
    } catch (err) {
        console.error("Camera error: ", err);
        alert("Could not access the camera. Please check permissions.");
    }
}
startCamera();

torchToggle.addEventListener('change', async (e) => {
    if (videoTrack) {
        try {
            await videoTrack.applyConstraints({ advanced: [{ torch: e.target.checked }] });
        } catch (err) {
            console.error("Flashlight error: ", err);
            e.target.checked = !e.target.checked;
        }
    }
});

// --- 2. Image Upload & Canvas Processing ---
imageUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Set canvas to match image size
                processingCanvas.width = img.width;
                processingCanvas.height = img.height;
                
                // Draw image and save the raw, original pixel data
                ctx.drawImage(img, 0, 0);
                originalImageData = ctx.getImageData(0, 0, img.width, img.height);
                
                // Reset sliders and position
                bgToleranceSlider.value = 0;
                currentX = 0; currentY = 0; currentScale = 1;
                scaleSlider.value = 1; updateTransform();
                
                // Show it
                processBackground(); 
                traceImage.style.display = 'block';
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// --- True Pixel-Level Background Removal ---
function processBackground() {
    if (!originalImageData) return;
    
    const tolerance = parseInt(bgToleranceSlider.value);
    
    // If slider is at 0, just show the original image
    if (tolerance === 0) {
        ctx.putImageData(originalImageData, 0, 0);
        traceImage.src = processingCanvas.toDataURL();
        return;
    }

    // Create a fresh copy of the pixels to modify
    const newImageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );
    const data = newImageData.data;

    // Calculate the cutoff point (100 slider = aggressive deletion, 1 = slight deletion)
    const threshold = 255 - (tolerance * 2.5); 

    // Loop through every single pixel
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // If the pixel is lighter than the threshold, make it completely transparent (Alpha = 0)
        if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0; 
        }
    }

    // Put the modified pixels back on the canvas and update the image
    ctx.putImageData(newImageData, 0, 0);
    traceImage.src = processingCanvas.toDataURL();
}

// Listen for slider changes
bgToleranceSlider.addEventListener('input', processBackground);

// --- 3. UI Controls ---
opacitySlider.addEventListener('input', (e) => traceImage.style.opacity = e.target.value);

hideUiBtn.addEventListener('click', () => {
    uiPanel.style.display = 'none';
    showUiBtn.style.display = 'block';
});
showUiBtn.addEventListener('click', () => {
    uiPanel.style.display = 'block';
    showUiBtn.style.display = 'none';
});

// --- 4. Screen Wake Lock ---
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {}
}
requestWakeLock();
document.addEventListener('visibilitychange', () => {
    if (wakeLock !== null && document.visibilityState === 'visible') requestWakeLock();
});

// --- 5. Dragging & Scaling Logic ---
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

traceImage.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
document.addEventListener('touchmove', (e) => { if (isDragging) drag(e.touches[0].clientX, e.touches[0].clientY); });
document.addEventListener('touchend', stopDrag);

traceImage.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
document.addEventListener('mousemove', (e) => { if (isDragging) drag(e.clientX, e.clientY); });
document.addEventListener('mouseup', stopDrag);
