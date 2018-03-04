/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as ws from "ws";
import * as http from "http";
import * as https from "https";
import * as url from "url";
import * as net from "net";
import { MessageConnection } from "vscode-jsonrpc";
import { createWebSocketConnection, IWebSocket } from "vscode-ws-jsonrpc";
import { ConsoleLogger } from "./logger";

export interface IServerOptions {
    readonly server: http.Server | https.Server;
    readonly path?: string;
    matches?(request: http.IncomingMessage): boolean;
}

export function createServerWebSocketConnection(options: IServerOptions, onConnect: (connection: MessageConnection) => void): void {
    openJsonRpcSocket(options, socket => {
        const logger = new ConsoleLogger();
        const connection = createWebSocketConnection(socket, logger);
        onConnect(connection);
    });
}

export function openJsonRpcSocket(options: IServerOptions, onOpen: (socket: IWebSocket) => void): void {
    openSocket(options, socket => {
        const webSocket = toIWebSocket(socket);
        onOpen(webSocket);
    });
}

export interface OnOpen {
    (webSocket: ws, request: http.IncomingMessage, socket: net.Socket, head: Buffer): void;
}

export function openSocket(options: IServerOptions, onOpen: OnOpen): void {
    const wss = new ws.Server({
        noServer: true,
        perMessageDeflate: false
    });

    interface ExtWebSocket extends ws {
        isAlive: boolean;
    }

    wss.on('connection', (ws: ws) => {

        const extWs = ws as ExtWebSocket;
        console.log("Connection started", wss.path);
        extWs.isAlive = true;

        ws.on('pong', () => {
            console.log("pong recieved");
            extWs.isAlive = true;
        });
    });

    setInterval(() => {
        wss.clients.forEach((ws: ws) => {

            const extWs = ws as ExtWebSocket;

            ws.ping("ping");

            ws.on('pong', () => {
                console.log("pong recieved");
                extWs.isAlive = true;
                return;
            });

            if (extWs.isAlive === false) {
                console.log("%s isAlive is not true", wss.path);
                return; // ws.terminate();
            }

            extWs.isAlive = false;

        });
    }, 10000);

    options.server.on('upgrade', (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
        const pathname = request.url ? url.parse(request.url).pathname : undefined;
        if (options.path && pathname === options.path || options.matches && options.matches(request)) {
            wss.handleUpgrade(request, socket, head, webSocket => {
                if (webSocket.readyState === webSocket.OPEN) {
                    onOpen(webSocket, request, socket, head);
                } else {
                    webSocket.on('open', () => onOpen(webSocket, request, socket, head));
                }
            });
        }
    });
}

export function toIWebSocket(webSocket: ws) {
    return <IWebSocket>{
        send: content => webSocket.send(content, error => {
            if (error) {
                console.log(error);
            }
        }),
        onMessage: cb => webSocket.on('message', cb),
        onError: cb => webSocket.on('error', cb),
        onClose: cb => webSocket.on('close', cb),
        dispose: () => {
            if (webSocket.readyState < ws.CLOSING) {
                webSocket.close();
            }
        }
    };
}
