import { Message } from '@synesthesia-project/core/protocols/util/messages';
import { CueFile } from '@synesthesia-project/core/file';
import { ToggleRequest, PauseRequest, GoToTimeRequest, ControlResponse, LayerState as PlayState }
  from '@synesthesia-project/core/protocols/control/messages';

export interface IntegrationSettings {
  name: string;
  websocketURL: string;
}

export interface FileActionRequest {
  request: 'file-action';
  id: string;
  action: 'undo' | 'redo' | 'save';
}

export interface PlayStateTrackMeta {
  id: string;
  info?: {
    title: string;
    artist?: string;
  };
}

export type PlayStateData = {
  durationMillis: number;
  meta: PlayStateTrackMeta;
  state: PlayState;
};

export type PlayStateNotification = {
  type: 'state';
  data: PlayStateData;
};

/** Can be sent either from the server of from the composer */
export interface ComposerCueFileModifiedNotification {
  type: 'cue-file-modified';
  id: string;
  file: CueFile;
  fileState: null;
}

export type FileState = {
  canSave: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

/** Can be sent either from the server of from the composer */
export interface ServerCueFileModifiedNotification {
  type: 'cue-file-modified';
  id: string;
  file: CueFile;
  fileState: FileState;
}

/** Request sent from the composer to the server */
export type ComposerRequest = ToggleRequest | PauseRequest | GoToTimeRequest | FileActionRequest;

/** Response sent from the server to the composer */
export type ServerResponse = ControlResponse;

/** Notification sent from the server to the composer */
export type ServerNotification = PlayStateNotification | ServerCueFileModifiedNotification;
/** Notification sent from the composer to the server */
export type ComposerNotification = ComposerCueFileModifiedNotification;

/** All Request types */
export type Request = ComposerRequest;
/** All Response types */
export type Response = ServerResponse;
/** All Response types */
export type Notification = ServerNotification | ComposerNotification;

export type IntegrationMessage = Message<Request, Response, Notification>;
