/* Camera capture sheet: mandatory photo (or 1-2 min clip) at every checkpoint.
   If capture fails, submission is blocked and the user is prompted to retry. */
'use strict';

const Camera = {
  stream: null, recorder: null, chunks: [], timer: null, seconds: 0, recording: false,

  open() {
    return new Promise((resolve, reject) => {
      this._resolve = resolve; this._reject = reject;
      this._showSheet();
    });
  },

  async _showSheet() {
    const sheet = document.getElementById('camera-sheet');
    const video = document.getElementById('cam-video');
    sheet.classList.remove('hidden');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      video.srcObject = this.stream;
      await video.play();
    } catch (e) {
      toast('Camera access failed: ' + e.message + ' — capture is required.', 'err');
      this._close(false, null);
      return;
    }
    document.getElementById('cam-shutter').onclick = () => this._snap();
    document.getElementById('cam-clip').onclick = () => this._toggleRecord();
    document.getElementById('cam-cancel').onclick = () => {
      toast('Capture cancelled — a photo is required to log a checkpoint.', 'err');
      this._close(false, null);
    };
  },

  _snap() {
    const video = document.getElementById('cam-video');
    const canvas = document.getElementById('cam-canvas');
    if (!video.videoWidth) { toast('Camera not ready — retry.', 'err'); return; }
    // Downscale to max 960px wide for fast 4G upload (<5s budget).
    const scale = Math.min(1, 960 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    // Mirror preview is common; keep stored image un-mirrored for ID accuracy.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    this._close(true, { media_b64: dataUrl, media_type: 'image/jpeg' });
  },

  _toggleRecord() {
    if (this.recording) return this._stopRecord();
    try {
      this.chunks = [];
      this.recorder = new MediaRecorder(this.stream, { mimeType: 'video/webm' });
    } catch (e) { toast('Video recording unsupported; use photo capture.', 'err'); return; }
    this.recorder.ondataavailable = e => this.chunks.push(e.data);
    this.recorder.onstop = async () => {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      // Convert first frame? Keep clip: browsers upload as base64 (cap ~2 min).
      if (blob.size > 18 * 1024 * 1024) {
        toast('Clip too large; capturing a photo instead. Clip must be short.', 'err');
        return;
      }
      const dataUrl = await new Promise(res => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.readAsDataURL(blob);
      });
      this._close(true, { media_b64: dataUrl, media_type: 'video/webm' });
    };
    this.recorder.start(1000);
    this.recording = true;
    this.seconds = 0;
    const t = document.getElementById('cam-timer');
    t.classList.remove('hidden');
    this.timer = setInterval(() => {
      this.seconds++;
      t.textContent = `REC ${Math.floor(this.seconds / 60)}:${String(this.seconds % 60).padStart(2, '0')}`;
      // Hard stop at 2 minutes (spec: 1-2 minute clip).
      if (this.seconds >= 120) this._stopRecord();
    }, 1000);
    document.getElementById('cam-clip').textContent = '⏹ Stop & Use';
  },

  _stopRecord() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    document.getElementById('cam-timer').classList.add('hidden');
    document.getElementById('cam-clip').textContent = '🎥 Record Clip';
    if (this.recorder && this.recording) { this.recording = false; this.recorder.stop(); }
  },

  _close(success, payload) {
    this._stopRecord();
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    document.getElementById('cam-video').srcObject = null;
    document.getElementById('camera-sheet').classList.add('hidden');
    if (success) this._resolve(payload);
    else this._reject(new Error('Capture required'));
  },
};
