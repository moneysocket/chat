// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const ChatModel = require("./model/model.js").ChatModel;
const ChatView = require("./view/view.js").ChatView;
const ChatController = require("./controller/controller.js").ChatController;

class ChatApp {
    constructor() {
        this.model = new ChatModel();
        this.view = new ChatView(this.model);
        this.controller = new ChatController(this.model, this.view);
    }

    start() {
        this.controller.start();
    }

    stop() {
        this.controller.stop();
    }
}


window.app = new ChatApp();
function drawFirstUi() {
    window.app.start()
}

function cleanUp() {
    window.app.stop()
}
window.addEventListener("load", drawFirstUi);
window.addEventListener("unload", cleanUp);
