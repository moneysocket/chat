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
            this.view.drawMessage(message['paid_timestamp'],
                                  message['username'],
                                  message['message']);
        }).bind(this);
        this.model.onchaterror = (function(error) {
            // TODO
        }).bind(this);
        this.model.oninvoice = (function(bolt11) {
            this.view.drawInvoice(bolt11);
        }).bind(this);
        this.model.onchatconnect = (function() {
            // TODO
        }).bind(this);
        this.model.onchatdisconnect = (function() {
            // TODO
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
        }).bind(this);
    }

    onUserChatInput(username, chatmessage) {
        this.model.sendMessage(username, chatmessage);
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
