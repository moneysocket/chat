// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const Uuid = require("moneysocket").Uuid;
const Bolt11 = require("moneysocket").Bolt11;
const MoneysocketBeacon = require('moneysocket').MoneysocketBeacon;
const WebsocketLocation = require('moneysocket').WebsocketLocation;
const ConsumerStack = require('moneysocket').ConsumerStack;

const ChatSocket = require("./chat-socket.js").ChatSocket;

const CHATSOCKET_URL = "ws://localhost:4343"

const DEFAULT_HOST = "relay.socket.money";
const DEFAULT_PORT = 443;
const DEFAULT_USE_TLS = true;

const CONNECT_STATE = {
    DISCONNECTED: 'DISCONNECTED',
    CONNECTING:   'CONNECTING',
    CONNECTED:    'CONNECTED',
}

class ChatModel {
    constructor() {
        this.chatsocket = this.setupChatSocket();
        this.consumer_state = CONNECT_STATE.DISCONNECTED;
        this.consumer = this.setupConsumerStack();

        this.chat_state = CONNECT_STATE.DISCONNECTED;

        this.provider_info = null;

        this.onchatmessage = null;
        this.onchaterror = null;
        this.onchatservererror = null;
        this.onchatinvoice = null;
        this.onchatconnect = null;
        this.onchatdisconnect = null;
        this.onstackevent = null;
        this.onconsumerdisconnect = null;
        this.onconsumerconnect = null;
        this.onbalanceupdate = null;
        this.onconsumererror = null;

        this.pay_requests = {};
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
            this.chatSocketOnMessage(message);
        }).bind(this);
        c.onerror = (function(error) {
            this.chatSocketOnError(error);
        }).bind(this);
        c.onservererror = (function(error) {
            this.chatSocketOnServerError(error);
        }).bind(this);
        return c;
    }

    setupConsumerStack() {
        var s = new ConsumerStack();
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
    }

    //////////////////////////////////////////////////////////////////////////
    // chatsocket events
    //////////////////////////////////////////////////////////////////////////

    chatSocketOnConnect() {
        console.log("chat socket connected");
        this.chat_state = CONNECT_STATE.CONNECTED;
    }

    chatSocketOnDisconnect() {
        // TODO try reconnect?
        console.log("chat socket disconnected");
        this.chat_state = CONNECT_STATE.DISCONNECTED;
        if (this.onchatdisconnect != null) {
            this.onchatdisconnect();
        }
    }

    chatSocketOnInvoice(bolt11) {
        console.log("invoice: " + bolt11);
        if (this.oninvoice != null) {
            this.oninvoice(bolt11);
        }
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
        if (this.onchaterror != null) {
            this.onchaterror(error);
        }
    }

    chatSocketOnServerError(error) {
        console.log("server error: " + error);
        if (this.onchatservererror != null) {
            this.onchatservererror(error);
        }
    }

    //////////////////////////////////////////////////////////////////////////
    // consumer stack events
    //////////////////////////////////////////////////////////////////////////

    consumerOnAnnounce(nexus) {
        console.log("consumer announce");
        this.consumer_state = CONNECT_STATE.CONNECTED;
        if (this.onconsumerconnect != null) {
            this.onconsumerconnect();
        }
    }

    consumerOnRevoke(nexus) {
        console.log("consumer revoke");
        this.consumer_state = CONNECT_STATE.DISCONNECTED;
        if (this.onconsumerdisconnect != null) {
            this.onconsumerdisconnect();
        }
    }

    consumerOnStackEvent(layer_name, nexus, status) {
        if (this.onstackevent != null) {
            this.onstackevent(layer_name, status);
        }
    }

    consumerOnProviderInfo(provider_info) {
        console.log("provider info " + provider_info);
        if (this.onbalanceupdate != null) {
            this.onbalanceupdate(provider_info['wad']);
        }
    }

    consumerOnPing() {
        console.log("ping");
    }

    consumerOnInvoice(bolt11, request_reference_uuid) {
        console.log("invoice?: " + invoice);
    }

    consumerOnPreimage(preimage, request_reference_uuid) {
        var payment_hash = Bolt11.preimageToPaymentHash(preimage);
        if (payment_hash in this.pay_requests) {
            var request = this.pay_requests[payment_hash];
            delete this.pay_requests[payment_hash];
            console.log("invoice is paid: " + request['bolt11']);
        } else {
            console.log("got unknown preimage: " + preimage);
        }
    }

    consumerOnError(error_msg, request_reference_uuid) {
        console.log("error");
    }

    //////////////////////////////////////////////////////////////////////////
    // message calls in
    //////////////////////////////////////////////////////////////////////////

    sendMessage(username, message) {
        this.chatsocket.sendMessage(username, message);
    }

    chatSocketIsConnected() {
        return this.chat_state == CONNECT_STATE.CONNECTED;
    }

    //////////////////////////////////////////////////////////////////////////
    // consumer calls in
    //////////////////////////////////////////////////////////////////////////

    payInvoice(bolt11) {
        var request_uuid = Uuid.uuidv4();
        this.consumer.requestPay(bolt11, request_uuid);

        var payment_hash = Bolt11.getPaymentHash(bolt11);
        this.pay_requests[payment_hash] = {'request_uuid': request_uuid,
                                           'bolt11':       bolt11};
    }

    consumerIsConnected() {
        return this.consumer_state == CONNECT_STATE.CONNECTED;
    }

    generateNewBeacon() {
        var location = new WebsocketLocation(DEFAULT_HOST, DEFAULT_PORT,
                                             DEFAULT_USE_TLS);
        var beacon = new MoneysocketBeacon();
        beacon.addLocation(location);
        var beacon_str = beacon.toBech32Str();
        return beacon_str;
    }

    connectToBeacon(beacon_str) {
        console.log("connect wallet: " + beacon_str);
        var [beacon, err] = MoneysocketBeacon.fromBech32Str(beacon_str);
        if (err != null) {
            console.log("could not interpret: " + beacon_str + " : " + err);
        }
        this.consumer_state = CONNECT_STATE.CONNECTING;
        this.consumer.doConnect(beacon);
    }

    disconnect() {
        this.consumer.doDisconnect();
    }
}


exports.ChatModel = ChatModel;
