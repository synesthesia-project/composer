import {IntegrationSettings} from '../../../integration/shared';
import { PlayStateControls } from '../data/play-state';

import { Source } from './source';
import { timingSafeEqual } from 'crypto';

export type StateListener = (state: 'not_connected' | 'connecting' | 'connected' | 'error') => void;

export class IntegrationSource extends Source {

    private readonly settings: IntegrationSettings;

    private readonly listeners: StateListener[] = [];

    private socket: WebSocket | null;

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
    };

    public connect() {
        if (this.socket) this.socket.close();
        const socket = this.socket = new WebSocket(this.settings.websocketURL);
        for (const l of this.listeners) l('connecting');
        this.socket.addEventListener('close', () => {
            if (this.socket !== socket) return;
            for (const l of this.listeners) l('not_connected');
            this.socket = null;
        });
        this.socket.addEventListener('error', () => {
            if (this.socket !== socket) return;
            for (const l of this.listeners) l('error');
        });
        this.socket.addEventListener('open', () => {
            if (this.socket !== socket) return;
            for (const l of this.listeners) l('connected');
        });
    }

    protected controls(): PlayStateControls {
        // TODO
        return {
            toggle: () => console.debug('toggle()'),
            pause: () => console.debug('pause()'),
            goToTime: (timeMillis: number) => console.debug('goToTime(' + timeMillis + ')')
        };
    }

    public addListener(listener: StateListener) {
        if (this.socket) {
            switch(this.socket.readyState) {
                case WebSocket.CONNECTING:
                    listener('connecting');
                    break;
                case WebSocket.CLOSED:
                    listener('not_connected');
                    break;
                case WebSocket.CLOSING:
                case WebSocket.OPEN:
                    listener('connected');
                    break;
            }
        }
        this.listeners.push(listener);
    }

    public disconnect(): void {
        if (this.socket) this.socket.close();
    }
}


