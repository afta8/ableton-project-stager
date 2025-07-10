/**
 * audio.js
 *
 * Handles all audio playback functionality for the application.
 * This includes playing and stopping scenes and managing the currently playing audio sources.
 */

import { appState } from './state.js';
import { render, showNotification } from './ui.js';

/**
 * Stops all currently playing audio clips and resets the playback state.
 */
function stopAllAudio() {
    appState.playingAudio.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    appState.playingAudio = [];
    appState.playingSceneIndex = -1;
}

/**
 * Plays all clips in a given scene simultaneously.
 * If the scene is already playing, it stops it.
 * @param {number} sceneIndex - The index of the scene to play.
 */
export function playScene(sceneIndex) {
    // If the clicked scene is already playing, stop everything.
    if (appState.playingSceneIndex === sceneIndex) {
        stopAllAudio();
        render(); // Re-render to update the play/stop button states.
        return;
    }

    // Stop any previously playing audio before starting the new scene.
    stopAllAudio();
    appState.playingSceneIndex = sceneIndex;

    // Filter out any empty slots in the scene's grid row.
    const sceneClips = appState.grid[sceneIndex].filter(clip => clip !== null);
    
    if (sceneClips.length === 0) {
        showNotification("Scene is empty.", 2000);
        appState.playingSceneIndex = -1; // Reset since nothing is playing.
        render();
        return;
    }

    // Create and play an Audio object for each clip in the scene.
    sceneClips.forEach(clip => {
        const audio = new Audio(URL.createObjectURL(clip.file));
        appState.playingAudio.push(audio); // Keep track of it to stop it later.
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Ignore AbortError which can happen on rapid play/stop.
                if (error.name !== 'AbortError') {
                    console.error("Audio playback error:", error);
                    showNotification("Error playing audio file.", 3000);
                }
            });
        }
    });

    // Re-render to show the "playing" state on the correct scene.
    render();
}