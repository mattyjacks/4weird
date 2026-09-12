// Wave Management
var waveTimer = 0;
var waveDuration = 750;

function updateWaves() {
    waveTimer++;
    if (waveTimer >= waveDuration) {
        waveTimer = 0;
        wave++;
        waveDuration = 750 + (wave - 1) * 40;
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
    waveDuration = 750;
}
