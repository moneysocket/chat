// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php


const ChatSocket = require("./chat-socket.js").ChatSocket;

const CHATSOCKET_URL = "ws://localhost:4343"

class ChatModel {
    constructor() {
        this.chatsocket = this.setupChatSocket();
        this.consumer = this.setupConsumerStack();

        this.onchatmessage = null;
        this.onchaterror = null;
        this.onchatinvoice = null;
        this.onchatconnect = null;
        this.onchatdisconnect = null;
    }

    setupChatSocket() {
        var c = new ChatSocket(CHATSOCKET_URL);
        c.onconnect = (function() {
            this.chatSocketOnConnect();
        }).bind(this);
        c.ondisconnect = (function() {
            this.chatSocketOnDisconnect();
        }).bind(this);
        c.oninvoice = (function(bolt11) {
            this.chatSocketOnInvoice(bolt11);
        }).bind(this);
        c.onmessages = (function(messages) {
            this.chatSocketOnMessages(messages);
        }).bind(this);
        c.onmessage = (function(message) {
            console.log("model got msag");
            this.chatSocketOnMessage(message);
        }).bind(this);
        c.onerror = (function(error) {
            this.chatSocketOnError(errro);
        }).bind(this);
        return c;
    }

    setupConsumerStack() {
        /*var s = new ConsumerStack();
        s.onannounce = (function(nexus) {
            this.consumerOnAnnounce(nexus);
        }).bind(this);
        s.onrevoke = (function(nexus) {
            this.consumerOnRevoke(nexus);
        }).bind(this);
        s.onproviderinfo = (function(provider_info) {
            this.consumerOnProviderInfo(provider_info);
        }).bind(this);
        s.onstackevent = (function(layer_name, nexus, status) {
            this.consumerOnStackEvent(layer_name, nexus, status);
        }).bind(this);
        s.onping = (function(msecs) {
            this.consumerOnPing();
        }).bind(this);
        s.oninvoice = (function(bolt11, request_reference_uuid) {
            this.consumerOnInvoice(bolt11, request_reference_uuid);
        }).bind(this);
        s.onpreimage = (function(preimage, request_reference_uuid) {
            this.consumerOnPreimage(preimage, request_reference_uuid);
        }).bind(this);
        s.onerror = (function(error_msg, request_reference_uuid) {
            this.consumerOnError(error_msg, request_reference_uuid);
        }).bind(this);
        return s;
        */
        // TODO
        return null;
    }

    //////////////////////////////////////////////////////////////////////////
    // chatsocket events
    //////////////////////////////////////////////////////////////////////////

    chatSocketOnConnect() {
        console.log("connected");
    }
    chatSocketOnDisconnect() {
        // TODO try reconnect?
        console.log("disconnected");
    }
    chatSocketOnInvoice(bolt11) {
        console.log("invoice: " + bolt11);
        if (this.oninvoice != null) {
            this.oninvoice(bolt11);
        }
        // TODO forward to consumer stack to pay
    }
    chatSocketOnMessage(message) {
        console.log("message: " + message);
        if (this.onchatmessage != null) {
            this.onchatmessage(message);
        }
    }
    chatSocketOnMessages(messages) {
        console.log("messages: " + messages);
    }
    chatSocketOnError(error) {
        console.log("error: " + error);
        if (this.onerror != null) {
            this.onerror(error);
        }
    }

    //////////////////////////////////////////////////////////////////////////
    // consumer stack events
    //////////////////////////////////////////////////////////////////////////

    consumerOnAnnounce(nexus) {
        console.log("consumer announce");
    }

    consumerOnRevoke(nexus) {
        console.log("consumer revoke");
    }

    consumerOnStackEvent(layer_name, nexus, status) {
    }

    consumerOnProviderInfo(provider_info) {
    }

    consumerOnPing() {
    }

    consumerOnInvoice(bolt11, request_reference_uuid) {
    }

    consumerOnPreimage(preimage, request_reference_uuid) {
    }

    consumerOnError(error_msg, request_reference_uuid) {
    }

    //////////////////////////////////////////////////////////////////////////
    // calls in
    //////////////////////////////////////////////////////////////////////////

    sendMessage(username, message) {
        this.chatsocket.sendMessage(username, message);
    }
}


exports.ChatModel = ChatModel;
