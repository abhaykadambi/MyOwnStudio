// Audio Studio Application
class AudioStudio {
    constructor() {
        this.audioContext = null;
        this.currentOctave = 4;
        this.isRecording = false;
        this.recordedNotes = [];
        this.recordedAudioBuffer = null;
        this.recordingStartTime = 0;
        this.activeNotes = new Map(); // Track active notes for proper duration
        this.tracks = [];
        this.trackCounter = 0;
        this.isPlaying = false;
        this.playbackSources = [];
        this.pixelsPerSecond = 100; // Timeline scale
        
        this.init();
    }

    async init() {
        // Initialize Web Audio API
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            alert('Web Audio API not supported in this browser');
            return;
        }

        this.createPianoKeyboard();
        this.setupEventListeners();
        this.setupTimelineRuler();
        this.setupKeyboardShortcuts();
    }

    createPianoKeyboard() {
        const keyboard = document.getElementById('pianoKeyboard');
        keyboard.innerHTML = '';

        const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const whiteKeyWidth = 42;
        const whiteKeyMargin = 1;
        const blackKeyWidth = 26;
        
        // Create white keys first
        whiteKeys.forEach((note, index) => {
            const key = document.createElement('div');
            key.className = 'piano-key white-key';
            key.dataset.note = note;
            key.dataset.index = index;
            
            key.addEventListener('mousedown', () => this.playNote(note, true));
            key.addEventListener('mouseup', () => this.stopNote(note));
            key.addEventListener('mouseleave', () => this.stopNote(note));
            
            keyboard.appendChild(key);
        });

        // Create black keys positioned between white keys
        // C# between C and D, D# between D and E, F# between F and G, G# between G and A, A# between A and B
        const blackKeyNotes = ['C#', 'D#', 'F#', 'G#', 'A#'];
        const blackKeyPositions = [
            whiteKeyWidth * 1 - blackKeyWidth / 2,  // C# between C(0) and D(1)
            whiteKeyWidth * 2 - blackKeyWidth / 2,  // D# between D(1) and E(2)
            whiteKeyWidth * 4 - blackKeyWidth / 2,  // F# between F(3) and G(4)
            whiteKeyWidth * 5 - blackKeyWidth / 2,  // G# between G(4) and A(5)
            whiteKeyWidth * 6 - blackKeyWidth / 2   // A# between A(5) and B(6)
        ];
        
        blackKeyNotes.forEach((note, index) => {
            const key = document.createElement('div');
            key.className = 'piano-key black-key';
            key.dataset.note = note;
            key.style.left = `${blackKeyPositions[index]}px`;
            
            key.addEventListener('mousedown', () => this.playNote(note, true));
            key.addEventListener('mouseup', () => this.stopNote(note));
            key.addEventListener('mouseleave', () => this.stopNote(note));
            
            keyboard.appendChild(key);
        });
    }

    setupEventListeners() {
        // Recording controls
        document.getElementById('recordBtn').addEventListener('click', () => this.startRecording());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopRecording());
        document.getElementById('addToTimelineBtn').addEventListener('click', () => this.addToTimeline());
        
        // Playback controls
        document.getElementById('playBtn').addEventListener('click', () => this.startPlayback());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pausePlayback());
        document.getElementById('stopPlaybackBtn').addEventListener('click', () => this.stopPlayback());
        
        // Octave controls
        document.getElementById('octaveUp').addEventListener('click', () => this.changeOctave(1));
        document.getElementById('octaveDown').addEventListener('click', () => this.changeOctave(-1));
        
        // Volume control
        const volumeSlider = document.getElementById('volumeSlider');
        volumeSlider.addEventListener('input', (e) => {
            document.getElementById('volumeValue').textContent = e.target.value;
        });
    }

    setupKeyboardShortcuts() {
        // Map keyboard keys to piano notes
        const keyMap = {
            'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E',
            'f': 'F', 't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A',
            'u': 'A#', 'j': 'B'
        };

        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            const note = keyMap[e.key.toLowerCase()];
            if (note) {
                this.playNote(note, true);
            }
        });

        document.addEventListener('keyup', (e) => {
            const note = keyMap[e.key.toLowerCase()];
            if (note) {
                this.stopNote(note);
            }
        });
    }

    setupTimelineRuler() {
        const ruler = document.getElementById('timelineRuler');
        const duration = 60; // 60 seconds
        
        for (let i = 0; i <= duration; i++) {
            const mark = document.createElement('div');
            mark.className = 'ruler-mark';
            if (i % 4 === 0) {
                mark.className += ' major';
            }
            mark.style.left = `${i * this.pixelsPerSecond}px`;
            mark.textContent = `${i}s`;
            ruler.appendChild(mark);
        }
    }

    changeOctave(delta) {
        this.currentOctave = Math.max(0, Math.min(8, this.currentOctave + delta));
        document.getElementById('currentOctave').textContent = this.currentOctave;
    }

    getFrequency(note) {
        const noteFrequencies = {
            'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
            'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
            'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
        };
        
        const baseFreq = noteFrequencies[note] || 440;
        const octaveMultiplier = Math.pow(2, this.currentOctave - 4);
        return baseFreq * octaveMultiplier;
    }

    playNote(note, record = false) {
        const frequency = this.getFrequency(note);
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
        
        // Visual feedback
        const keyElement = document.querySelector(`[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.add('pressed');
        }

        // Record note if recording
        if (record && this.isRecording) {
            const time = this.audioContext.currentTime - this.recordingStartTime;
            const noteData = {
                note: note,
                frequency: frequency,
                time: time,
                duration: 0.5,
                startTime: time
            };
            this.activeNotes.set(note, noteData);
        }
    }

    stopNote(note) {
        const keyElement = document.querySelector(`[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.remove('pressed');
        }
        
        // Update recorded note duration
        if (this.isRecording && this.activeNotes.has(note)) {
            const noteData = this.activeNotes.get(note);
            const currentTime = this.audioContext.currentTime - this.recordingStartTime;
            noteData.duration = Math.max(0.1, currentTime - noteData.startTime);
            this.recordedNotes.push({...noteData});
            this.activeNotes.delete(note);
        }
    }

    async startRecording() {
        if (this.isRecording) return;
        
        this.isRecording = true;
        this.recordedNotes = [];
        this.activeNotes.clear();
        this.recordingStartTime = this.audioContext.currentTime;
        
        document.getElementById('recordBtn').classList.add('recording');
        document.getElementById('recordBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        document.getElementById('recordingIndicator').classList.add('active');
    }

    stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        
        // Finalize any active notes
        const currentTime = this.audioContext.currentTime - this.recordingStartTime;
        this.activeNotes.forEach((noteData) => {
            noteData.duration = Math.max(0.1, currentTime - noteData.startTime);
            this.recordedNotes.push({...noteData});
        });
        this.activeNotes.clear();
        
        document.getElementById('recordBtn').classList.remove('recording');
        document.getElementById('recordBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('recordingIndicator').classList.remove('active');
        
        if (this.recordedNotes.length > 0) {
            document.getElementById('addToTimelineBtn').disabled = false;
        }
    }

    async addToTimeline() {
        if (this.recordedNotes.length === 0) return;
        
        this.trackCounter++;
        const trackId = `track-${this.trackCounter}`;
        const track = {
            id: trackId,
            clips: []
        };
        
        // Create audio clip from recorded notes
        const clip = {
            id: `clip-${Date.now()}`,
            startTime: 0,
            duration: Math.max(...this.recordedNotes.map(n => n.time + n.duration), 1),
            notes: [...this.recordedNotes],
            audioBuffer: null
        };
        
        track.clips.push(clip);
        this.tracks.push(track);
        this.renderTracks();
        
        // Reset recording
        this.recordedNotes = [];
        this.recordedAudioBuffer = null;
        document.getElementById('addToTimelineBtn').disabled = true;
    }

    renderTracks() {
        const container = document.getElementById('tracksContainer');
        container.innerHTML = '';
        
        this.tracks.forEach((track, trackIndex) => {
            const trackElement = document.createElement('div');
            trackElement.className = 'track';
            trackElement.dataset.trackId = track.id;
            
            const header = document.createElement('div');
            header.className = 'track-header';
            header.innerHTML = `
                <span class="track-label">Track ${trackIndex + 1}</span>
                <button class="control-btn stop-btn" onclick="audioStudio.deleteTrack('${track.id}')" style="padding: 5px 10px; font-size: 12px;">Delete</button>
            `;
            
            const content = document.createElement('div');
            content.className = 'track-content';
            content.style.minWidth = '6000px'; // Allow horizontal scrolling
            
            track.clips.forEach(clip => {
                const clipElement = this.createClipElement(clip, track.id);
                content.appendChild(clipElement);
            });
            
            trackElement.appendChild(header);
            trackElement.appendChild(content);
            container.appendChild(trackElement);
        });
    }

    createClipElement(clip, trackId) {
        const clipDiv = document.createElement('div');
        clipDiv.className = 'audio-clip';
        clipDiv.dataset.clipId = clip.id;
        clipDiv.style.left = `${clip.startTime * this.pixelsPerSecond}px`;
        clipDiv.style.width = `${clip.duration * this.pixelsPerSecond}px`;
        clipDiv.textContent = `Clip ${clip.id.split('-')[1]}`;
        
        // Make clips draggable
        this.makeClipDraggable(clipDiv, clip, trackId);
        
        // Add click to select
        clipDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.audio-clip').forEach(c => c.classList.remove('selected'));
            clipDiv.classList.add('selected');
        });
        
        return clipDiv;
    }

    makeClipDraggable(element, clip, trackId) {
        let isDragging = false;
        let startX = 0;
        let startLeft = 0;
        
        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startLeft = clip.startTime * this.pixelsPerSecond;
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const newLeft = Math.max(0, startLeft + deltaX);
            const newStartTime = newLeft / this.pixelsPerSecond;
            
            element.style.left = `${newLeft}px`;
            clip.startTime = newStartTime;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'move';
            }
        });
    }

    deleteTrack(trackId) {
        this.tracks = this.tracks.filter(t => t.id !== trackId);
        this.renderTracks();
        this.stopPlayback();
    }

    async startPlayback() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        document.getElementById('playBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        
        const volume = document.getElementById('volumeSlider').value / 100;
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(this.audioContext.destination);
        
        this.playbackSources = [];
        
        // Play all clips in all tracks
        this.tracks.forEach(track => {
            track.clips.forEach(clip => {
                if (clip.audioBuffer) {
                    // Play audio buffer
                    const source = this.audioContext.createBufferSource();
                    source.buffer = clip.audioBuffer;
                    source.connect(masterGain);
                    source.start(this.audioContext.currentTime + clip.startTime);
                    this.playbackSources.push(source);
                } else if (clip.notes.length > 0) {
                    // Play notes
                    clip.notes.forEach(noteData => {
                        const playTime = clip.startTime + noteData.time;
                        const startTime = this.audioContext.currentTime + playTime;
                        
                        const oscillator = this.audioContext.createOscillator();
                        const gainNode = this.audioContext.createGain();
                        
                        oscillator.type = 'sine';
                        oscillator.frequency.value = noteData.frequency;
                        
                        gainNode.gain.setValueAtTime(0, startTime);
                        gainNode.gain.linearRampToValueAtTime(0.3 * volume, startTime + 0.01);
                        gainNode.gain.linearRampToValueAtTime(0, startTime + noteData.duration);
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(masterGain);
                        
                        oscillator.start(startTime);
                        oscillator.stop(startTime + noteData.duration);
                        
                        this.playbackSources.push(oscillator);
                    });
                }
            });
        });
    }

    pausePlayback() {
        // Note: Web Audio API doesn't have native pause, so we'll stop instead
        this.stopPlayback();
    }

    stopPlayback() {
        this.isPlaying = false;
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        
        // Stop all playback sources
        this.playbackSources.forEach(source => {
            try {
                if (source.stop) source.stop();
            } catch (e) {
                // Source may already be stopped
            }
        });
        this.playbackSources = [];
    }
}

// Initialize the application
let audioStudio;
window.addEventListener('DOMContentLoaded', () => {
    audioStudio = new AudioStudio();
});

