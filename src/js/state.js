import { ABLETON_COLOR_PALETTE } from './constants.js';

export const appState = {
    projectTempo: 120,
    nextId: 20000,
    selectedSceneIndex: -1,
    scenes: [],
    grid: [],
    tracks: [
        { id: 1, name: 'Track 1' }, { id: 2, name: 'Track 2' }, { id: 3, name: 'Track 3' }, { id: 4, name: 'Track 4' },
        { id: 5, name: 'Track 5' }, { id: 6, name: 'Track 6' }, { id: 7, name: 'Track 7' }, { id: 8, name: 'Track 8' }
    ],
    playingSceneIndex: -1,
    playingAudio: [],
};

function getUniqueId() {
    return appState.nextId++;
}

export function addNewScene() {
    const sceneId = getUniqueId();
    const defaultColorIndex = 5;
    appState.scenes.push({
        id: sceneId,
        name: `Scene ${appState.scenes.length + 1}`,
        colorIndex: defaultColorIndex,
        hexColor: ABLETON_COLOR_PALETTE[defaultColorIndex] // Add default hex color
    });
    appState.grid.push(new Array(appState.tracks.length).fill(null));
    appState.selectedSceneIndex = appState.scenes.length - 1;
}

export async function addClipsToScene(files, targetSceneIndex) {
    const validAudioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
    const filesToProcess = validAudioFiles.slice(0, appState.tracks.length);

    for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        const trackIndex = i;
        if (appState.grid[targetSceneIndex][trackIndex] === null) {
            const duration = await getAudioDuration(file);
            const bpm = 120.00;
            const lengthInBeats = parseFloat((duration * (bpm / 60)).toFixed(2));
            
            appState.grid[targetSceneIndex][trackIndex] = {
                id: getUniqueId(),
                name: file.name,
                file: file,
                bpm: bpm,
                loop: true,
                warpMode: 0,
                duration: duration,
                lengthInBeats: lengthInBeats
            };
        }
    }
    return validAudioFiles.length < files.length;
}

function getAudioDuration(file) {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
            window.URL.revokeObjectURL(audio.src);
            resolve(audio.duration);
        };
        audio.src = URL.createObjectURL(file);
    });
}