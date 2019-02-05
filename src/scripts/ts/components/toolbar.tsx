import * as React from 'react';
import {isEqual} from 'lodash';
import {styled, buttonDisabled, rectButton, buttonPressed} from './styling';

import * as file from '@synesthesia-project/core/file';
import { validateFile } from '@synesthesia-project/core/file/file-validation';

import { IntegrationSettings, FileState } from '../../../integration/shared';

import * as spotifyAuth from '../auth/spotify';
import {SpotifySdk, spotifyWebPlaybackSDKReady} from '../external/spotify-sdk';
import * as func from '../data/functional';
import * as storage from '../util/storage';
import {PlayState} from '../data/play-state';
import {Source} from '../sources/source';
import {FileSource} from '../sources/file-source';
import { IntegrationSource } from '../sources/integration-source';
import {SpotifySource} from '../sources/spotify-source';
import {SpotifyLocalSource} from '../sources/spotify-local-source';
import {SpotifyIcon} from './icons/spotify';

import {MdSave, MdFolderOpen, MdUndo, MdRedo} from 'react-icons/md';

import { ConnectionButton } from './connection-button';
import { IntegrationButton } from './integration-button';

interface Window {
  integrationSettings?: IntegrationSettings;
}

export interface FileSourceProps {
  className?: string;
  file: func.Maybe<file.CueFile>;
  playState: PlayState;
  // Callbacks
  playStateUpdated: (value: PlayState) => void;
  fileLoaded: (file: file.CueFile) => void;
}

type Integration = { source: IntegrationSource; fileState: FileState } | null;

interface FileSourceState {
  integration: Integration;
  source: Source | null;
  companionAllowed: boolean;
  spotifyWebPlaybackSDK: SpotifySdk | null;
}

class Toolbar extends React.Component<FileSourceProps, FileSourceState> {

  private readonly undo: () => void;
  private readonly redo: () => void;
  private readonly save: () => void;

  constructor(props: FileSourceProps) {
    super(props);

    let integration: Integration = null;
    const w = window as Window;
    if (w.integrationSettings) {
      integration = {
        source: new IntegrationSource(w.integrationSettings),
        fileState: {
          canRedo: false,
          canSave: false,
          canUndo: false
        }
      };
      integration.source.addListener('new-cue-file', (id, file, fileState) => {
        const currentId = this.props.playState.caseOf({
          just: state => state.meta.id,
          none: () => null
        });
        if (currentId === id) {
          this.props.fileLoaded(file);
          console.log(fileState);
          this.setState(state => {
            let integration: Integration = null;
            if (state.integration) {
              integration =  {
                source: state.integration.source,
                fileState,
              };
            }
            return {integration};
          });
        } else {
          console.log('Got cue file for unknown song: ', id);
        }
      });
    }

    console.log('integrationSettings', w.integrationSettings);

    this.state = {
      integration,
      source: null,
      companionAllowed: true,
      spotifyWebPlaybackSDK: null
    };

    // Bind callbacks & event listeners
    this.loadAudioFile = this.loadAudioFile.bind(this);
    this.toggleSpotify = this.toggleSpotify.bind(this);
    this.toggleSpotifyLocal = this.toggleSpotifyLocal.bind(this);
    this.saveFile = this.saveFile.bind(this);
    this.openFile = this.openFile.bind(this);
    this.undo = this.fileAction('undo');
    this.redo = this.fileAction('redo');
    this.save = this.fileAction('save');
  }

  public componentDidMount() {
    // Check if Spotify SDK is ready and enables
    spotifyWebPlaybackSDKReady.then(spotifyWebPlaybackSDK => this.setState({spotifyWebPlaybackSDK}));
    // Set source to integration if it's set
    if (this.state.integration) {
      this.setNewSource(this.state.integration.source);
    }
  }

  public saveFile() {
    const filename = this.props.playState.caseOf({
      just: state =>
        state.meta.info ?
        `${state.meta.info.artist} - ${state.meta.info.title}.scue` :
        'song.scue'
      ,
      none: () => 'song.scue'
    });
    this.props.file.fmap(file => {
      storage.saveStringAsFile(JSON.stringify(file), filename);
    });
  }

  public openFile() {
    storage.loadFileAsString().then(fileString => {
      const obj = JSON.parse(fileString);
      const validatedFile = validateFile(obj);
      this.props.fileLoaded(validatedFile);
    });
  }

  public componentWillReceiveProps(nextProps: FileSourceProps): void {
    const trackId = nextProps.playState.caseOf({
      just: state => state.meta.id,
      none: () => null
    });
    if (nextProps.file !== this.props.file &&
        this.state.integration &&
        !isEqual(this.props.file, nextProps.file) &&
        trackId) {
      // Time to send new song info to the server, as it's changed
      // TODO: use real ID that server gives
      const nextFile = nextProps.file;
      const integration = this.state.integration;
      const cueFile = nextFile.caseOf({
        just: cueFile => cueFile,
        none: () => this.props.file.caseOf({
          just: cueFile => cueFile,
          none: () => file.emptyFile(1000)
        })
      });
      integration.source.sendCueFile(trackId, cueFile);
    }
  }

