// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php


class ChatSocket {
    constructor(chatsocket_url) {
        this.url = chatsocket_url;

        this.onconnect = null;
        this.ondisconnect = null;
        this.oninvoice = null;
        this.onmessage = null;
        this.onmessages = null;
        this.onerror = null;
        this.onservererror = null;

        this.ws = new WebSocket(this.url);
        this.ws.onmessage = (function(event) {
            this.onMessage(event);
        }).bind(this);
        this.ws.onopen = (function(event) {
            if (this.onconnect != null) {
                this.onconnect();
            }
        }).bind(this);
        this.ws.onclose = (function(event) {
            if (this.ondisconnect != null) {
                this.ondisconnect();
            }
        }).bind(this);
        this.ws.onerror = (function(event) {
            if (this.onerror != null) {
                this.onerror(event);
            }
        }).bind(this);
        console.log("connected");
    }

    onMessage(event) {
        var msg = JSON.parse(event.data);

        if (msg['type'] == "MESSAGE") {
            if (this.onmessage != null) {
                this.onmessage(msg);
            }
        }
        if (msg['type'] == "INVOICE") {
            if (this.oninvoice != null) {
                this.oninvoice(msg['bolt11']);
            }
        }
        if (msg['type'] == "ERROR") {
            if (this.onservererror != null) {
                this.onservererror(msg['error']);
            }
        }
    }

    sendMessage(username, message) {
        var msg = {'username': username,
                   'message':  message}
        this.ws.send(JSON.stringify(msg));
    }
}

exports.ChatSocket = ChatSocket;
