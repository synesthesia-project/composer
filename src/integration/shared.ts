import { Message } from '@synesthesia-project/core/protocols/util/messages';

export interface IntegrationSettings {
  name: string;
  websocketURL: string;
}

export interface PlayStateTrackMeta {
  /** A unique identifier */
  id: string;
  info?: {
    title: string;
    artist: string;
  };
}

export type PlayStateData = {
  durationMillis: number;
  meta: PlayStateTrackMeta;
  state:
    {state: 'playing'; effectiveStartTimeMillis: number; playSpeed: number;} |
    {state: 'paused'; timeMillis: number;}
};

export type PlayStateNotification = {
  type: 'state';
  data: PlayStateData;
};

export type Notification = PlayStateNotification;

export type IntegrationMessage = Message<never, never, Notification>;