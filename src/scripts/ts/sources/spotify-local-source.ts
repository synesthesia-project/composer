import {Source} from './source';
import {PlayStateDataOnly, PlayStateTrackMeta} from '../data/play-state';
import {just, none, left, right} from '../data/functional';

import {SpotifySdk} from '../external/spotify-sdk';

const SPOTIFY_PLAYER_NAME = 'Synesthesia Local Player';

export class SpotifyLocalSource extends Source {

  private player: Spotify.SpotifyPlayer;

  constructor(Spotify: SpotifySdk, token: string) {
    super();

    this.player = new Spotify.Player({
      name: SPOTIFY_PLAYER_NAME,
      getOAuthToken: cb => { cb(token); }
    });

    // Error handling
    this.player.addListener('initialization_error', ({ message }) => { console.error(message); });
    this.player.addListener('authentication_error', ({ message }) => { console.error(message); });
    this.player.addListener('account_error', ({ message }) => { console.error(message); });
    this.player.addListener('playback_error', ({ message }) => { console.error(message); });

    // Playback status updates
    this.player.addListener('player_state_changed', state => {
      const time = new Date().getTime();
      if (state)
        console.log('orig', time - state.position, time, state.position);
      this.playStateUpdated(
        (state && state.track_window.current_track) ? just<PlayStateDataOnly>({
          durationMillis: state.duration,
          state: state.paused ?
            left({timeMillis: state.position}) :
            right({effectiveStartTimeMillis: new Date().getTime() - state.position}),
          meta: this.metaFromState(state.track_window.current_track)
        }) : none()
      );
      this.updateTimestamp();
    });

    // Ready
    this.player.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
    });

    // Connect to the player!
    this.player.connect();
  }

  private metaFromState(track: Spotify.Track): PlayStateTrackMeta {
    const info = {
      artist: track.artists.map(a => a.name).join(' & '),
      title: track.name
    };
    return {info};
  }

  private updateTimestamp() {
    let count = 20;
    let min = Infinity;
    let max = -Infinity;
    const update = () => {
      this.player.getCurrentState().then(state => {
        const time = new Date().getTime();
        if (state) {
          const effectiveStartTimeMillis = time - state.position;
          min = Math.min(min, effectiveStartTimeMillis);
          max = Math.max(min, effectiveStartTimeMillis);
          console.log(effectiveStartTimeMillis, time, state.position);
        }
      });
      if (count-- > 0) {
       setTimeout(update, 100);
     } else {
       console.group('Summary');
       console.log('Min:', min);
       console.log('Max:', max);
       console.log('Diff:', max - min);
       console.groupEnd();
     }
    };
    update();
  }

  public sourceKind(): 'spotify-local' {
    return 'spotify-local';
  }

  protected disconnect() {
    this.player.disconnect();
  }

  protected controls() {
    return {
      toggle: () => {
        const playing = this.getLastState().caseOf({
          just: state => state.state.caseOf({
            left: () => false,
            right: () => true
          }),
          none: () => false
        });
        playing ? this.player.pause() : this.player.resume();
      },
      pause: () => this.player.pause(),
      goToTime: (positionMs: number) =>
        this.player.seek(Math.round(positionMs))
    };
  }
}
