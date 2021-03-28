// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php


class ChatSocket {
    constructor(chatsocket_url) {
        this.url = chatsocket_url;

        this.onconnect = null;
        this.ondisconnect = null;
        this.onchatinvoice = null;
        this.onmessage = null;
        this.onmessages = null;
        this.onerror = null;

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
        this.ws.onerror = (function(error) {
            if (this.onerror != null) {
                this.onerror(error);
            }
        }).bind(this);
        console.log("connected");
    }

    onMessage(event) {
        var msg = event.data;
        console.log("got msg off wire: " + msg);
        if (this.onmessage != null) {
            this.onmessage(msg);
        }
    }

    sendMessage(username, message) {
        var msg = {'username': username,
                   'message':  message}
        this.ws.send(JSON.stringify(msg));
    }
}

exports.ChatSocket = ChatSocket;
