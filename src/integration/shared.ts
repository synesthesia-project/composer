import { Message } from '@synesthesia-project/core/protocols/util/messages';
import { LayerState as PlayState } from '@synesthesia-project/core/protocols/control/messages';

export interface IntegrationSettings {
  name: string;
  websocketURL: string;
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

export type Notification = PlayStateNotification;

export type IntegrationMessage = Message<never, never, Notification>;