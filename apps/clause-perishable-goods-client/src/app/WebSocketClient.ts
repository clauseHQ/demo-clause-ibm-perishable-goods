// MIT License:
//
// Copyright (c) 2010-2012, Joe Walnes
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * This behaves like a WebSocket in every way, except if it fails to connect,
 * or it gets disconnected, it will repeatedly poll until it succesfully connects
 * again.
 *
 * It is API compatible, so when you have:
 *   ws = new WebSocket('ws://....');
 * you can replace with:
 *   ws = new ReconnectingWebSocket('ws://....');
 *
 * The event stream will typically look like:
 *  onconnecting
 *  onopen
 *  onmessage
 *  onmessage
 *  onclose // lost connection
 *  onconnecting
 *  onopen  // sometime later...
 *  onmessage
 *  onmessage
 *  etc...
 *
 * It is API compatible with the standard WebSocket API.
 *
 * Latest version: https://github.com/joewalnes/reconnecting-websocket/
 * - Joe Walnes
 *
 * Latest TypeScript version: https://github.com/daviddoran/typescript-reconnecting-websocket/
 * - David Doran
 */
export class ReconnectingWebSocket {
    /**
     * Setting this to true is the equivalent of setting all instances of ReconnectingWebSocket.debug to true.
     */
    public static debugAll = false;

    // These can be altered by calling code
    public debug = false;

    // Time to wait before attempting reconnect (after close)
    public reconnectInterval = 1000;
    // Time to wait for WebSocket to open (before aborting and retrying)
    public timeoutInterval = 2000;

    // Should only be used to read WebSocket readyState
    public readyState: number;

    // Whether WebSocket was forced to close by this client
    private forcedClose = false;
    // Whether WebSocket opening timed out
    private timedOut = false;

    // List of WebSocket sub-protocols
    private protocols: string[] = [];

    // The underlying WebSocket
    private ws: WebSocket;
    private url: string;

    // Set up the default 'noop' event handlers
    public onopen: (ev: Event) => void = function (event: Event) {};
    public onclose: (ev: CloseEvent) => void = function (event: CloseEvent) {};
    public onconnecting: () => void = function () {};
    public onmessage: (ev: MessageEvent) => void = function (event: MessageEvent) {};
    public onerror: (ev: ErrorEvent) => void = function (event: ErrorEvent) {};

    constructor(url: string, protocols: string[] = []) {
        this.url = url;
        this.protocols = protocols;
        this.readyState = WebSocket.CONNECTING;
        this.connect(false);
    }

    public connect(reconnectAttempt: boolean) {
        this.ws = new WebSocket(this.url, this.protocols);

        this.onconnecting();
        console.log('ReconnectingWebSocket', 'attempt-connect', this.url);

        const localWs = this.ws;
        const timeout = setTimeout(() => {
            console.log('ReconnectingWebSocket', 'connection-timeout', this.url);
            this.timedOut = true;
            localWs.close();
            this.timedOut = false;
        }, this.timeoutInterval);

        this.ws.onopen = (event: Event) => {
            clearTimeout(timeout);
            console.log('ReconnectingWebSocket', 'onopen', this.url);
            this.readyState = WebSocket.OPEN;
            reconnectAttempt = false;
            this.onopen(event);
        };

        this.ws.onclose = (event: CloseEvent) => {
            clearTimeout(timeout);
            this.ws = null;
            if (this.forcedClose) {
                this.readyState = WebSocket.CLOSED;
                this.onclose(event);
            } else {
                this.readyState = WebSocket.CONNECTING;
                this.onconnecting();
                if (!reconnectAttempt && !this.timedOut) {
                    console.log('ReconnectingWebSocket', 'onclose', this.url);
                    this.onclose(event);
                }
                setTimeout(() => {
                    this.connect(true);
                }, this.reconnectInterval);
            }
        };
        this.ws.onmessage = (event) => {
            console.log('ReconnectingWebSocket', 'onmessage', this.url, event.data);
            this.onmessage(event);
        };
        this.ws.onerror = (event: ErrorEvent) => {
            console.log('ReconnectingWebSocket', 'onerror', this.url, event);
            this.onerror(event);
        };
    }

    public send(data: any) {
        if (this.ws) {
            console.log('ReconnectingWebSocket', 'send', this.url, data);
            return this.ws.send(data);
        } else {
            throw new Error('INVALID_STATE_ERR : Pausing to reconnect websocket');
        }
    }

    /**
     * Returns boolean, whether websocket was FORCEFULLY closed.
     */
    public close(): boolean {
        if (this.ws) {
            this.forcedClose = true;
            this.ws.close();
            return true;
        }
        return false;
    }

    /**
     * Additional public API method to refresh the connection if still open (close, re-open).
     * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
     *
     * Returns boolean, whether websocket was closed.
     */
    public refresh(): boolean {
        if (this.ws) {
            this.ws.close();
            return true;
        }
        return false;
    }

    private log(...args: any[]) {
        if (this.debug || ReconnectingWebSocket.debugAll) {
            console.debug.apply(console, args);
        }
    }
}
