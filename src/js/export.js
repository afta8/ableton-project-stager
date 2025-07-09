import JSZip from 'jszip';
import pako from 'pako';
import { appState } from './state.js';
import { sanitizeXml } from './utils.js';

function getUniqueId() {
    return appState.nextId++;
}

function generateClipXml(clip, sceneIndex) {
    const clipSlotId = sceneIndex;
    if (!clip) {
        return `<ClipSlot Id="${clipSlotId}"><HasStopButton Value="true" /></ClipSlot>`;
    }
    
    const clipLengthInBeats = clip.lengthInBeats || 4.0;
    const sanitizedName = sanitizeXml(clip.name);

    return `
        <ClipSlot Id="${clipSlotId}">
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
                            <WarpMarker Id="${getUniqueId()}" SecTime="0" BeatTime="0" />
                            <WarpMarker Id="${getUniqueId()}" SecTime="${clip.duration || (60 / clip.bpm * clipLengthInBeats)}" BeatTime="${clipLengthInBeats}" />
                        </WarpMarkers>
                    </AudioClip>
                </Value>
            </ClipSlot>
            <HasStopButton Value="true" />
        </ClipSlot>
    `;
}

function generateTrackXml(track, trackIndex) {
     const clipSlots = appState.grid.map((sceneRow, sceneIndex) => generateClipXml(sceneRow[trackIndex], sceneIndex)).join('\n');
     const emptyClipSlots = appState.scenes.map((_, sceneIndex) => `<ClipSlot Id="${sceneIndex}"><LomId Value="0"/><ClipSlot><Value/></ClipSlot><HasStopButton Value="true"/></ClipSlot>`).join('\n');

    return `
        <AudioTrack Id="${track.id}">
            <LomId Value="0" />
            <Name><EffectiveName Value="${track.name}" /></Name>
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
                    <ClipSlotList>
                        ${emptyClipSlots}
                    </ClipSlotList>
                </FreezeSequencer>
            </DeviceChain>
        </AudioTrack>
    `;
}

function generateMasterTrackXml() {
     return `
        <MainTrack>
            <LomId Value="0" />
            <Name><EffectiveName Value="Main" /></Name>
            <DeviceChain>
                <Mixer>
                    <LomId Value="0" />
                    <Tempo><Manual Value="${appState.projectTempo}.0" /></Tempo>
                </Mixer>
            </DeviceChain>
        </MainTrack>
    `;
}

function generateScenesXml() {
     const sceneContent = appState.scenes.map((scene, index) => `
        <Scene Id="${index}">
            <LomId Value="0" />
            <Name Value="${sanitizeXml(scene.name)}" />
            <Color Value="${scene.colorIndex}" />
            <Tempo Value="${appState.projectTempo}" />
            <IsTempoEnabled Value="false" />
            <ClipSlotsListWrapper LomId="0" />
        </Scene>`).join('\n');
     return `<Scenes>${sceneContent}</Scenes>`;
}

function generateAlsXml() {
    const tracksXml = appState.tracks.map((track, index) => generateTrackXml(track, index)).join('\n');
    const masterTrackXml = generateMasterTrackXml();
    const scenesXml = generateScenesXml();

    return `<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="5" MinorVersion="12.0_12203" SchemaChangeCount="3" Creator="Ableton Project Stager">
    <LiveSet>
        <NextPointeeId Value="${appState.nextId}" />
        <OverwriteProtectionNumber Value="${Math.floor(Math.random() * 4000)}" />
        <LomId Value="0" />
        <TracksListWrapper LomId="0" />
        <ReturnTracksListWrapper LomId="0" />
        <ScenesListWrapper LomId="0" />
        <CuePointsListWrapper LomId="0" />
        <Tracks>${tracksXml}</Tracks>
        ${masterTrackXml}
        <PreHearTrack>
            <LomId Value="0" />
            <Name><EffectiveName Value="Master" /></Name>
            <DeviceChain><Devices /></DeviceChain>
            <Mixer><Volume><Manual Value="0.5" /></Volume></Mixer>
        </PreHearTrack>
        <SendsPre />
        ${scenesXml}
        <Transport>
            <LoopOn Value="false" />
            <LoopStart Value="8" />
            <LoopLength Value="16" />
        </Transport>
    </LiveSet>
</Ableton>`;
}

export async function exportProject() {
    const projectName = `Project-${Date.now()}`;
    const zip = new JSZip();
    const projectFolder = zip.folder(projectName);

    projectFolder.folder("Ableton Project Info");

    const samplesFolder = projectFolder.folder("Samples/Imported");
    const allClips = appState.grid.flat().filter(c => c);
    for (const clip of allClips) {
        samplesFolder.file(clip.name, clip.file);
    }

    const xmlString = generateAlsXml();
    const gzippedXml = pako.gzip(xmlString);
    projectFolder.file(`${projectName}.als`, gzippedXml);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(zipBlob);
    downloadLink.download = `${projectName}.zip`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
