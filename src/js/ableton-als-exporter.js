/**
 * ableton-als-exporter.js
 * A self-contained, single-file JavaScript library for creating Ableton Live Set (.als) files.
 *
 * Author: Aftab Hussain
 *
 * Licensed under the MIT License.
 * Source code available at: https://github.com/afta8/ableton-project-stager
 *
 * This module is designed for a client-side web application environment
 * and depends on 'jszip' and 'pako', which are expected to be available
 * in the host application.
 */

import JSZip from 'jszip';
import pako from 'pako';

// --- Internal Constants & Helpers ---

const ABLETON_COLOR_PALETTE = {
    0: '#f78f8f', 1: '#f7b08f', 2: '#f7c88f', 3: '#f7e08f', 4: '#f3f78f',
    5: '#d3f78f', 6: '#b3f78f', 7: '#93f78f', 8: '#8ff7a8', 9: '#8ff7c4',
    10: '#8ff7e0', 11: '#8ff7f7', 12: '#8fe0f7', 13: '#8fc8f7', 14: '#8fb0f7',
    15: '#938ff7', 16: '#b38ff7', 17: '#d38ff7', 18: '#f38ff7', 19: '#f78fe0',
    20: '#f78fc8', 21: '#f78fb0', 22: '#ffffff', 23: '#ec0000', 24: '#ec6e00',
    25: '#ec9a00', 26: '#ecc600', 27: '#ecec00', 28: '#9acc00', 29: '#68cc00',
    30: '#00cc00', 31: '#00cc6f', 32: '#00cc9b', 33: '#00ccc7', 34: '#00c6ec',
    35: '#009aec', 36: '#006fec', 37: '#0043ec', 38: '#6843ec', 39: '#9a43ec',
    40: '#c643ec', 41: '#ec43ec', 42: '#ec43c7', 43: '#ec439b', 44: '#ec436f',
    45: '#c3c3c3', 46: '#e06464', 47: '#e09464', 48: '#e0b064', 49: '#e0c864',
    50: '#e0e064', 51: '#b0d664', 52: '#94d664', 53: '#64d664', 54: '#64d694',
    55: '#64d6b0', 56: '#64d6c8', 57: '#64d6e0', 58: '#64c8e0', 59: '#64b0e0',
    60: '#6494e0', 61: '#6464e0', 62: '#9464e0', 63: '#b064e0', 64: '#c864e0',
    65: '#e064e0', 66: '#e064c8', 67: '#e064b0', 68: '#e06494', 69: '#7f7f7f'
};

function sanitizeXml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function colorDistance(rgb1, rgb2) {
    return Math.sqrt(Math.pow(rgb1.r - rgb2.r, 2) + Math.pow(rgb1.g - rgb2.g, 2) + Math.pow(rgb1.b - rgb2.b, 2));
}

function findClosestAbletonColorIndex(hexColor) {
    if (!hexColor) return 0;
    const userRgb = hexToRgb(hexColor);
    if (!userRgb) return 0;

    let closestIndex = 0;
    let minDistance = Infinity;

    for (const [index, abletonHex] of Object.entries(ABLETON_COLOR_PALETTE)) {
        const abletonRgb = hexToRgb(abletonHex);
        if (abletonRgb) {
            const distance = colorDistance(userRgb, abletonRgb);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        }
    }
    return parseInt(closestIndex, 10);
}

// --- Main Library Class ---

export class AbletonAlsExporter {
    constructor() {
        this.projectTempo = 120;
        this.nextId = 20000;
        this.scenes = [];
        this.tracks = [];
        this.clips = new Map();
        this.audioFiles = new Map();
    }

    setTempo(bpm) {
        this.projectTempo = bpm;
    }

    addScene({ name, colorHex }) {
        const colorIndex = findClosestAbletonColorIndex(colorHex);
        this.scenes.push({ name, colorIndex, id: this._getUniqueId() });
    }

    addTrack(track) {
        this.tracks.push({ ...track, id: this._getUniqueId() });
    }

    addClip(sceneIndex, trackIndex, clipData) {
        const key = `${sceneIndex}-${trackIndex}`;
        const clipWithId = { ...clipData, id: this._getUniqueId() };
        this.clips.set(key, clipWithId);

        if (clipData.file && !this.audioFiles.has(clipData.name)) {
            this.audioFiles.set(clipData.name, clipData.file);
        }
    }

    async generateProjectZip() {
        const projectName = `Project-${Date.now()}`;
        const zip = new JSZip();
        const projectFolder = zip.folder(projectName);

        projectFolder.folder("Ableton Project Info");

        const samplesFolder = projectFolder.folder("Samples/Imported");
        for (const [name, file] of this.audioFiles.entries()) {
            samplesFolder.file(sanitizeXml(name), file);
        }

        const xmlString = this._generateAlsXml();
        const gzippedXml = pako.gzip(xmlString);
        projectFolder.file(`${projectName}.als`, gzippedXml);

        return zip.generateAsync({ type: 'blob' });
    }

    _getUniqueId() {
        return this.nextId++;
    }

