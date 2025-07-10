import { appState, addNewScene, addClipsToScene } from './state.js';
import { render, showNotification } from './ui.js';
import { playScene } from './audio.js';
import { exportProject } from './abletonAlsExporterController.js';
import { AbletonAlsExporter } from './ableton-als-exporter.js';

// --- DOM ELEMENTS CACHE ---
const dom = {
    tempoInput: document.getElementById('project-tempo'),
    addSceneBtn: document.getElementById('add-scene-button'),
    scenesList: document.getElementById('scenes-list'),
    clipGrid: document.getElementById('clip-grid'),
    uploadAudioBtn: document.getElementById('upload-audio-button'),
    audioFileInput: document.getElementById('audio-file-input'),
    exportBtn: document.getElementById('export-button'),
};

// --- EVENT HANDLERS ---
function handleProjectTempoChange(e) {
    appState.projectTempo = parseInt(e.target.value, 10);
}

async function handleFileUpload(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    let targetSceneIndex = appState.selectedSceneIndex;
    if (targetSceneIndex === -1) {
        addNewScene();
        targetSceneIndex = appState.scenes.length - 1;
    }

    const hadInvalidFiles = await addClipsToScene(files, targetSceneIndex);
    if (hadInvalidFiles) {
        showNotification('Some files were not valid audio types and were ignored.', 4000);
    }
    render();
}

function handleSceneEvents(e) {
    const target = e.target;
    const sceneItem = target.closest('.scene-item');
    if (!sceneItem) return;

    const sceneIndex = parseInt(sceneItem.dataset.sceneIndex, 10);
    
    // Handle play button click
    const playBtn = target.closest('.scene-play-btn');
    if (playBtn && e.type === 'click') {
        e.stopPropagation();
        playScene(sceneIndex);
        return;
    }
    
    // Handle scene name change
    const nameInput = target.closest('.scene-name-input');
    if (nameInput) {
        appState.scenes[sceneIndex].name = nameInput.value;
        return;
    }
    
    // Handle color picker change - ONLY on the 'change' event
    const colorPicker = target.closest('.scene-color-picker');
    if (colorPicker && e.type === 'change') {
        const userHexColor = colorPicker.value;
        const abletonHexColor = AbletonAlsExporter.getNearestAbletonColor(userHexColor);
        
        appState.scenes[sceneIndex].hexColor = abletonHexColor;
        
        render();
        return;
    }

    // Handle scene selection on click (but not if clicking a control)
    if (e.type === 'click' && !playBtn && !nameInput && !colorPicker) {
        appState.selectedSceneIndex = sceneIndex;
        render();
    }
}

function handleClipControlEvents(e) {
    const target = e.target;
    const sceneIndex = target.dataset.sceneIndex;
    const trackIndex = target.dataset.trackIndex;

    if (sceneIndex === undefined || trackIndex === undefined) return;

    const clip = appState.grid[sceneIndex][trackIndex];
    if (!clip) return;

    if (target.classList.contains('clip-bpm')) {
        clip.bpm = parseFloat(target.value) || 120.00;
        clip.lengthInBeats = parseFloat((clip.duration * (clip.bpm / 60)).toFixed(2));
        render();
    } else if (target.classList.contains('clip-warp')) {
        clip.warpMode = parseInt(target.value, 10);
    } else if (target.classList.contains('clip-loop')) {
        clip.loop = target.checked;
    }
}

async function handleExport() {
    await exportProject();
}

// --- INITIALIZATION ---
function setupEventListeners() {
    dom.tempoInput.addEventListener('change', handleProjectTempoChange);
    dom.addSceneBtn.addEventListener('click', () => {
        addNewScene();
        render();
    });
    dom.uploadAudioBtn.addEventListener('click', () => dom.audioFileInput.click());
    dom.audioFileInput.addEventListener('change', handleFileUpload);
    dom.exportBtn.addEventListener('click', handleExport);

    // These listeners handle multiple event types on the same parent element
    dom.scenesList.addEventListener('click', handleSceneEvents);
    dom.scenesList.addEventListener('change', handleSceneEvents); 
    
    dom.clipGrid.addEventListener('change', handleClipControlEvents);
}

function init() {
    console.log("Ableton Project Stager Initialized.");
    setupEventListeners();
    addNewScene();
    render();
}

init();