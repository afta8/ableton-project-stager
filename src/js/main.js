/**
 * main.js
 *
 * The main entry point for the Ableton Project Stager application.
 * This file is responsible for:
 * - Caching DOM elements.
 * - Setting up all event listeners for user interaction.
 * - Initializing the application state and rendering the initial UI.
 */

import { appState, addNewScene, addClipsToScene } from './state.js';
import { render, showNotification } from './ui.js';
import { playScene } from './audio.js';
import { exportProject } from './abletonAlsExporterController.js';
import { AbletonAlsExporter } from './ableton-als-exporter.js';

// --- DOM ELEMENTS CACHE ---
// Caching frequently accessed DOM elements for better performance.
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
    // If no scene is selected, create a new one to upload the files to.
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

/**
 * Handles all events within the scenes list using event delegation.
 * This includes scene selection, play/stop, name changes, and color changes.
 * @param {Event} e - The event object.
 */
function handleSceneEvents(e) {
    const target = e.target;
    const sceneItem = target.closest('.scene-item');
    if (!sceneItem) return;

    const sceneIndex = parseInt(sceneItem.dataset.sceneIndex, 10);
    
    // Handle play button click
    const playBtn = target.closest('.scene-play-btn');
    if (playBtn && e.type === 'click') {
        e.stopPropagation(); // Prevent the scene selection from firing.
        playScene(sceneIndex);
        return;
    }
    
    // Handle scene name change (on blur, which is part of the 'change' event for inputs)
    const nameInput = target.closest('.scene-name-input');
    if (nameInput) {
        appState.scenes[sceneIndex].name = nameInput.value;
        return; // No re-render needed for simple text input.
    }
    
    // Handle color picker change - only fire on the 'change' event.
    const colorPicker = target.closest('.scene-color-picker');
    if (colorPicker && e.type === 'change') {
        const userHexColor = colorPicker.value;
        // Ask the library for the correct corresponding Ableton color.
        const abletonHexColor = AbletonAlsExporter.getNearestAbletonColor(userHexColor);
        
        // Update the state with the snapped Ableton color.
        appState.scenes[sceneIndex].hexColor = abletonHexColor;
        
        render(); // Re-render to show the snapped color.
        return;
    }

    // Handle scene selection on click (but not if clicking a control).
    if (e.type === 'click' && !playBtn && !nameInput && !colorPicker) {
        appState.selectedSceneIndex = sceneIndex;
        render();
    }
}

/**
 * Handles all 'change' events within the clip grid using event delegation.
 * This includes updates to a clip's BPM, warp mode, and loop status.
 * @param {Event} e - The event object.
 */
function handleClipControlEvents(e) {
    const target = e.target;
    const sceneIndex = target.dataset.sceneIndex;
    const trackIndex = target.dataset.trackIndex;

    if (sceneIndex === undefined || trackIndex === undefined) return;

    const clip = appState.grid[sceneIndex][trackIndex];
    if (!clip) return;

    if (target.classList.contains('clip-bpm')) {
        clip.bpm = parseFloat(target.value) || 120.00;
        // Recalculate length in beats when BPM changes.
        clip.lengthInBeats = parseFloat((clip.duration * (clip.bpm / 60)).toFixed(2));
        render(); // Re-render to show the new length.
    } else if (target.classList.contains('clip-warp')) {
        clip.warpMode = parseInt(target.value, 10);
    } else if (target.classList.contains('clip-loop')) {
        clip.loop = target.checked;
    }
}

/**
 * A wrapper function to call the exporter controller.
 */
async function handleExport() {
    await exportProject();
}

// --- INITIALIZATION ---

/**
 * Sets up all the application's event listeners.
 */
function setupEventListeners() {
    dom.tempoInput.addEventListener('change', handleProjectTempoChange);
    dom.addSceneBtn.addEventListener('click', () => {
        addNewScene();
        render();
    });
    dom.uploadAudioBtn.addEventListener('click', () => dom.audioFileInput.click());
    dom.audioFileInput.addEventListener('change', handleFileUpload);
    dom.exportBtn.addEventListener('click', handleExport);

    // Using event delegation on the parent containers for efficiency.
    dom.scenesList.addEventListener('click', handleSceneEvents);
    dom.scenesList.addEventListener('change', handleSceneEvents); 
    dom.clipGrid.addEventListener('change', handleClipControlEvents);
}

/**
 * The main initialization function for the application.
 */
function init() {
    console.log("Ableton Project Stager Initialized.");
    setupEventListeners();
    addNewScene(); // Start with one empty scene.
    render();
}

// Start the application.
init();