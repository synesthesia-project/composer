import { Message } from '@synesthesia-project/core/protocols/util/messages';
import { LayerState as PlayState } from '@synesthesia-project/core/protocols/control/messages';

export interface IntegrationSettings {
  name: string;
  websocketURL: string;
}

export interface ToggleRequest {
  request: 'toggle';
}

export interface PauseRequest {
  request: 'pause';
}

export interface GoToTimeRequest {
  request: 'go-to-time';
  positionMillis: number;
}

/** Response for [[ToggleRequest]], [[PauseRequest]] or [[GoToTimeRequest]] */
export interface ControlResponse {
  success: boolean;
}

export interface PlayStateTrackMeta {
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

/** Request sent from the composer to the server */
export type ComposerRequest = ToggleRequest | PauseRequest | GoToTimeRequest;

/** Response sent from the server to the composer */
export type ServerResponse = ControlResponse;

/** Notification sent from the server to the composer */
export type ServerNotification = PlayStateNotification;

/** All Request types */
export type Request = ComposerRequest;
/** All Response types */
export type Response = ServerResponse;
/** All Response types */
export type Notification = ServerNotification;

export type IntegrationMessage = Message<Request, Response, Notification>;