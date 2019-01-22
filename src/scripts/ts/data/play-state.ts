import {Maybe, Either, left, right, just} from './functional';

import {PlayStateData as IntegrationPlayStateData} from '../../../integration/shared';

export interface PlayStateControls {
  /**
   * Toggle Play / Pause
   */
  toggle(): void;
  pause(): void;
  goToTime(timeMillis: number): void;
}

export interface MediaPaused {
  /** Point in the media where we are paused, in milliseconds */
  timeMillis: number;
}

export interface MediaPlaying {
  /** Effective time when the media started playing, in milliseconds */
  effectiveStartTimeMillis: number;
}

export interface PlayStateTrackMeta {
  /** A unique identifier */
  id: string;
  info?: {
    title: string;
    artist: string;
  };
}

export interface PlayStateDataOnly {
  /** Duration of the media in milliseconds */
  durationMillis: number;
  meta: PlayStateTrackMeta;
  state: Either<MediaPaused, MediaPlaying>;
}

export interface PlayStateData extends PlayStateDataOnly {
  controls: PlayStateControls;
}

export type PlayState = Maybe<PlayStateData>;

export function playStateDataEquals(a: PlayStateDataOnly, b: PlayStateDataOnly) {
  return (
   a.durationMillis === b.durationMillis &&
   a.state.equals(
     b.state,
     (a, b) => a.timeMillis === b.timeMillis,
     (a, b) => a.effectiveStartTimeMillis === b.effectiveStartTimeMillis
   )
 );
}

export function fromIntegrationData(data: IntegrationPlayStateData): Maybe<PlayStateDataOnly> {
  // TODO: implement playSpeed
  // TODO: replace type definitions in here with those specified in shared.ts
  const state: Either<MediaPaused, MediaPlaying> = data.state.state === 'playing' ?
    right({effectiveStartTimeMillis: data.state.effectiveStartTimeMillis}) :
    left({timeMillis: data.state.timeMillis});
  return just({
    durationMillis: data.durationMillis,
    meta: data.meta,
    state
  });
}
