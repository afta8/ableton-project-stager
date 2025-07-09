import { appState, addNewScene, addClipsToScene } from './state.js';
import { findClosestAbletonColorIndex } from './utils.js';
import { render, showNotification } from './ui.js';
import { playScene } from './audio.js';
import { exportProject as exportAlsProject } from './export.js';

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
    if (playBtn) {
        e.stopPropagation();
        playScene(sceneIndex);
        return;
    }
    
    // Handle scene name change
    const nameInput = target.closest('.scene-name-input');
    if (nameInput) {
        appState.scenes[sceneIndex].name = nameInput.value;
        return; // No full re-render needed for text input
    }
    
    // Handle color change
    const colorPicker = target.closest('.scene-color-picker');
    if (colorPicker) {
        const closestIndex = findClosestAbletonColorIndex(colorPicker.value);
        appState.scenes[sceneIndex].colorIndex = closestIndex;
        render(); // Re-render to show the snapped color
        return;
    }

    // Handle scene selection (if not clicking a control)
    appState.selectedSceneIndex = sceneIndex;
    render();
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
    const allClips = appState.grid.flat().filter(c => c);
    if (allClips.length === 0) {
        showNotification("Cannot export an empty project. Please add audio clips.", 4000);
        return;
    }
    
    showNotification("Generating project...", 2000);
    try {
        await exportAlsProject();
        setTimeout(() => showNotification("Project exported successfully!", 3000), 500);
    } catch (error) {
        console.error("Export failed:", error);
        showNotification("An error occurred during export. Check the console.", 4000);
    }
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

    dom.scenesList.addEventListener('click', handleSceneEvents);
    dom.scenesList.addEventListener('change', handleSceneEvents); 
    
    dom.clipGrid.addEventListener('change', handleClipControlEvents);
}

function init() {
    console.log("Ableton Project Stager Initialized.");
    setupEventListeners();
    addNewScene();
    render(); // This is the crucial fix!
}

init();
