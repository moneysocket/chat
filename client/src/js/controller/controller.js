// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const MoneysocketBeacon = require('moneysocket').MoneysocketBeacon;

class ChatController {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        this.setupModel();
        this.setupView();
    }

    setupModel() {
        this.model.onchatmessage = (function(message) {
            this.view.postMessage(message['paid_timestamp'],
                                  message['username'],
                                  message['message'],
                                  message['preimage']);
        }).bind(this);
        this.model.onchaterror = (function(error) {
            this.view.postError("chat socket error");
        }).bind(this);
        this.model.onchatservererror = (function(error) {
            this.view.postError(error);
        }).bind(this);
        this.model.oninvoice = (function(bolt11) {
            this.onInvoice(bolt11);
        }).bind(this);
        this.model.onchatconnect = (function() {
            this.view.postConnected();
        }).bind(this);
        this.model.onchatdisconnect = (function() {
            this.view.postError("disconnected from server");
        }).bind(this);
        this.model.onstackevent = (function(layer_name, event) {
            console.log("event passing to view");
            this.view.postStackEvent(layer_name, event);
        }).bind(this);
        this.model.onconsumerconnect = (function() {
            this.view.postConnected();
        }).bind(this);
        this.model.onconsumerdisconnect = (function() {
            this.view.postDisconnected();
        }).bind(this);
        this.model.onbalanceupdate = (function(wad) {
            this.view.postWadBalance(wad);
        }).bind(this);
        this.model.onconsumererror = (function(error, request_reference_uuid) {
            this.view.postError(error, request_reference_uuid);
        }).bind(this);
    }

    setupView() {
        this.view.onchatinput = (function(username, chatmessage) {
            this.onUserChatInput(username, chatmessage);
        }).bind(this);
        this.view.ongenerateselect = (function() {
            this.connectNewConsumerBeacon();
        }).bind(this);
        this.view.onbeaconselect = (function(beacon) {
            this.connectConsumerBeacon(beacon);
        }).bind(this);
        this.view.ondisconnectselect = (function() {
            this.model.disconnect();
            this.view.postDisconnected();
        }).bind(this);
    }

    onInvoice(bolt11) {
        if (this.model.consumerIsConnected()) {
            console.log("consumer is connected");
            var request_uuid = this.model.payInvoice(bolt11);
            this.view.postPayInProgress(request_uuid, bolt11);
            return;
        }
        console.log("consumer not connected");
        this.view.postInvoice(bolt11);
    }

    onUserChatInput(username, chatmessage) {
        if (this.model.chatSocketIsConnected()) {
            this.model.sendMessage(username, chatmessage);
            return;
        }
        this.view.postError("not connected to server");
    }

    connectNewConsumerBeacon() {
        var beacon_str = this.model.generateNewBeacon();
        this.view.drawConnectingInterface(beacon_str);
        this.model.connectToBeacon(beacon_str);
    }

    connectConsumerBeacon(beacon_str) {
        var [beacon, err] = MoneysocketBeacon.fromBech32Str(beacon_str);
        if (err != null) {
            this.view.postError(err);
            return;
        }
        this.view.drawConnectingInterface(beacon_str);
        err = this.model.connectToBeacon(beacon_str);
        if (err != null) {
            this.view.postError(err);
        }
    }

    start() {
        this.view.start();
        // websocket connect
        // reconnect thread
    }

    stop() {
        // websocket/consumer disconnect
    }
}

exports.ChatController = ChatController;
