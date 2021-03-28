// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php


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
    }

    setupView() {
        this.view.onchatinput = (function(username, chatmessage) {
            this.onUserChatInput(username, chatmessage);
        }).bind(this);
        this.view.onbeaconrequest = (function() {
            this.genConsumerBeacon();
        }).bind(this);
    }

    onUserChatInput(username, chatmessage) {
        // TODO - send to server for invoice
        this.model.sendMessage(username, chatmessage);
    }

    genConsumerBeacon() {
        // TODO - connect with stack and provide to user
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
