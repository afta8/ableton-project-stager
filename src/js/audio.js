import { appState } from './state.js';
import { render, showNotification } from './ui.js';

function stopAllAudio() {
    appState.playingAudio.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    appState.playingAudio = [];
    appState.playingSceneIndex = -1;
}

export function playScene(sceneIndex) {
    if (appState.playingSceneIndex === sceneIndex) {
        stopAllAudio();
        render();
        return;
    }

    stopAllAudio();
    appState.playingSceneIndex = sceneIndex;
    const sceneClips = appState.grid[sceneIndex].filter(clip => clip !== null);
    
    if (sceneClips.length === 0) {
        showNotification("Scene is empty.", 2000);
        appState.playingSceneIndex = -1;
        render();
        return;
    }

    sceneClips.forEach(clip => {
        const audio = new Audio(URL.createObjectURL(clip.file));
        appState.playingAudio.push(audio);
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name !== 'AbortError') {
                    console.error("Audio playback error:", error);
                    showNotification("Error playing audio file.", 3000);
                }
            });
        }
    });
    render();
}
