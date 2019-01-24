import { CueFile } from '@synesthesia-project/core/file';
import { Endpoint } from '@synesthesia-project/core/protocols/util/endpoint';

import { IntegrationSettings, PlayStateData, ComposerRequest, Request, Response, Notification, IntegrationMessage }
    from '../../../integration/shared';
import { PlayStateControls, fromIntegrationData } from '../data/play-state';

import { Source } from './source';

export class ComposerEndpoint extends Endpoint<Request, Response, Notification> {

    private readonly playStateUpdated: (state: PlayStateData) => void;
    private readonly cueFileUpdated: (state: CueFile) => void;

    public constructor(
        sendMessage: (msg: IntegrationMessage) => void,
        playStateUpdated: (state: PlayStateData) => void,
        cueFileUpdated: (file: CueFile) => void) {
        super(sendMessage);
        this.playStateUpdated = playStateUpdated;
        this.cueFileUpdated = cueFileUpdated;
    }

    protected handleRequest(request: never): Promise<never> {
        return new Promise((resolve, reject) => {
            reject(new Error('unknown request type'));
        });
    }

    protected handleNotification(notification: Notification) {
        switch (notification.type) {
            case 'state':
                this.playStateUpdated(notification.data);
                return;
            case 'cue-file-modified':
                this.cueFileUpdated(notification.file);
                return;
        }
        console.error('unknown notification:', notification);
    }

    protected handleClosed() {
        console.log('connection closed');
    }

    public request(request: Request) {
        return this.sendRequest(request);
    }

}

export type StateListener = (state: 'not_connected' | 'connecting' | 'connected' | 'error') => void;

export type CueFileListener = (file: CueFile) => void;

export class IntegrationSource extends Source {

    private readonly settings: IntegrationSettings;

    private readonly stateListeners: StateListener[] = [];
    private readonly cueFileListeners: CueFileListener[] = [];

    private connection: {
        socket: WebSocket;
        endpoint: ComposerEndpoint;
    } | null = null;

    public constructor(settings: IntegrationSettings) {
        super();
        this.settings = settings;
        this.connect();
    }

    public getSettings() {
        return this.settings;
    }

    public sourceKind(): 'integration' {
        return 'integration';
    }

    public connect() {
        if (this.connection) this.connection.socket.close();
        const socket = new WebSocket(this.settings.websocketURL);
        const endpoint = new ComposerEndpoint(
            msg => socket.send(JSON.stringify(msg)),
            playState => (this.playStateUpdated(fromIntegrationData(playState))),
            cueFile => this.cueFileListeners.forEach(l => l(cueFile))
        );
        const connection = this.connection = {socket, endpoint};
        for (const l of this.stateListeners) l('connecting');
        socket.addEventListener('message', msg => {
            endpoint.recvMessage(JSON.parse(msg.data));
        });
        socket.addEventListener('close', () => {
            if (this.connection !== connection) return;
            for (const l of this.stateListeners) l('not_connected');
            endpoint.closed();
            this.connection = null;
        });
        socket.addEventListener('error', () => {
            if (this.connection !== connection) return;
            for (const l of this.stateListeners) l('error');
            endpoint.closed();
            this.connection = null;
        });
        socket.addEventListener('open', () => {
            if (this.connection !== connection) return;
            for (const l of this.stateListeners) l('connected');
        });
    }

    protected controls(): PlayStateControls {
        // TODO: notify the user when a request has failed
        return {
            toggle: () => this.sendRequest({request: 'toggle'}),
            pause: () => this.sendRequest({request: 'pause'}),
            goToTime: (positionMillis: number) => this.sendRequest({request: 'go-to-time', positionMillis}),
        };
    }

    private sendRequest(request: Request) {
        if (this.connection)
            this.connection.endpoint.request(request);
    }

    public addListener(event: 'state', listener: StateListener): void;
    public addListener(event: 'new-cue-file', listener: CueFileListener): void;


    public addListener(event: 'state' | 'new-cue-file', listener: StateListener | CueFileListener) {
        if (event === 'state') {
            const l = listener as StateListener;
            if (this.connection) {
                switch (this.connection.socket.readyState) {
                    case WebSocket.CONNECTING:
                        l('connecting');
                        break;
                    case WebSocket.CLOSED:
                        l('not_connected');
                        break;
                    case WebSocket.CLOSING:
                    case WebSocket.OPEN:
                        l('connected');
                        break;
                }
            }
            this.stateListeners.push(l);
        } else if (event === 'new-cue-file') {
            this.cueFileListeners.push(listener as CueFileListener);
        }
    }

    public disconnect(): void {
        if (this.connection) this.connection.socket.close();
    }

    public sendCueFile(id: string, cueFile: CueFile | null) {
        // TODO: send blank cue files
        if (this.connection && cueFile)
            this.connection.endpoint.sendNotification({id, type: 'cue-file-modified', file: cueFile});
    }
}