  public render() {
    const source = this.state.source ? this.state.source.sourceKind() : 'none';
    if (this.state.integration) {
      return (
        <div className={this.props.className}>
          <IntegrationButton integration={this.state.integration.source} settings={this.state.integration.source.getSettings()} />
          <span className="description">{this.getTrackDescription()}</span>
          <span className="grow"/>
          <button className={this.state.integration.fileState.canUndo ? '' : 'disabled'} onClick={this.undo} title="Undo"><MdUndo/></button>
          <button className={this.state.integration.fileState.canRedo ? '' : 'disabled'} onClick={this.redo} title="Redo"><MdRedo/></button>
          <button className={this.state.integration.fileState.canSave ? '' : 'disabled'} onClick={this.save} title="Save"><MdSave/></button>
        </div>
      );
    } else {
      return (
        <div className={this.props.className}>
          <input id="file_picker" type="file" onChange={this.loadAudioFile} />
          <label htmlFor="file_picker"><MdFolderOpen/> Open Audio File</label>
          <button className={source === 'spotify' ? ' pressed' : ''} onClick={this.toggleSpotify}>
            <SpotifyIcon /> Connect To Remote
          </button>
          <button
            className={
              (source === 'spotify-local' ? ' pressed' : '') +
              (this.state.spotifyWebPlaybackSDK !== null ? '' : ' disabled')}
            onClick={this.toggleSpotifyLocal}
            title={
              this.state.spotifyWebPlaybackSDK === null ?
              'Spotify Local Play is not possible when Synesthesia is run as an extension' : undefined}>
            <SpotifyIcon /> Play Locally
          </button>
          <span className="description">{this.getTrackDescription()}</span>
          <span className="grow"/>
          <ConnectionButton file={this.props.file} playState={this.props.playState} />
          <button onClick={this.openFile} title="Open"><MdFolderOpen/></button>
          <button className={this.props.file.isJust() ? '' : 'disabled'} onClick={this.saveFile} title="Save"><MdSave/></button>
        </div>
      );
    }
  }

  private getTrackDescription() {
    return this.props.playState.caseOf({
      just: state =>
        state.meta.info ? (
          state.meta.info.artist ?
          `${state.meta.info.artist} - ${state.meta.info.title}` :
          state.meta.info.title
        ) : 'Unknown Track'
      ,
      none: () => null
    });
  }

  private setNewSource(source: Source) {
    if (this.state.source) {
      this.state.source.dispose();
    }
    this.setState({source});
    source.addStateListener(this.props.playStateUpdated);
    source.addDisconnectedListener(() => {
      this.setState({source: null});
      this.props.playStateUpdated(func.none());
    });
  }

  private loadAudioFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const source = new FileSource(ev.target);
    this.setNewSource(source);
    ev.target.value = '';
  }

  private toggleSpotify() {
    if (this.state.source && this.state.source.sourceKind() === 'spotify') {
      this.state.source.dispose();
    } else {
      spotifyAuth.authSpotify(true).then(
        token => {
          this.setNewSource(new SpotifySource(token));
        },
        err => {
          alert(err);
        }
      );
    }
  }

  private toggleSpotifyLocal() {
    if (this.state.spotifyWebPlaybackSDK === null) return;
    if (this.state.source && this.state.source.sourceKind() === 'spotify-local') {
      this.state.source.dispose();
    } else {
      spotifyAuth.authSpotify(true).then(
        token => {
          if (this.state.spotifyWebPlaybackSDK === null) return;
          this.setNewSource(new SpotifyLocalSource(this.state.spotifyWebPlaybackSDK, token));
        },
        err => {
          alert(err);
        }
      );
    }
  }

  private fileAction(action: 'undo' | 'redo' | 'save') {
    return () => this.props.playState.caseOf({
      just: state => {
        if (this.state.integration)
          this.state.integration.source.sendRequest({
            request: 'file-action',
            id: state.meta.id,
            action
          });
      },
      none: () => { /* */ }
    });
  }
}

const StyledToolbar = styled(Toolbar)`
  display: block;
  background-color: ${p => p.theme.bgLight1};
  border-bottom: 1px solid ${p => p.theme.borderDark};
  box-shadow: 0px 1px 8px 0px rgba(0,0,0,0.3);
  z-index:100;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: ${p => p.theme.spacingPx / 2}px;

  input {
  	width: 0.1px;
  	height: 0.1px;
  	opacity: 0;
  	overflow: hidden;
  	position: absolute;
  	z-index: -1;
    margin: ${p => p.theme.spacingPx / 2}px;

    & + label {
      margin: ${p => p.theme.spacingPx / 2}px;
      ${rectButton}

      > svg {
        margin-right: 5px;
      }
    }
  }

  button {
    ${rectButton}
    margin: ${p => p.theme.spacingPx / 2}px;
    outline: none;

    &.pressed {
      ${buttonPressed}
    }

    &.disabled {
      ${buttonDisabled}

      &.connectToCompanion {
        display: none;
      }
    }

    &.connectToCompanion {
      > svg {
        margin-right: 5px;
      }
    }
  }

  > .grow {
    flex-grow: 1;
  }

  > span, > .flex > span {
    margin: ${p => p.theme.spacingPx / 2}px;
    font-size: 14px;
    padding: 0 6px;
    opacity: 0.8;
  }
`;

export {StyledToolbar as Toolbar};

