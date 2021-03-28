// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const D = require("./dom.js").DomUtl;

class ChatView {
    constructor(model) {
        this.model = model;

        this.input_div = null;

        this.onchatinput = null;
        this.onbeaconrequest = null;
    }


    timestampString(time) {
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

    drawMessage(timestamp, username, message) {
        var t = this.timestampString(timestamp);
        var m = document.getElementById("messages");
        var s = t + " " + username + " > " + message;
        D.textParagraph(m, s);
    }

    drawInvoice(bolt11) {
        var m = document.getElementById("messages");
        D.textParagraph(m, bolt11);
    }

    start() {
        this.drawChatInput();
        this.drawBeaconConnect();
    }
}


exports.ChatView = ChatView;
