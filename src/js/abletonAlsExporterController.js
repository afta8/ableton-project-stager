import { appState } from './state.js';
import { showNotification } from './ui.js';
import { AbletonAlsExporter } from './ableton-als-exporter.js';

export async function exportProject() {
    const allClips = appState.grid.flat().filter(c => c);
    if (allClips.length === 0) {
        showNotification("Cannot export an empty project. Please add audio clips.", 4000);
        return;
    }

    showNotification("Generating project...", 2000);

    try {
        const exporter = new AbletonAlsExporter();

        // 1. Set global project properties
        exporter.setTempo(appState.projectTempo);

        // 2. Add tracks from the app state
        appState.tracks.forEach(track => exporter.addTrack(track));

        // 3. Add scenes, passing the snapped hex color to the library
        appState.scenes.forEach(scene => {
            exporter.addScene({ name: scene.name, colorHex: scene.hexColor });
        });

        // 4. Add all clips from the grid
        appState.grid.forEach((sceneRow, sceneIndex) => {
            sceneRow.forEach((clip, trackIndex) => {
                if (clip) {
                    exporter.addClip(sceneIndex, trackIndex, clip);
                }
            });
        });

        // 5. Generate the final zip blob from the library
        const zipBlob = await exporter.generateProjectZip();

        // 6. Trigger the download
        const projectName = `Project-${Date.now()}`;
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = `${projectName}.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setTimeout(() => showNotification("Project exported successfully!", 3000), 500);

    } catch (error) {
        console.error("Export failed:", error);
        showNotification("An error occurred during export. Check the console.", 4000);
    }
}