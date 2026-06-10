(function() {
    'use strict';

    // -------------------------------------------------------------
    // 1. STATE & CONSTANTS DEFINITIONS
    // -------------------------------------------------------------
    
    const TRACKS = ['lead', 'bass', 'chords', 'drums'];
    const NUM_STEPS = 16;
    const NUM_ROWS = 8;

    // Pitch lists for tracks
    // Lead Pentatonic: C5, A4, G4, E4, D4, C4, A3, G3
    const LEAD_PITCHES = [523.25, 440.00, 392.00, 329.63, 293.66, 261.63, 220.00, 196.00];
    
    // Bass notes (lower register): C3, Bb2, Ab2, G2, F2, Eb2, D2, C2
    const BASS_PITCHES = [130.81, 116.54, 103.83, 98.00, 87.31, 77.78, 73.42, 65.41];
    
    // Chords definition (each row triggers polyphonic set of pitches)
    const CHORD_PITCHES = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C4, E4, G4, B4)
        [220.00, 261.63, 329.63, 392.00], // Am7 (A3, C4, E4, G4)
        [174.61, 220.00, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
        [196.00, 246.94, 293.66, 349.23], // G7 (G3, B3, D4, F4)
        [146.83, 174.61, 220.00, 261.63], // Dm7 (D3, F3, A3, C4)
        [164.81, 196.00, 246.94, 293.66], // Em7 (E3, G3, B3, D4)
        [233.08, 293.66, 349.23, 440.00], // Bbmaj7 (Bb3, D4, F4, A4)
        [207.65, 261.63, 311.13, 392.00]  // Abmaj7 (Ab3, C4, Eb4, G4)
    ];

    const CHORD_NAMES = [
        'Cmaj7', 'Am7', 'Fmaj7', 'G7', 'Dm7', 'Em7', 'Bbmaj7', 'Abmaj7'
    ];

    const DRUM_NAMES = [
        'KICK', 'SNARE', 'CLOSED HAT', 'OPEN HAT', 'CLAP', 'RIMSHOT', 'PERC 1', 'PERC 2'
    ];

    // Global Sequencer state
    const state = {
        isPlaying: false,
        bpm: 120,
        activeTrack: 'lead', // currently edited track
        currentStep: -1,
        grids: {
            lead: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(false)),
            bass: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(false)),
            chords: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(false)),
            drums: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(false))
        },
        settings: {
            // Track volumes & panning
            vol: { lead: 0.7, bass: 0.7, chords: 0.6, drums: 0.8 },
            pan: { lead: 0, bass: 0, chords: 0, drums: 0 },
            // Synth parameters
            cutoff: 2000,
            resonance: 2.0,
            decay: 0.3,
            waveform: 'sawtooth',
            delayGain: 0.2,
            delayFeedback: 0.4,
            delayTime: 0.3,
            reverbGain: 0.15
        }
    };

    // -------------------------------------------------------------
    // 2. PRESET SONGS DATA
    // -------------------------------------------------------------
    const PRESETS = {
        'neon-synthwave': {
            bpm: 110,
            settings: {
                cutoff: 1800, resonance: 3, decay: 0.35, waveform: 'sawtooth',
                delayGain: 0.3, delayFeedback: 0.5, delayTime: 0.33, reverbGain: 0.3,
                vol: { lead: 0.75, bass: 0.85, chords: 0.65, drums: 0.85 },
                pan: { lead: -0.15, bass: 0, chords: 0.2, drums: 0 }
            },
            grids: {
                lead: [
                    [1,0,0,0, 1,0,0,0, 1,0,0,0, 0,0,1,0], // C5
                    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,1,0,0], // A4
                    [0,0,0,0, 0,0,0,0, 0,0,0,1, 1,0,0,0], // G4
                    [0,1,0,0, 0,1,0,0, 0,1,0,0, 0,0,0,0], // E4
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                bass: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,1,0, 1,0,1,0, 0,0,0,0, 0,0,0,0], // D2
                    [0,0,0,0, 0,0,0,0, 1,0,1,0, 1,0,1,1]  // C2
                ],
                chords: [
                    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // Cmaj7
                    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], // Am7
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0], // Dm7
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0], // Em7
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                drums: [
                    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], // Kick
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // Snare
                    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], // Closed hat
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1], // Open hat
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0], // Rimshot
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ]
            }
        },
        'techno-pulse': {
            bpm: 128,
            settings: {
                cutoff: 1200, resonance: 8, decay: 0.2, waveform: 'square',
                delayGain: 0.25, delayFeedback: 0.6, delayTime: 0.25, reverbGain: 0.2,
                vol: { lead: 0.7, bass: 0.9, chords: 0.5, drums: 0.9 },
                pan: { lead: 0.3, bass: 0, chords: -0.3, drums: 0 }
            },
            grids: {
                lead: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,1,0, 0,1,0,0, 0,0,1,0, 0,1,0,0],
                    [0,0,0,1, 0,0,1,0, 0,0,0,1, 0,0,1,0],
                    [1,0,0,0, 1,0,0,1, 1,0,0,0, 1,0,0,1],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                bass: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
                ],
                chords: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                drums: [
                    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
                    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ]
            }
        },
        'ambient-dreams': {
            bpm: 80,
            settings: {
                cutoff: 900, resonance: 1.5, decay: 1.2, waveform: 'sine',
                delayGain: 0.45, delayFeedback: 0.7, delayTime: 0.6, reverbGain: 0.5,
                vol: { lead: 0.6, bass: 0.7, chords: 0.8, drums: 0.2 },
                pan: { lead: -0.4, bass: 0, chords: 0.4, drums: -0.1 }
            },
            grids: {
                lead: [
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
                    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                bass: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                chords: [
                    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                drums: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ]
            }
        },
        'chiptune-groove': {
            bpm: 135,
            settings: {
                cutoff: 3500, resonance: 6, decay: 0.18, waveform: 'square',
                delayGain: 0.35, delayFeedback: 0.45, delayTime: 0.18, reverbGain: 0.1,
                vol: { lead: 0.8, bass: 0.8, chords: 0.5, drums: 0.75 },
                pan: { lead: -0.2, bass: 0, chords: 0.2, drums: 0 }
            },
            grids: {
                lead: [
                    [1,0,0,1, 0,1,0,0, 1,0,0,1, 0,1,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,1,0,0, 1,0,0,0, 0,1,0,0, 1,0,0,0],
                    [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
                    [0,0,1,0, 0,0,0,1, 0,0,1,0, 0,0,0,1],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                bass: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 1,0,0,0, 1,0,0,0],
                    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
                    [0,0,0,1, 0,0,0,1, 0,0,0,1, 0,0,0,1]
                ],
                chords: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                drums: [
                    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
                    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ]
            }
        }
    };

    // -------------------------------------------------------------
    // 3. AUDIO ENGINE & SYNTHESIS SETUP
    // -------------------------------------------------------------
    let audioCtx = null;
    
    // Master Nodes
    let masterGain = null;
    let masterAnalyser = null;
    let mainFilter = null;
    
    // Effects nodes
    let delayNode = null;
    let delayFeedbackNode = null;
    let delayFilter = null;
    let delayGainNode = null;
    
    let reverbNode = null;
    let reverbGainNode = null;

    // Track Mixer Channels
    const channels = {
        lead: { gain: null, panner: null },
        bass: { gain: null, panner: null },
        chords: { gain: null, panner: null },
        drums: { gain: null, panner: null }
    };

    let noiseBuffer = null;

    function getNoiseBuffer() {
        if (!audioCtx) return null;
        if (noiseBuffer) return noiseBuffer;
        
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noiseBuffer = buffer;
        return noiseBuffer;
    }

    function initAudio() {
        if (audioCtx) return;
        
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 1. Create Master Output Chain
        masterAnalyser = audioCtx.createAnalyser();
        masterAnalyser.fftSize = 256;
        
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.8;
        
        mainFilter = audioCtx.createBiquadFilter();
        mainFilter.type = 'lowpass';
        mainFilter.frequency.value = state.settings.cutoff;
        mainFilter.Q.value = state.settings.resonance;

        // 2. Create Delay FX Routing
        delayNode = audioCtx.createDelay(2.0);
        delayNode.delayTime.value = state.settings.delayTime;
        
        delayFeedbackNode = audioCtx.createGain();
        delayFeedbackNode.gain.value = state.settings.delayFeedback;
        
        delayFilter = audioCtx.createBiquadFilter();
        delayFilter.type = 'bandpass';
        delayFilter.frequency.value = 1000;
        delayFilter.Q.value = 0.8;
        
        delayGainNode = audioCtx.createGain();
        delayGainNode.gain.value = state.settings.delayGain;
        
        // Connect delay feedback loop
        delayNode.connect(delayFilter);
        delayFilter.connect(delayFeedbackNode);
        delayFeedbackNode.connect(delayNode);
        
        // 3. Create Reverb FX Routing
        reverbNode = audioCtx.createConvolver();
        reverbGainNode = audioCtx.createGain();
        reverbGainNode.gain.value = state.settings.reverbGain;
        
        // Generate synthetic impulse response for reverb
        const impulseLen = audioCtx.sampleRate * 2.5; // 2.5 seconds reverb tail
        const impulseBuffer = audioCtx.createBuffer(2, impulseLen, audioCtx.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const data = impulseBuffer.getChannelData(channel);
            for (let i = 0; i < impulseLen; i++) {
                // Exponential decay white noise
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLen, 2.5);
            }
        }
        reverbNode.buffer = impulseBuffer;

        // 4. Connect FX sends
        // Connections: mainFilter -> Reverb & Delay
        // mainFilter -> masterAnalyser -> masterGain -> destination
        mainFilter.connect(masterAnalyser);
        masterAnalyser.connect(masterGain);
        masterGain.connect(audioCtx.destination);
        
        // FX sends from Main Filter
        mainFilter.connect(delayNode);
        delayNode.connect(delayGainNode);
        delayGainNode.connect(masterAnalyser);
        
        mainFilter.connect(reverbNode);
        reverbNode.connect(reverbGainNode);
        reverbGainNode.connect(masterAnalyser);

        // 5. Build mixer tracks
        TRACKS.forEach(t => {
            const trackGain = audioCtx.createGain();
            trackGain.gain.value = state.settings.vol[t];
            
            const trackPanner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
            if (trackPanner) {
                trackPanner.pan.value = state.settings.pan[t];
                trackGain.connect(trackPanner);
                trackPanner.connect(mainFilter);
            } else {
                trackGain.connect(mainFilter);
            }
            
            channels[t].gain = trackGain;
            channels[t].panner = trackPanner;
        });

        // Initialize white noise buffer
        getNoiseBuffer();
    }

    // Update synth parameter node values dynamically
    function updateSynthParameters() {
        if (!audioCtx) return;
        
        const now = audioCtx.currentTime;
        mainFilter.frequency.setValueAtTime(state.settings.cutoff, now);
        mainFilter.Q.setValueAtTime(state.settings.resonance, now);
        
        delayNode.delayTime.setValueAtTime(state.settings.delayTime, now);
        delayFeedbackNode.gain.setValueAtTime(state.settings.delayFeedback, now);
        delayGainNode.gain.setValueAtTime(state.settings.delayGain, now);
        
        reverbGainNode.gain.setValueAtTime(state.settings.reverbGain, now);
    }

    // -------------------------------------------------------------
    // 4. DYNAMIC SYNTH DRUM VOICES
    // -------------------------------------------------------------
    function playKick(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(channels.drums.gain);

        osc.frequency.setValueAtTime(150, time);
        // Exponential sweep down for standard kick thump
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);

        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
    }

    function playSnare(time) {
        // Noise source
        const noise = audioCtx.createBufferSource();
        noise.buffer = getNoiseBuffer();
        
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.7, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(channels.drums.gain);

        // Snap body (sine tone)
        const snap = audioCtx.createOscillator();
        const snapGain = audioCtx.createGain();
        snap.type = 'triangle';
        snap.frequency.setValueAtTime(180, time);
        snap.frequency.exponentialRampToValueAtTime(100, time + 0.1);
        
        snapGain.gain.setValueAtTime(0.5, time);
        snapGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        snap.connect(snapGain);
        snapGain.connect(channels.drums.gain);

        noise.start(time);
        snap.start(time);
        noise.stop(time + 0.25);
        snap.stop(time + 0.1);
    }

    function playHihat(time, isClosed = true) {
        const source = audioCtx.createBufferSource();
        source.buffer = getNoiseBuffer();

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 7500;
        filter.Q.value = 3;

        const gain = audioCtx.createGain();
        const duration = isClosed ? 0.05 : 0.25;
        
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(channels.drums.gain);

        source.start(time);
        source.stop(time + duration);
    }

    function playClap(time) {
        // Multi-trigger white noise bursts
        const duration = 0.28;
        const source = audioCtx.createBufferSource();
        source.buffer = getNoiseBuffer();

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        
        const gain = audioCtx.createGain();
        
        // 3 quick pre-bursts + final decay tail
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.setValueAtTime(0.01, time + 0.01);
        gain.gain.setValueAtTime(0.5, time + 0.02);
        gain.gain.setValueAtTime(0.01, time + 0.03);
        gain.gain.setValueAtTime(0.5, time + 0.04);
        gain.gain.setValueAtTime(0.01, time + 0.05);
        gain.gain.setValueAtTime(0.6, time + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(channels.drums.gain);

        source.start(time);
        source.stop(time + duration);
    }

    function playRimshot(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.04);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        osc.connect(gain);
        gain.connect(channels.drums.gain);

        osc.start(time);
        osc.stop(time + 0.04);
    }

    function playPerc1(time) {
        // Cowbell style ring
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc1.type = 'square';
        osc2.type = 'square';
        
        osc1.frequency.setValueAtTime(800, time);
        osc2.frequency.setValueAtTime(540, time); // metallic offset
        
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(channels.drums.gain);
        
        osc1.start(time);
        osc2.start(time);
        
        osc1.stop(time + 0.15);
        osc2.stop(time + 0.15);
    }

    function playPerc2(time) {
        // Woodblock style
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, time);
        osc.frequency.exponentialRampToValueAtTime(400, time + 0.07);
        
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
        
        osc.connect(gain);
        gain.connect(channels.drums.gain);
        
        osc.start(time);
        osc.stop(time + 0.07);
    }

    // -------------------------------------------------------------
    // 5. INDIVIDUAL NOTE TRIGGERS
    // -------------------------------------------------------------
    function playSynthNote(track, noteIdx, time) {
        if (!audioCtx) return;
        const duration = state.settings.decay;

        if (track === 'lead') {
            const frequency = LEAD_PITCHES[noteIdx];
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = state.settings.waveform;
            osc.frequency.setValueAtTime(frequency, time);
            
            // Envelope attack 0.01s, decay
            gain.gain.setValueAtTime(0.001, time);
            gain.gain.linearRampToValueAtTime(0.5, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            
            osc.connect(gain);
            gain.connect(channels.lead.gain);
            
            osc.start(time);
            osc.stop(time + duration);
        }
        else if (track === 'bass') {
            const frequency = BASS_PITCHES[noteIdx];
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'triangle'; // bass sounds clean on triangle/saw mix
            osc.frequency.setValueAtTime(frequency, time);
            
            gain.gain.setValueAtTime(0.001, time);
            gain.gain.linearRampToValueAtTime(0.8, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 1.5);
            
            osc.connect(gain);
            gain.connect(channels.bass.gain);
            
            osc.start(time);
            osc.stop(time + duration * 1.5);
        }
        else if (track === 'chords') {
            // Polyphonic Chord trigger!
            const chordFrequencies = CHORD_PITCHES[noteIdx];
            const chordDuration = duration * 2.5; // chord pads ring longer
            
            chordFrequencies.forEach(freq => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = 'sine'; // sine pads are nice and smooth
                osc.frequency.setValueAtTime(freq, time);
                
                // Slow attack pad envelope
                gain.gain.setValueAtTime(0.001, time);
                gain.gain.linearRampToValueAtTime(0.25, time + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, time + chordDuration);
                
                osc.connect(gain);
                gain.connect(channels.chords.gain);
                
                osc.start(time);
                osc.stop(time + chordDuration);
            });
        }
        else if (track === 'drums') {
            // Map index to respective drum synth voice
            switch(noteIdx) {
                case 0: playKick(time); break;
                case 1: playSnare(time); break;
                case 2: playHihat(time, true); break;
                case 3: playHihat(time, false); break;
                case 4: playClap(time); break;
                case 5: playRimshot(time); break;
                case 6: playPerc1(time); break;
                case 7: playPerc2(time); break;
            }
        }
    }

    // -------------------------------------------------------------
    // 6. SCHEDULER & PLAYHEAD TIMER LOOP
    // -------------------------------------------------------------
    let nextNoteTime = 0.0;
    let schedulerTimer = null;
    
    // Lookahead (25ms) and schedule window (100ms)
    const LOOKAHEAD_MS = 25.0;
    const SCHEDULE_AHEAD_TIME = 0.1;

    function scheduler() {
        while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
            scheduleNotes(state.currentStep, nextNoteTime);
            advanceStep();
        }
        schedulerTimer = setTimeout(scheduler, LOOKAHEAD_MS);
    }

    function scheduleNotes(stepIndex, time) {
        // Visual callback sync (uses requestAnimationFrame)
        const displayStep = stepIndex;
        audioCtx.resume();
        
        // Trigger all active notes at this step index across channels
        TRACKS.forEach(track => {
            const grid = state.grids[track];
            for (let row = 0; row < NUM_ROWS; row++) {
                if (grid[row][stepIndex]) {
                    playSynthNote(track, row, time);
                }
            }
        });

        // Sync grid view highlights on the UI
        setTimeout(() => {
            highlightPlayheadColumn(displayStep);
        }, (time - audioCtx.currentTime) * 1000);
    }

    function advanceStep() {
        const secondsPerBeat = 60.0 / state.bpm;
        // 16th notes: 4 steps per beat
        const stepDuration = 0.25 * secondsPerBeat;
        
        nextNoteTime += stepDuration;
        
        state.currentStep = (state.currentStep + 1) % NUM_STEPS;
    }

    function toggleSequencer() {
        initAudio();
        
        if (state.isPlaying) {
            // STOP
            state.isPlaying = false;
            if (schedulerTimer) {
                clearTimeout(schedulerTimer);
                schedulerTimer = null;
            }
            state.currentStep = -1;
            removePlayheadHighlights();
            document.getElementById('btn-play-stop').classList.remove('playing');
            document.getElementById('btn-play-stop').querySelector('.label').textContent = 'Play';
            document.getElementById('btn-play-stop').querySelector('.icon').textContent = '▶';
        } else {
            // PLAY
            state.isPlaying = true;
            state.currentStep = 0;
            nextNoteTime = audioCtx.currentTime + 0.05;
            
            // Sync dynamic parameters
            updateSynthParameters();
            scheduler();
            
            document.getElementById('btn-play-stop').classList.add('playing');
            document.getElementById('btn-play-stop').querySelector('.label').textContent = 'Stop';
            document.getElementById('btn-play-stop').querySelector('.icon').textContent = '■';
        }
    }

    // -------------------------------------------------------------
    // 7. COMPACT STATE COMPRESSION / URL SHARING SYSTEM
    // -------------------------------------------------------------
    
    // Grid binary serialization:
    // Convert 16x8 boolean grid to bytes. Each row has 16 steps = 2 bytes. 8 rows * 2 bytes = 16 bytes.
    // 4 tracks = 64 bytes total.
    // Plus 10 bytes for settings = 74 bytes. Encode with Base64.
    function serializeState() {
        const buffer = new Uint8Array(80);
        let offset = 0;

        // 1. Pack Grids (4 tracks * 8 rows * 2 bytes = 64 bytes)
        TRACKS.forEach(track => {
            const grid = state.grids[track];
            for (let row = 0; row < NUM_ROWS; row++) {
                let rowWord = 0;
                for (let col = 0; col < NUM_STEPS; col++) {
                    if (grid[row][col]) {
                        rowWord |= (1 << col);
                    }
                }
                buffer[offset++] = rowWord & 0xFF;
                buffer[offset++] = (rowWord >> 8) & 0xFF;
            }
        });

        // 2. Pack Synthesizer Settings (Offset 64 onwards)
        // BPM (60 - 200 fits in 1 byte)
        buffer[offset++] = Math.max(60, Math.min(200, state.bpm));
        
        // Cutoff (100 - 10000; scale to 0-255 by dividing by 40)
        buffer[offset++] = Math.round(state.settings.cutoff / 40);
        
        // Resonance (0 - 15; scale by multiplying by 15)
        buffer[offset++] = Math.round(state.settings.resonance * 15);
        
        // Decay (0.05 - 2.0; multiply by 100)
        buffer[offset++] = Math.round(state.settings.decay * 100);
        
        // Waveform selector index
        const waves = ['sawtooth', 'square', 'triangle', 'sine'];
        buffer[offset++] = Math.max(0, waves.indexOf(state.settings.waveform));

        // Delay Gain, feedback, time (multiply by 100)
        buffer[offset++] = Math.round(state.settings.delayGain * 100);
        buffer[offset++] = Math.round(state.settings.delayFeedback * 100);
        buffer[offset++] = Math.round(state.settings.delayTime * 100);

        // Reverb Level
        buffer[offset++] = Math.round(state.settings.reverbGain * 100);

        // Slice up to actual filled bytes
        const finalBuffer = buffer.slice(0, offset);

        // Convert to base64
        let binaryStr = '';
        for (let i = 0; i < finalBuffer.length; i++) {
            binaryStr += String.fromCharCode(finalBuffer[i]);
        }
        return btoa(binaryStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // URL Safe Base64
    }

    function deserializeState(base64Str) {
        try {
            // Restore standard base64 symbols
            let cleanB64 = base64Str.replace(/-/g, '+').replace(/_/g, '/');
            while (cleanB64.length % 4) {
                cleanB64 += '=';
            }
            const binaryStr = atob(cleanB64);
            const buffer = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                buffer[i] = binaryStr.charCodeAt(i);
            }

            if (buffer.length < 64) return false;

            let offset = 0;
            // 1. Read Grids
            TRACKS.forEach(track => {
                const grid = state.grids[track];
                for (let row = 0; row < NUM_ROWS; row++) {
                    const low = buffer[offset++];
                    const high = buffer[offset++];
                    const rowWord = low | (high << 8);
                    for (let col = 0; col < NUM_STEPS; col++) {
                        grid[row][col] = (rowWord & (1 << col)) !== 0;
                    }
                }
            });

            // 2. Read Synth parameters
            if (offset < buffer.length) {
                state.bpm = buffer[offset++];
                state.settings.cutoff = buffer[offset++] * 40;
                state.settings.resonance = buffer[offset++] / 15;
                state.settings.decay = buffer[offset++] / 100;
                
                const waveIdx = buffer[offset++];
                const waves = ['sawtooth', 'square', 'triangle', 'sine'];
                state.settings.waveform = waves[waveIdx] || 'sawtooth';

                state.settings.delayGain = buffer[offset++] / 100;
                state.settings.delayFeedback = buffer[offset++] / 100;
                state.settings.delayTime = buffer[offset++] / 100;
                
                state.settings.reverbGain = buffer[offset++] / 100;
            }
            return true;
        } catch(e) {
            console.error("Decoding error:", e);
            return false;
        }
    }

    function loadFromUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        const dataParam = params.get('data');
        if (dataParam) {
            const success = deserializeState(dataParam);
            if (success) {
                // Update UI elements to match state
                updateSlidersAndDropdowns();
            }
        }
    }

    function shareSong() {
        const hash = serializeState();
        const shareUrl = window.location.origin + window.location.pathname + '?data=' + hash;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            const banner = document.getElementById('share-banner');
            banner.classList.remove('hidden');
            setTimeout(() => {
                banner.classList.add('hidden');
            }, 3000);
        }).catch(err => {
            console.error("Could not copy sharing link: ", err);
        });
    }

    // -------------------------------------------------------------
    // 8. REAL-TIME CANVAS VISUALIZER
    // -------------------------------------------------------------
    let canvas, ctx;
    
    function initVisualizer() {
        canvas = document.getElementById('visualizer-canvas');
        ctx = canvas.getContext('2d');
        
        // Adjust for Retina displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.parentElement.clientWidth * dpr;
        canvas.height = canvas.parentElement.clientHeight * dpr;
        ctx.scale(dpr, dpr);
        
        window.addEventListener('resize', () => {
            if (!canvas) return;
            const rWidth = canvas.parentElement.clientWidth;
            const rHeight = canvas.parentElement.clientHeight;
            canvas.width = rWidth * dpr;
            canvas.height = rHeight * dpr;
            ctx.scale(dpr, dpr);
        });

        // Run rendering cycle
        requestAnimationFrame(drawVisuals);
    }

    function drawVisuals() {
        requestAnimationFrame(drawVisuals);
        
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);

        // Fade background slightly to create trail effect
        ctx.fillStyle = 'rgba(8, 9, 14, 0.2)';
        ctx.fillRect(0, 0, w, h);

        if (!audioCtx || !masterAnalyser) {
            // Draw dummy static line if not initialized
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();
            return;
        }

        const bufferLength = masterAnalyser.frequencyBinCount;
        
        // Data buffers
        const dataArray = new Uint8Array(bufferLength);
        const timeArray = new Uint8Array(bufferLength);
        
        masterAnalyser.getByteFrequencyData(dataArray);
        masterAnalyser.getByteTimeDomainData(timeArray);

        // 1. Draw FFT Spectrogram Bars at background
        ctx.fillStyle = 'rgba(139, 92, 246, 0.04)';
        const barWidth = (w / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] * 0.45;
            
            // Neon gradient spectrum fill
            ctx.fillStyle = `rgba(139, 92, 246, ${dataArray[i] / 512})`;
            ctx.fillRect(x, h - barHeight, barWidth - 2, barHeight);
            
            x += barWidth + 1;
        }

        // 2. Draw Oscilloscope Waveform line
        ctx.lineWidth = 3;
        ctx.strokeStyle = state.isPlaying ? '#00f0ff' : 'rgba(0, 240, 255, 0.4)';
        ctx.shadowBlur = state.isPlaying ? 8 : 0;
        ctx.shadowColor = '#00f0ff';
        
        ctx.beginPath();
        const sliceWidth = w / bufferLength;
        let xCoord = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const v = timeArray[i] / 128.0;
            const yCoord = (v * h) / 2;
            
            if (i === 0) {
                ctx.moveTo(xCoord, yCoord);
            } else {
                ctx.lineTo(xCoord, yCoord);
            }
            xCoord += sliceWidth;
        }
        
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        
        // Reset shadow for next cycles
        ctx.shadowBlur = 0;
    }

    // -------------------------------------------------------------
    // 9. UI BINDINGS, RENDER LOGIC & EVENT LISTENERS
    // -------------------------------------------------------------

    function buildSequencerUI() {
        const labelsContainer = document.getElementById('sequencer-y-labels');
        const gridContainer = document.getElementById('sequencer-grid');
        const indicatorContainer = document.querySelector('.steps-indicators-grid');
        
        labelsContainer.innerHTML = '';
        gridContainer.innerHTML = '';
        indicatorContainer.innerHTML = '';

        // Playhead indicator nodes
        for (let s = 0; s < NUM_STEPS; s++) {
            const node = document.createElement('div');
            node.className = 'step-indicator-node';
            node.id = `step-node-${s}`;
            indicatorContainer.appendChild(node);
        }

        // Labels for rows depending on active track
        let rowNames = [];
        if (state.activeTrack === 'lead') rowNames = ['C5', 'A4', 'G4', 'E4', 'D4', 'C4', 'A3', 'G3'];
        if (state.activeTrack === 'bass') rowNames = ['C3', 'Bb2', 'Ab2', 'G2', 'F2', 'Eb2', 'D2', 'C2'];
        if (state.activeTrack === 'chords') rowNames = CHORD_NAMES;
        if (state.activeTrack === 'drums') rowNames = DRUM_NAMES;

        for (let row = 0; row < NUM_ROWS; row++) {
            const lbl = document.createElement('div');
            lbl.className = 'pitch-row-label';
            lbl.textContent = rowNames[row];
            labelsContainer.appendChild(lbl);
            
            const rowDiv = document.createElement('div');
            rowDiv.className = 'sequencer-row-grid';
            rowDiv.id = `grid-row-${row}`;
            
            for (let col = 0; col < NUM_STEPS; col++) {
                const cell = document.createElement('div');
                cell.className = 'sequencer-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (state.grids[state.activeTrack][row][col]) {
                    cell.classList.add('active-step');
                }
                
                // Add click handler
                cell.addEventListener('mousedown', () => {
                    toggleCell(row, col, cell);
                });
                
                // Touch support
                cell.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    toggleCell(row, col, cell);
                }, {passive: false});

                rowDiv.appendChild(cell);
            }
            gridContainer.appendChild(rowDiv);
        }

        // Apply grid styling tag to container so the correct active color triggers
        const sequencerWrapper = document.querySelector('.sequencer-container');
        sequencerWrapper.className = `sequencer-container ${state.activeTrack}-mode`;
    }

    function toggleCell(row, col, cellElement) {
        initAudio();
        const activeGrid = state.grids[state.activeTrack];
        activeGrid[row][col] = !activeGrid[row][col];
        
        if (activeGrid[row][col]) {
            cellElement.classList.add('active-step');
            // Play note trigger feedback instantly when clicking
            playSynthNote(state.activeTrack, row, audioCtx.currentTime);
        } else {
            cellElement.classList.remove('active-step');
        }
    }

    function highlightPlayheadColumn(stepIndex) {
        // Toggle indicators at the top
        for (let s = 0; s < NUM_STEPS; s++) {
            const node = document.getElementById(`step-node-${s}`);
            if (node) {
                if (s === stepIndex) {
                    node.classList.add('active-playhead');
                } else {
                    node.classList.remove('active-playhead');
                }
            }
        }

        // Highlight cells in grid
        for (let row = 0; row < NUM_ROWS; row++) {
            const rowDiv = document.getElementById(`grid-row-${row}`);
            if (rowDiv) {
                for (let col = 0; col < NUM_STEPS; col++) {
                    const cell = rowDiv.children[col];
                    if (cell) {
                        if (col === stepIndex) {
                            cell.classList.add('active-playhead-step');
                            if (cell.classList.contains('active-step')) {
                                rowDiv.classList.add('playhead-col-active');
                            }
                        } else {
                            cell.classList.remove('active-playhead-step');
                        }
                    }
                }
            }
        }
    }

    function removePlayheadHighlights() {
        for (let s = 0; s < NUM_STEPS; s++) {
            const node = document.getElementById(`step-node-${s}`);
            if (node) node.classList.remove('active-playhead');
        }

        for (let row = 0; row < NUM_ROWS; row++) {
            const rowDiv = document.getElementById(`grid-row-${row}`);
            if (rowDiv) {
                rowDiv.classList.remove('playhead-col-active');
                for (let col = 0; col < NUM_STEPS; col++) {
                    const cell = rowDiv.children[col];
                    if (cell) cell.classList.remove('active-playhead-step');
                }
            }
        }
    }

    function updateSlidersAndDropdowns() {
        // Tempo UI update
        document.getElementById('input-bpm').value = state.bpm;
        document.getElementById('label-bpm').textContent = state.bpm + ' BPM';

        // Synth Controls UI updates
        document.getElementById('param-cutoff').value = state.settings.cutoff;
        document.getElementById('display-cutoff').textContent = state.settings.cutoff + ' Hz';
        
        document.getElementById('param-q').value = state.settings.resonance;
        document.getElementById('display-q').textContent = state.settings.resonance.toFixed(1);
        
        document.getElementById('param-decay').value = state.settings.decay;
        document.getElementById('display-decay').textContent = state.settings.decay + 's';
        
        document.getElementById('param-waveform').value = state.settings.waveform;
        
        document.getElementById('param-delay-gain').value = state.settings.delayGain;
        document.getElementById('display-delay-gain').textContent = Math.round(state.settings.delayGain * 100) + '%';
        
        document.getElementById('param-delay-feedback').value = state.settings.delayFeedback;
        document.getElementById('display-delay-feedback').textContent = Math.round(state.settings.delayFeedback * 100) + '%';
        
        document.getElementById('param-delay-time').value = state.settings.delayTime;
        document.getElementById('display-delay-time').textContent = state.settings.delayTime + 's';
        
        document.getElementById('param-reverb').value = state.settings.reverbGain;
        document.getElementById('display-reverb').textContent = Math.round(state.settings.reverbGain * 100) + '%';

        // Track mixer updates
        TRACKS.forEach(track => {
            const strip = document.querySelector(`.track-channel[data-track="${track}"]`);
            if (strip) {
                strip.querySelector('.channel-vol').value = state.settings.vol[track];
                strip.querySelector('.channel-pan').value = state.settings.pan[track];
            }
        });

        // Trigger mixer nodes values updates
        if (audioCtx) {
            TRACKS.forEach(t => {
                if (channels[t].gain) {
                    channels[t].gain.gain.value = state.settings.vol[t];
                }
                if (channels[t].panner) {
                    channels[t].panner.pan.value = state.settings.pan[t];
                }
            });
            updateSynthParameters();
        }

        // Rebuild steps UI
        buildSequencerUI();
    }

    function clearActiveTrack() {
        const grid = state.grids[state.activeTrack];
        for (let r = 0; r < NUM_ROWS; r++) {
            grid[r].fill(false);
        }
        buildSequencerUI();
    }

    function resetAll() {
        TRACKS.forEach(track => {
            const grid = state.grids[track];
            for (let r = 0; r < NUM_ROWS; r++) {
                grid[r].fill(false);
            }
        });
        
        state.bpm = 120;
        state.settings.cutoff = 2000;
        state.settings.resonance = 2.0;
        state.settings.decay = 0.3;
        state.settings.waveform = 'sawtooth';
        state.settings.delayGain = 0.2;
        state.settings.delayFeedback = 0.4;
        state.settings.delayTime = 0.3;
        state.settings.reverbGain = 0.15;
        
        TRACKS.forEach(t => {
            state.settings.vol[t] = t === 'chords' ? 0.6 : (t === 'lead' || t === 'bass' ? 0.7 : 0.8);
            state.settings.pan[t] = 0;
        });

        document.getElementById('select-preset').value = '';

        updateSlidersAndDropdowns();
    }

    function loadPreset(name) {
        const preset = PRESETS[name];
        if (!preset) return;
        
        state.bpm = preset.bpm;
        
        // Deep copy grids
        TRACKS.forEach(t => {
            for (let r = 0; r < NUM_ROWS; r++) {
                state.grids[t][r] = [...preset.grids[t][r]];
            }
        });

        // Copy settings
        Object.keys(preset.settings).forEach(key => {
            if (typeof preset.settings[key] === 'object') {
                state.settings[key] = { ...preset.settings[key] };
            } else {
                state.settings[key] = preset.settings[key];
            }
        });

        updateSlidersAndDropdowns();
    }

    function setupEventListeners() {
        // Start Overlay
        document.getElementById('btn-start-studio').addEventListener('click', () => {
            initAudio();
            document.getElementById('start-screen').classList.add('hidden');
        });

        // Transport
        document.getElementById('btn-play-stop').addEventListener('click', toggleSequencer);
        document.getElementById('btn-clear-track').addEventListener('click', clearActiveTrack);
        document.getElementById('btn-reset-all').addEventListener('click', resetAll);
        
        // Share & Preset Songs
        document.getElementById('btn-share-song').addEventListener('click', shareSong);
        document.getElementById('select-preset').addEventListener('change', (e) => {
            if (e.target.value) {
                loadPreset(e.target.value);
            }
        });

        // BPM slider
        document.getElementById('input-bpm').addEventListener('input', (e) => {
            state.bpm = parseInt(e.target.value);
            document.getElementById('label-bpm').textContent = state.bpm + ' BPM';
        });

        // Track channel strips selectors & sliders
        document.querySelectorAll('.track-channel').forEach(channelStrip => {
            const trackName = channelStrip.dataset.track;
            
            // Select channel strip on click
            channelStrip.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return; // let faders trigger separately
                
                document.querySelectorAll('.track-channel').forEach(s => s.classList.remove('active'));
                channelStrip.classList.add('active');
                
                state.activeTrack = trackName;
                buildSequencerUI();
            });

            // Volume fader
            channelStrip.querySelector('.channel-vol').addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value);
                state.settings.vol[trackName] = vol;
                if (channels[trackName].gain) {
                    channels[trackName].gain.gain.setValueAtTime(vol, audioCtx.currentTime);
                }
            });

            // Pan fader
            channelStrip.querySelector('.channel-pan').addEventListener('input', (e) => {
                const pan = parseFloat(e.target.value);
                state.settings.pan[trackName] = pan;
                if (channels[trackName].panner) {
                    channels[trackName].panner.pan.setValueAtTime(pan, audioCtx.currentTime);
                }
            });
        });

        // Dynamic synth control sliders
        document.getElementById('param-cutoff').addEventListener('input', (e) => {
            state.settings.cutoff = parseInt(e.target.value);
            document.getElementById('display-cutoff').textContent = state.settings.cutoff + ' Hz';
            if (audioCtx) updateSynthParameters();
        });

        document.getElementById('param-q').addEventListener('input', (e) => {
            state.settings.resonance = parseFloat(e.target.value);
            document.getElementById('display-q').textContent = state.settings.resonance.toFixed(1);
            if (audioCtx) updateSynthParameters();
        });

        document.getElementById('param-decay').addEventListener('input', (e) => {
            state.settings.decay = parseFloat(e.target.value);
            document.getElementById('display-decay').textContent = state.settings.decay + 's';
        });

        document.getElementById('param-waveform').addEventListener('change', (e) => {
            state.settings.waveform = e.target.value;
        });

        document.getElementById('param-delay-gain').addEventListener('input', (e) => {
            state.settings.delayGain = parseFloat(e.target.value);
            document.getElementById('display-delay-gain').textContent = Math.round(state.settings.delayGain * 100) + '%';
            if (audioCtx) updateSynthParameters();
        });

        document.getElementById('param-delay-feedback').addEventListener('input', (e) => {
            state.settings.delayFeedback = parseFloat(e.target.value);
            document.getElementById('display-delay-feedback').textContent = Math.round(state.settings.delayFeedback * 100) + '%';
            if (audioCtx) updateSynthParameters();
        });

        document.getElementById('param-delay-time').addEventListener('input', (e) => {
            state.settings.delayTime = parseFloat(e.target.value);
            document.getElementById('display-delay-time').textContent = state.settings.delayTime + 's';
            if (audioCtx) updateSynthParameters();
        });

        document.getElementById('param-reverb').addEventListener('input', (e) => {
            state.settings.reverbGain = parseFloat(e.target.value);
            document.getElementById('display-reverb').textContent = Math.round(state.settings.reverbGain * 100) + '%';
            if (audioCtx) updateSynthParameters();
        });

        // Keyboard triggers
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            if (e.code === 'Space') {
                e.preventDefault();
                toggleSequencer();
            }
            if (e.code === 'KeyC') {
                e.preventDefault();
                clearActiveTrack();
            }
            if (e.code === 'KeyR') {
                e.preventDefault();
                resetAll();
            }
        });
    }

    // -------------------------------------------------------------
    // 10. SETUP CREDITS POPULATING FUNCTION
    // -------------------------------------------------------------
    function populateCredits() {
        const defaults = {
            "title": "Sound Painter 2",
            "maker": {
                "name": "WewennJr",
                "bio": "Independent contributor creating games for the 4weird platform. I build creative, playable experiences using pure HTML5 and vanilla JavaScript. Sound Painter 2 is a sequel that moves closer to a full desktop music workstation.",
                "url": "",
                "urlLabel": ""
            },
            "credits": [
                {
                    "name": "WewennJr",
                    "role": "Game Creator",
                    "avatar": "🎹",
                    "primary": true,
                    "url": "",
                    "urlLabel": ""
                }
            ]
        };

        function apply(data) {
            document.getElementById('TEMPLATE-4weird-maker-bio').innerHTML = '<p>' + data.maker.bio + '</p>';
            const grid = document.getElementById('TEMPLATE-4weird-credits-grid');
            if (data.credits && data.credits.length > 0 && grid) {
                grid.innerHTML = data.credits.map(c => `
                    <div class="TEMPLATE-4weird-credit-card ${c.primary ? 'TEMPLATE-4weird-primary' : ''}">
                        <div class="TEMPLATE-4weird-credit-avatar">${c.avatar || '👤'}</div>
                        <h3 class="TEMPLATE-4weird-credit-name">${c.name}</h3>
                        <p class="TEMPLATE-4weird-credit-role">${c.role}</p>
                    </div>
                `).join('');
            }
        }

        fetch('game.json')
            .then(r => r.json())
            .then(apply)
            .catch(() => apply(defaults));
    }

    // -------------------------------------------------------------
    // 11. INITIALIZATION ON PAGE LOAD
    // -------------------------------------------------------------
    initVisualizer();
    setupEventListeners();
    populateCredits();

    // Try loading URL parameters if present
    loadFromUrlParameters();

    // Build the grid interface (Lead track active by default)
    buildSequencerUI();

})();
