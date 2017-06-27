import * as React from 'react';
import * as shared from '../shared';

import {overlays} from './util/overlays';

import SettingsEthernet = require('react-icons/lib/md/settings-ethernet');

type ConnectionState = 'not_connected' | 'connecting' | 'connected' | 'error';

interface ConnectionButtonState {
  state: ConnectionState;
  host: string;
}

const DEFAULT_HOST = 'localhost:' + shared.constants.DEFAULT_SYNESTHESIA_PORT;

export class ConnectionButton extends React.Component<{}, ConnectionButtonState> {

  private socket: WebSocket | null = null;

  public constructor() {
    super();
    this.state = {
      state: 'not_connected',
      host: DEFAULT_HOST
    };

    this.onClick = this.onClick.bind(this);
  }

  private onClick() {
    switch (this.state.state) {
      case 'not_connected':
      case 'error':
        this.connect();
        break;
      case 'connected':
        this.disconnect();
        break;
    }
  }

  private connect() {
    overlays().requestInput(
      'Enter Consumer Details',
      'Enter the host for the consumer you want to connect to',
      'Host',
      this.state.host)
      .then(host => {
        this.setState({
          host,
          state: 'connecting'
        });
        const path = shared.constants.SYNESTHESIA_WEBSOCKET_PATH;
        console.log('got string: ', host);
        const socket = this.socket = new WebSocket(`ws://${host}${path}`);
        this.socket.onerror = (err) => {
          if (socket !== this.socket) return;
          console.error(err);
          this.setState({state: 'error'});
          this.socket = null;
        };
        this.socket.onclose = () => {
          if (socket !== this.socket) return;
          this.setState({state: 'not_connected'});
          this.socket = null;
        };
        this.socket.onopen = () => {
          if (socket !== this.socket) return;
          this.setState({state: 'connected'});
        };
      })
      .catch(err => {
        console.warn(err);
        this.setState({state: 'not_connected'});
      });
  }

  private disconnect() {
    // TODO: add confirmation dialog to disconnect
    if (this.socket) {
      this.socket.close();
    }
  }

  public render() {

    const buttonTitle = (() => {
      switch (this.state.state) {
        case 'not_connected': return 'Connect to Consumer';
        case 'connecting': return 'Connecting...';
        case 'connected': return 'Connected to Consumer';
        case 'error': return 'An error ocurred';
      }
    })();

    return (
      <button className="connection-button" title={buttonTitle} onClick={this.onClick}>
        <SettingsEthernet/>
        <span className={`indicator ${this.state.state}`} />
      </button>
    );
  }
}
