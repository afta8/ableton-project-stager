# Ableton Project Stager

Ableton Project Stager is a client-side web application built to test and demonstrate a **client-side JavaScript library for programmatically generating Ableton Live Set (`.als`) files.**

The primary goal of this repository is to provide a robust, standalone library (`ableton-als-exporter.js`). The "Stager" application serves as an example of how to use the library.

## Live Demo

**Try the app live at: [https://ableton-project-stager.netlify.app/](https://ableton-project-stager.netlify.app/)**


## The Library: `ableton-als-exporter.js`

The core of this project is the standalone `ableton-als-exporter.js` library, located at `src/js/ableton-als-exporter.js`. It can be dropped into any client-side web project to add Ableton Live export functionality.

### Library Features

* **Self-Contained:** Designed to be a single, portable file with no external dependencies besides `jszip` and `pako` for packaging.
* **Simple API:** A clean class (`AbletonAlsExporter`) with intuitive methods for adding tracks, scenes, and clips.
* **Built-in Helpers:** Includes static helper methods to get valid Ableton-specific data, such as Warp Modes and the nearest color from Ableton's official palette.
* **Robust & Safe:** Automatically handles XML sanitization and color conversion internally to ensure the generated `.als` file is always valid.

### Library Usage

```javascript
import { AbletonAlsExporter } from './ableton-als-exporter.js';

// 1. Create a new exporter instance
const exporter = new AbletonAlsExporter();

// 2. Set global properties and add content
exporter.setTempo(125);
exporter.addTrack({ name: 'Drums' });
exporter.addScene({ name: 'Intro', colorHex: '#8ff7f7' }); // Pass a standard hex color

// 3. Add clip data (file object and properties)
const myAudioFile = new File(["..."], "kick.wav", { type: "audio/wav" });
const clipData = {
    file: myAudioFile,
    name: "kick.wav",
    bpm: 125,
    duration: 0.48,
    lengthInBeats: 1,
    loop: true,
    warpMode: 0 // 'Beats'
};
exporter.addClip(0, 0, clipData); // Add to Scene 0, Track 0

// 4. Generate the project zip file
exporter.generateProjectZip().then(zipBlob => {
    // ... trigger download of the blob ...
});
```

## The Demo App: Ableton Project Stager

The Stager application demonstrates how to implement the library. It provides a useful interface for quickly arranging audio clips and exporting them to a valid Ableton Live project.

### App Features

* **Session-Style Grid:** Organize audio clips with 8 tracks and unlimited scenes.
* **Audio Upload:** Upload samples directly into scene slots.
* **Interactive Controls:** Adjust global tempo, scene colors, and clip properties (BPM, Warp Mode, Loop).
* **Scene Playback:** Preview your arrangement before exporting.
* **One-Click Export:** Generate and download the complete `.als` project.

## Local Development

To run the demo application locally:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/afta8/ableton-project-stager.git](https://github.com/afta8/ableton-project-stager.git)
    cd ableton-project-stager
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the development server:**
    This command starts a local server with hot-reloading.
    ```bash
    npm run dev
    ```

## A Note on the `.als` Format

The `.als` file format is a proprietary, Gzipped XML format that is not officially documented. The successful generation of valid files in this library was achieved through a process of reverse-engineering and meticulous "full structural replication" of known-good files from Ableton Live 12.

## License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.