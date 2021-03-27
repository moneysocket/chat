// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const D = require("./dom.js").DomUtl;


console.log("abcedf");

/*

const WEBSOCKET = "ws://localhost:4343"

var ChatSocket = null;

var input_div = null;

function timestampString() {
    var time = (new Date()).getTime() / 1000;
    var d = new Date(Math.round(time * 1000));
    var s = d.getDate()+
            "/"+(d.getMonth()+1)+
            "/"+ d.getFullYear()+
            " "+ d.getHours()+
            ":"+ d.getMinutes()+
            ":"+ d.getSeconds();
    return s;
}



function onMessage(event) {
    console.log(event.data);
    var t = timestampString();
    var m = document.getElementById("messages");

    var s = t + "> " + event.data;

    D.textParagraph(m, s);
}

function sendMessage() {
    var msg = input_div.value;
    if (msg == "") {
        console.log("no message");
        return;
    }
    console.log("message: " + msg);
    input_div.value = "";

    ChatSocket.send(msg);
}

function ConnectUponLoad() {
    console.log("connecting");
    // create websocket instance
    ChatSocket = new WebSocket(WEBSOCKET);
    // add event listener reacting when message is received
    ChatSocket.onmessage = onMessage
    console.log("connected");
}





function drawChatInput() {
    var input = document.getElementById("chat-input");
    var flex = D.emptyDiv(input, "flex flex-nowrap justify-start");

    var i = D.emptyDiv(flex, "border border-black");

    input_div = D.emptyInput(i, "input-area");

    input_div.addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
            sendMessage();
        }
    });

    var b = D.button(i, sendMessage,
                     "border border-black rounded px-2 py-2 bg-blue");
    var flex = D.emptyDiv(b, "flex items-center justify-around");
    var text = D.textSpan(flex, "send", "");
}


function start() {
    ConnectUponLoad();
    drawChatInput();
    input_div.focus();
}

*/


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

    sendMessage(msg) {
        this.ws.send(msg);
    }
}

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
        c.oninvoice = (function(invoice) {
            this.chatSocketOnInvoice(invoice);
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
    chatSocketOnInvoice(invoice) {
        console.log("invoice: " + invoice);
        if (this.onchatinvoice != null) {
            this.onchatinvoice(invoice);
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
        this.chatsocket.sendMessage(message);
    }
}

class ChatView {
    constructor(model) {
        this.model = model;

        this.input_div = null;

        this.onchatinput = null;
        this.onbeaconrequest = null;
    }


    timestampString() {
        var time = (new Date()).getTime() / 1000;
        var d = new Date(Math.round(time * 1000));
        var s = d.getDate()+
                "/"+(d.getMonth()+1)+
                "/"+ d.getFullYear()+
                " "+ d.getHours()+
                ":"+ d.getMinutes()+
                ":"+ d.getSeconds();
        return s;
    }


    drawChatInput() {
        var input = document.getElementById("chat-input");
        var flex = D.emptyDiv(input, "flex flex-nowrap justify-start");

        var i = D.emptyDiv(flex, "border border-black");

        this.input_div = D.emptyInput(i, "input-area");

        this.input_div.addEventListener("keyup", (function(event) {
            if (event.keyCode === 13) {
                this.sendMessage();
            }
        }).bind(this));

        var b = D.button(i, (function() {
                this.sendMessage();
            }).bind(this),
            "border border-black rounded px-2 py-2 bg-blue");
        var flex = D.emptyDiv(b, "flex items-center justify-around");
        var text = D.textSpan(flex, "send", "");
    }


    sendMessage() {
        var msg = this.input_div.value;
        if (msg == "") {
            console.log("no message");
            return;
        }
        console.log("smessage: " + msg);
        this.input_div.value = "";

        if (this.onchatinput != null) {
            this.onchatinput("Anonymous", msg);
        }
    }

    drawBeaconConnect() {
        // TODO
    }

    drawMessage(username, message) {
        var t = this.timestampString();
        var m = document.getElementById("messages");

        var s = t + " " + username + " > " + message;
        D.textParagraph(m, s);
    }

    start() {
        this.drawChatInput();
        this.drawBeaconConnect();
    }
}

class ChatController {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        this.setupModel();
        this.setupView();
    }

    setupModel() {
        this.model.onchatmessage = (function(message) {
            this.view.drawMessage("Anonymous", message);
        }).bind(this);
        this.model.onchaterror = (function(error) {
            // TODO
        }).bind(this);
        this.model.onchatinvoice = (function() {
            // TODO
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
