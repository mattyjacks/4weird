// Wave Management
let waveTimer = 0;
let waveDuration = 600;

function updateWaves() {
    waveTimer++;
    if (waveTimer >= waveDuration) {
        waveTimer = 0;
        wave++;
        waveDuration = 600 + (wave - 1) * 50;
        score += wave * 50;
        addText(CANVAS_WIDTH / 2, 50, 'WAVE ' + wave, '#10b981', 24);
    }
}

function getWave() {
    return wave;
}

function getWaveTimer() {
    return waveTimer;
}

function getWaveDuration() {
    return waveDuration;
}

function resetWaves() {
    wave = 1;
    waveTimer = 0;
    waveDuration = 600;
}
