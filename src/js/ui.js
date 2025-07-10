import { appState } from './state.js';
import { AbletonAlsExporter } from './ableton-als-exporter.js';

const scenesList = document.getElementById('scenes-list');
const clipGrid = document.getElementById('clip-grid');
const trackHeaders = document.getElementById('track-headers');
const uploadAudioBtn = document.getElementById('upload-audio-button');
const notificationToast = document.getElementById('notification-toast');
let notificationTimeout;

// --- Module-Specific Helpers ---

function sanitizeXml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// --- Render Functions ---

export function render() {
    renderTrackHeaders();
    renderScenes();
    renderGrid();
    renderUploadButton();
}

function renderTrackHeaders() {
    trackHeaders.innerHTML = '';
    appState.tracks.forEach(track => {
        trackHeaders.innerHTML += `<div class="track-header">${track.name}</div>`;
    });
}

function renderScenes() {
    scenesList.innerHTML = '';
    appState.scenes.forEach((scene, index) => {
        const isSelected = index === appState.selectedSceneIndex;
        const isPlaying = appState.playingSceneIndex === index;
        
        // Use the single hexColor from the state for everything
        const sceneColorHex = scene.hexColor || '#a9a9a9';

        scenesList.innerHTML += `
            <div class="scene-item ${isSelected ? 'selected' : ''}" data-scene-index="${index}" style="border-left-color: ${sceneColorHex};">
                <div class="scene-item-left">
                   <button class="scene-play-btn ${isPlaying ? 'playing' : ''}" data-scene-index="${index}">${isPlaying ? '■' : '▶'}</button>
                   <input type="text" class="scene-name-input" value="${sanitizeXml(scene.name)}" data-scene-index="${index}">
                </div>
                <input type="color" value="${sceneColorHex}" class="scene-color-picker" data-scene-index="${index}">
            </div>
        `;
    });
}

export function renderGrid() {
    clipGrid.innerHTML = '';
    const WARP_MODES = AbletonAlsExporter.getWarpModes();

    appState.grid.forEach((sceneRow, sceneIndex) => {
        sceneRow.forEach((clip, trackIndex) => {
            let content = 'Empty';
            let populatedClass = '';
            if (clip) {
                populatedClass = 'populated';
                const warpOptions = Object.entries(WARP_MODES).map(([value, name]) => 
                    `<option value="${value}" ${clip.warpMode == value ? 'selected' : ''}>${name}</option>`
                ).join('');

                const loopEnd = clip.lengthInBeats ? clip.lengthInBeats.toFixed(2) : '...';

                content = `
                    <div class="clip-name" title="${clip.name}">${clip.name}</div>
                    <div class="clip-controls-form">
                        <div class="clip-control-row">
                            <label for="bpm-${sceneIndex}-${trackIndex}">BPM</label>
                            <input type="number" step="0.01" id="bpm-${sceneIndex}-${trackIndex}" class="clip-input clip-bpm" value="${clip.bpm.toFixed(2)}" data-scene-index="${sceneIndex}" data-track-index="${trackIndex}">
                        </div>
                        <div class="clip-control-row">
                            <label for="warp-${sceneIndex}-${trackIndex}">Warp</label>
                            <select id="warp-${sceneIndex}-${trackIndex}" class="clip-select clip-warp" data-scene-index="${sceneIndex}" data-track-index="${trackIndex}">${warpOptions}</select>
                        </div>
                        <div class="clip-control-row">
                            <label for="loop-${sceneIndex}-${trackIndex}">Loop</label>
                            <input type="checkbox" id="loop-${sceneIndex}-${trackIndex}" class="clip-checkbox clip-loop" ${clip.loop ? 'checked' : ''} data-scene-index="${sceneIndex}" data-track-index="${trackIndex}">
                        </div>
                         <div class="clip-control-row">
                            <label>Length</label>
                            <span>0.00 - ${loopEnd}</span>
                        </div>
                    </div>
                `;
            }
            clipGrid.innerHTML += `<div class="clip-slot ${populatedClass}" data-scene-index="${sceneIndex}" data-track-index="${trackIndex}">${content}</div>`;
        });
    });
}

function renderUploadButton() {
    if (appState.selectedSceneIndex !== -1) {
        uploadAudioBtn.textContent = 'Upload Audio to Selected Scene';
        uploadAudioBtn.disabled = false;
    } else {
        uploadAudioBtn.textContent = 'Select a Scene to Upload Audio';
        uploadAudioBtn.disabled = true;
    }
}

export function showNotification(message, duration = 3000) {
    clearTimeout(notificationTimeout);
    notificationToast.textContent = message;
    notificationToast.classList.add('show');
    notificationTimeout = setTimeout(() => {
        notificationToast.classList.remove('show');
    }, duration);
}