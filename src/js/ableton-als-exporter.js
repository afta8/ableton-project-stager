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


/**
 * Sanitizes a string for safe inclusion in XML by escaping special characters.
 * @param {string} str The string to sanitize.
 * @returns {string} The sanitized string.
 */
function sanitizeXml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
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

    addScene(scene) {
        this.scenes.push(scene);
    }

    addTrack(track) {
        this.tracks.push(track);
    }

    addClip(sceneIndex, trackIndex, clipData) {
        const key = `${sceneIndex}-${trackIndex}`;
        this.clips.set(key, clipData);
        if (clipData.file && !this.audioFiles.has(clipData.name)) {
            this.audioFiles.set(clipData.name, clipData.file);
        }
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
        const uniqueId1 = this.nextId++;
        const uniqueId2 = this.nextId++;
    
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
                                    <Name Value="${sanitizeXml(clip.name)}" />
                                    <RelativePath Value="Samples/Imported/${sanitizeXml(clip.name)}" />
                                    <Type Value="2" />
                                </FileRef>
                            </SampleRef>
                            <WarpMarkers>
                                <WarpMarker Id="${uniqueId1}" SecTime="0" BeatTime="0" />
                                <WarpMarker Id="${uniqueId2}" SecTime="${clip.duration || (60 / clip.bpm * clipLengthInBeats)}" BeatTime="${clipLengthInBeats}" />
                            </WarpMarkers>
                        </AudioClip>
                    </Value>
                </ClipSlot>
                <HasStop Value="true" />
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
                <DevicesListWrapper LomId="0"/>
                <ClipSlotsListWrapper LomId="0"/>
                <ArrangementClipsListWrapper LomId="0"/>
                <TakeLanesListWrapper LomId="0"/>
                <DeviceChain>
                    <MainSequencer><ClipSlotList/></MainSequencer>
                </DeviceChain>
           </MainTrack>
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
               <TimeSignatureId Value="0"/>
               <IsTimeSignatureEnabled Value="false"/>
               <ClipSlotsListWrapper LomId="0" />
           </Scene>`).join('\n');
        return `<Scenes>${sceneContent}</Scenes>`;
    }
   
    _generateAlsXml() {
        const tracksXml = this.tracks.map((track, index) => this._generateTrackXml(track, index)).join('\n');
        const masterTrackXml = this._generateMasterTrackXml();
        const scenesXml = this._generateScenesXml();
        this.nextId = this.nextId + this.tracks.length * this.scenes.length * 2;
   
        return `<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="5" MinorVersion="12.0_12203" SchemaChangeCount="3" Creator="Ableton Project Stager">
    <LiveSet>
        <NextPointeeId Value="${this.nextId}" />
        <OverwriteProtectionNumber Value="${Math.floor(Math.random() * 4000)}" />
        <LomId Value="0" />
        <Tracks>
            ${tracksXml}
        </Tracks>
        ${masterTrackXml}
        <PreHearTrack>
            <LomId Value="0" />
            <Name><EffectiveName Value="Master" /></Name>
            <DevicesListWrapper LomId="0"/>
            <ClipSlotsListWrapper LomId="0"/>
            <ArrangementClipsListWrapper LomId="0"/>
            <TakeLanesListWrapper LomId="0"/>
            <DeviceChain/>
        </PreHearTrack>
        <SendsPre />
        ${scenesXml}
        <TracksListWrapper LomId="0" />
        <ReturnTracksListWrapper LomId="0" />
        <ScenesListWrapper LomId="0" />
        <CuePointsListWrapper LomId="0" />
    </LiveSet>
</Ableton>`;
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
}