/**
 * abletonAlsExporterController.js
 *
 * This file acts as a controller or that connects the main application
 * state with the ableton-als-exporter.js library.
 *
 * Its primary responsibility is to gather all the necessary data from the application's
 * state (appState), instantiate the exporter, and call its methods in the correct
 * order to build and trigger the download of the .als project file.
 */

import { appState } from './state.js';
import { showNotification } from './ui.js';
import { AbletonAlsExporter } from './ableton-als-exporter.js';

/**
 * Orchestrates the entire project export process.
 */
export async function exportProject() {
    // First, check if there's anything to export.
    const allClips = appState.grid.flat().filter(c => c);
    if (allClips.length === 0) {
        showNotification("Cannot export an empty project. Please add audio clips.", 4000);
        return;
    }

    showNotification("Generating project...", 2000);

    try {
        // 1. Create a new instance of the exporter library.
        // This creates a blank-slate project ready to be built.
        const exporter = new AbletonAlsExporter();

        // 2. Set global project properties.
        // Here, we're passing the tempo from our application's state.
        exporter.setTempo(appState.projectTempo);

        // 3. Add all tracks from the application's state to the exporter.
        appState.tracks.forEach(track => exporter.addTrack(track));

        // 4. Add all scenes. The library's `addScene` method expects an object
        // with a name and a standard hex color string. It handles the conversion
        // to a valid Ableton color internally.
        appState.scenes.forEach(scene => {
            exporter.addScene({ name: scene.name, colorHex: scene.hexColor });
        });

        // 5. Iterate through the application's grid state and add each clip
        // to the exporter, providing its scene and track index.
        appState.grid.forEach((sceneRow, sceneIndex) => {
            sceneRow.forEach((clip, trackIndex) => {
                if (clip) {
                    exporter.addClip(sceneIndex, trackIndex, clip);
                }
            });
        });

        // 6. Call the main library method to generate the final .zip file Blob.
        // This is an async process that builds the XML and packages all the files.
        const zipBlob = await exporter.generateProjectZip();

        // 7. Create a temporary download link and click it to trigger the browser download.
        const projectName = `Project-${Date.now()}`;
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = `${projectName}.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink); // Clean up the link element.

        setTimeout(() => showNotification("Project exported successfully!", 3000), 500);

    } catch (error) {
        console.error("Export failed:", error);
        showNotification("An error occurred during export. Check the console.", 4000);
    }
}