    _generateClipXml(sceneIndex, trackIndex) {
        const key = `${sceneIndex}-${trackIndex}`;
        const clip = this.clips.get(key);
        const clipSlotId = sceneIndex;

        if (!clip) {
            return `<ClipSlot Id="${clipSlotId}"><LomId Value="0"/><ClipSlot><Value/></ClipSlot><HasStop Value="true"/></ClipSlot>`;
        }

        const clipLengthInBeats = clip.lengthInBeats || 4.0;
        const sanitizedName = sanitizeXml(clip.name);

        return `
            <ClipSlot Id="${clipSlotId}">
                <LomId Value="0"/>
                <ClipSlot>
                    <Value>
                        <AudioClip Id="${clip.id}">
                            <Name Value="${sanitizedName}" />
                            <CurrentEnd Value="${clipLengthInBeats}" />
                            <IsWarped Value="true" />
                            <WarpMode Value="${clip.warpMode}" />
                            <Loop>
                                <LoopOn Value="${clip.loop}" />
                                <LoopStart Value="0.0" />
                                <LoopEnd Value="${clipLengthInBeats}" />
                                <StartRelative Value="0.0" />
                            </Loop>
                            <SampleRef>
                                <FileRef>
                                    <Name Value="${sanitizedName}" />
                                    <RelativePath Value="Samples/Imported/${sanitizedName}" />
                                    <Type Value="2" />
                                </FileRef>
                            </SampleRef>
                            <WarpMarkers>
                                <WarpMarker Id="${this._getUniqueId()}" SecTime="0" BeatTime="0" />
                                <WarpMarker Id="${this._getUniqueId()}" SecTime="${clip.duration || (60 / clip.bpm * clipLengthInBeats)}" BeatTime="${clipLengthInBeats}" />
                            </WarpMarkers>
                        </AudioClip>
                    </Value>
                </ClipSlot>
                <HasStop Value="true"/>
            </ClipSlot>
        `;
    }

    _generateTrackXml(track, trackIndex) {
        const clipSlots = this.scenes.map((_, sceneIndex) => this._generateClipXml(sceneIndex, trackIndex)).join('\n');
        const emptyClipSlots = this.scenes.map((_, sceneIndex) => `<ClipSlot Id="${sceneIndex}"><LomId Value="0"/><ClipSlot><Value/></ClipSlot><HasStop Value="true"/></ClipSlot>`).join('\n');

        return `
            <AudioTrack Id="${track.id}">
                <LomId Value="0" />
                <Name><EffectiveName Value="${sanitizeXml(track.name)}" /></Name>
                <Color Value="${trackIndex + 10}" />
                <TrackGroupId Value="-1" />
                <DevicesListWrapper LomId="0" />
                <ClipSlotsListWrapper LomId="0" />
                <ArrangementClipsListWrapper LomId="0" />
                <TakeLanesListWrapper LomId="0" />
                <DeviceChain>
                    <MainSequencer>
                        <LomId Value="0" />
                        <ClipSlotList>
                            ${clipSlots}
                        </ClipSlotList>
                    </MainSequencer>
                    <FreezeSequencer>
                        <LomId Value="0"/>
                        <ClipSlotList>
                            ${emptyClipSlots}
                        </ClipSlotList>
                    </FreezeSequencer>
                </DeviceChain>
            </AudioTrack>
        `;
    }

    _generateMasterTrackXml() {
        return `
            <MainTrack>
                <LomId Value="0"/>
                <Name><EffectiveName Value="Main"/></Name>
                <DeviceChain>
                    <Mixer>
                        <LomId Value="0"/>
                        <Tempo><Manual Value="${this.projectTempo.toFixed(6)}"/></Tempo>
                    </Mixer>
                </DeviceChain>
            </MainTrack>
        `;
    }

    _generatePreHearTrackXml() {
        return `
            <PreHearTrack>
                <LomId Value="0"/>
                <Name><EffectiveName Value="Master"/></Name>
                <DeviceChain>
                    <Mixer>
                        <Volume><Manual Value="0.5"/></Volume>
                    </Mixer>
                </DeviceChain>
            </PreHearTrack>
        `;
    }
    
    _generateScenesXml() {
        const sceneContent = this.scenes.map((scene, index) => `
            <Scene Id="${index}">
                <LomId Value="0" />
                <Name Value="${sanitizeXml(scene.name)}" />
                <Color Value="${scene.colorIndex}" />
                <Tempo Value="${this.projectTempo}" />
                <IsTempoEnabled Value="false" />
                <ClipSlotsListWrapper LomId="0" />
            </Scene>`).join('\n');
        return `<Scenes>${sceneContent}</Scenes>`;
    }

    _generateAlsXml() {
        const tracksXml = this.tracks.map((track, index) => this._generateTrackXml(track, index)).join('\n');
        const masterTrackXml = this._generateMasterTrackXml();
        const preHearTrackXml = this._generatePreHearTrackXml();
        const scenesXml = this._generateScenesXml();

        return `<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="5" MinorVersion="12.0_12203" SchemaChangeCount="3" Creator="Ableton Project Stager">
    <LiveSet>
        <NextPointeeId Value="${this.nextId}" />
        <OverwriteProtectionNumber Value="${Math.floor(Math.random() * 4000) + 1}" />
        <LomId Value="0" />
        <Tracks>
            ${tracksXml}
        </Tracks>
        ${masterTrackXml}
        ${preHearTrackXml}
        <SendsPre />
        ${scenesXml}
        <TracksListWrapper LomId="0" />
        <ReturnTracksListWrapper LomId="0" />
        <ScenesListWrapper LomId="0" />
        <CuePointsListWrapper LomId="0" />
    </LiveSet>
</Ableton>`;
    }
}