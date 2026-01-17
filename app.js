const app = {
    video: null,
    canvas: null,
    ctx: null,
    frameOverlay: null,
    stream: null,

    // Config
    frames: [
        'assets/frames/frame1.png',
        'assets/frames/frame2.png',
        'assets/frames/frame3.png'
    ],
    currentFrameIndex: 0,
    facingMode: 'environment', // Default to back camera

    init: async () => {
        // Elements
        app.video = document.getElementById('camera-feed');
        app.canvas = document.getElementById('capture-canvas');
        app.ctx = app.canvas.getContext('2d');
        app.frameOverlay = document.getElementById('frame-overlay');

        // Buttons
        document.getElementById('camera-container').addEventListener('click', app.switchFrame);
        document.getElementById('shutter-btn').addEventListener('click', app.takePicture);
        document.getElementById('switch-camera-btn').addEventListener('click', app.toggleCamera);
        document.getElementById('retake-btn').addEventListener('click', app.retake);
        document.getElementById('retry-btn').addEventListener('click', () => location.reload());

        // Initial Frame
        app.updateFrame();

        // Start Camera
        await app.startCamera();
    },

    startCamera: async () => {
        const constraints = {
            audio: false,
            video: {
                facingMode: app.facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        try {
            app.stream = await navigator.mediaDevices.getUserMedia(constraints);
            app.video.srcObject = app.stream;

            // Mirroring if front camera
            if (app.facingMode === 'user') {
                app.video.classList.add('mirrored');
            } else {
                app.video.classList.remove('mirrored');
            }

            // Hide error if previously shown
            document.getElementById('error-overlay').classList.add('hidden');

        } catch (err) {
            console.error('Camera Error:', err);
            app.showError(err);
        }
    },

    showError: (err) => {
        const errorOverlay = document.getElementById('error-overlay');
        const errorMsg = document.getElementById('error-message');
        errorOverlay.classList.remove('hidden');

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMsg.textContent = 'カメラの使用が許可されていません。\nブラウザの設定から許可してください。';
        } else if (err.name === 'NotFoundError') {
            errorMsg.textContent = 'カメラが見つかりませんでした。';
        } else {
            errorMsg.textContent = 'カメラの起動に失敗しました: ' + err.name;
        }
    },

    toggleCamera: async (e) => {
        e.stopPropagation(); // Prevent frame switch

        if (app.stream) {
            app.stream.getTracks().forEach(track => track.stop());
        }

        app.facingMode = app.facingMode === 'environment' ? 'user' : 'environment';
        await app.startCamera();
    },

    switchFrame: (e) => {
        // Prevent switching if clicking buttons (should be handled by z-index/propagation but just in case)
        if (e.target.closest('button')) return;

        app.currentFrameIndex = (app.currentFrameIndex + 1) % app.frames.length;
        app.updateFrame();

        // Visual feedback (optional)
        app.frameOverlay.style.opacity = '0.5';
        setTimeout(() => app.frameOverlay.style.opacity = '1', 100);
    },

    updateFrame: () => {
        app.frameOverlay.src = app.frames[app.currentFrameIndex];
    },

    takePicture: async (e) => {
        e.stopPropagation();

        // 1. Set canvas size to match video resolution
        const videoWidth = app.video.videoWidth;
        const videoHeight = app.video.videoHeight;

        app.canvas.width = videoWidth;
        app.canvas.height = videoHeight;

        // 2. Draw Video
        app.ctx.save();
        if (app.facingMode === 'user') {
            app.ctx.scale(-1, 1);
            app.ctx.drawImage(app.video, -videoWidth, 0, videoWidth, videoHeight);
        } else {
            app.ctx.drawImage(app.video, 0, 0, videoWidth, videoHeight);
        }
        app.ctx.restore();

        // 3. Draw Frame
        // Note: The frame image might need to be drawn with 'cover' aspect ratio manually if aspect ratios differ
        // For MVP, we assume the frame is designed for the ratio or we simply draw it to fill.
        // Let's draw it to fill the canvas.
        const frameImg = new Image();
        frameImg.crossOrigin = 'anonymous';
        frameImg.src = app.frames[app.currentFrameIndex];

        await new Promise(resolve => {
            if (frameImg.complete) resolve();
            frameImg.onload = resolve;
        });

        app.ctx.drawImage(frameImg, 0, 0, videoWidth, videoHeight);

        // 4. Show Preview
        const dataURL = app.canvas.toDataURL('image/png');
        const previewImg = document.getElementById('preview-image');
        previewImg.src = dataURL;

        document.getElementById('preview-modal').classList.remove('hidden');
    },

    retake: () => {
        document.getElementById('preview-modal').classList.add('hidden');
        const previewImg = document.getElementById('preview-image');
        previewImg.src = ''; // clear memory
    }
};

// Start app
window.addEventListener('DOMContentLoaded', app.init);
