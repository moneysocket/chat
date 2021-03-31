// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const Kjua = require('kjua');
const D = require("./dom.js").DomUtl;
const ConnectProgress = require("./connect-progress.js").ConnectProgress;
const Copy = require('clipboard-copy');

class ChatView {
    constructor(model) {
        this.model = model;

        this.input_div = null;
        this.paste_input_div = null;
        this.copy_span = null;
        this.wad_div = null;

        var d = document.createElement("div");
        D.setClass(d, "flex justify-center font-black text-2xl text-gray-300");
        this.connect_progress = new ConnectProgress(d);

        this.displayed_beacon = null;

        this.onchatinput = null;
        this.onbeaconselect = null;
        this.ongenerateselect = null;
        this.ondisconnectselect = null;
    }

    ///////////////////////////////////////////////////////////////////////////
    // utilities
    ////////////////////////////////////////////////////////////////////////////

    drawButton(div, button_text, click_func, button_type) {
        var b = D.button(div, click_func, button_type);
        var flex = D.emptyDiv(b, "flex items-center justify-around");
        var text = D.textSpan(flex, button_text);
        b.inner_text_span = text;
        return b;
    }

    ///////////////////////////////////////////////////////////////////////////
    // wallet connect calls
    ////////////////////////////////////////////////////////////////////////////

    pasteResult() {
        var paste_string = this.paste_input_div.value;
        console.log("paste: " + paste_string);
        if (this.onbeaconselect != null) {
            this.onbeaconselect(paste_string.toLowerCase());
        }
    }

    doGenerate() {
        console.log("generate.");
        if (this.ongenerateselect != null) {
            this.ongenerateselect();
        }
    }

    doCopy() {
        Copy(this.displayed_beacon);
        console.log("copied: " + this.displayed_beacon);
        this.copy_span.innerHTML = "Copied!";
    }


    ///////////////////////////////////////////////////////////////////////////
    // wallet connect interface
    ////////////////////////////////////////////////////////////////////////////

    drawPasteButton(div, paste_func) {
       this.drawButton(div, "Use", paste_func,
                       "px-2 py-2 border border-gray-800 rounded");
    }

    drawGenerateButton(div, generate_func) {
       this.drawButton(div, "Generate New Beacon", generate_func,
                            "px-2 py-2 border border-gray-800 rounded");
    }

    drawDisconnected(div) {
        var flex = D.emptyDiv(div, "flex items-center justify-around");
        D.textParagraph(flex, "Wallet Disconnected",
                        "font-black text-red-600 py-5");
    }

    drawConnectInterface() {
        var div = document.getElementById("connect-interface");
        D.deleteChildren(div);

        var flex = D.emptyDiv(div,
            "flex flex-col section-background justify-center");

        this.drawDisconnected(flex);
        var paste = D.emptyDiv(flex,
                               "flex justify-center items-center " +
                               "border border-gray-800 py-2 m-2 rounded-2xl");
        this.paste_input_div = D.emptyInput(paste, "w-auto rounded");
        this.paste_input_div.setAttribute("placeholder", "Paste Beacon Here");
        this.drawPasteButton(paste,
                             (function() {this.pasteResult()}).bind(this));
        var buttons = D.emptyDiv(flex, "flex justify-around py-4");
        this.drawGenerateButton(buttons,
                             (function() {this.doGenerate()}).bind(this));

    }

    ///////////////////////////////////////////////////////////////////////////
    // connect in progress interface
    ////////////////////////////////////////////////////////////////////////////

    drawDisconnectButton(div, disconnect_func) {
        this.drawButton(div, "Disconnect", disconnect_func,
                        "px-2 py-2 border border-gray-800 rounded");
    }

    drawCopyBeaconButton(div, copy_func) {
        var b = this.drawButton(div, "Copy", copy_func,
                                "px-2 py-2 border border-gray-800 rounded");
        this.copy_span = b.inner_text_span;
    }

    doDisconnect() {
        if (this.ondisconnectselect != null) {
            this.ondisconnectselect();
        }
    }

    drawQr(div, beacon) {
        this.displayed_beacon = beacon;
        beacon = beacon.toUpperCase();

        var qr = Kjua({
            ecLevel:   "M",
            render:    "canvas",
            size:      360,
            text:      beacon,
            label:     "connect wallet",
            mode:      "label",
            mSize:     6,
            fontname:  "sans",
            fontcolor: "#3B5323",
            quiet:     0,
        });
        var b = D.emptyDiv(div, "border-8 border-white");
        b.onclick = (function() {this.doCopy()}).bind(this);
        b.appendChild(qr);
    }

    drawConnectingInterface(beacon) {
        var div = document.getElementById("connect-interface");
        D.deleteChildren(div);


        var flex = D.emptyDiv(div,
                              "flex flex-col section-background");
        var q = D.emptyDiv(flex, "flex justify-center");
        this.drawQr(q, beacon);

        var p = D.emptyDiv(flex, "py-4");
        p.appendChild(this.connect_progress.parent_div);
        this.connect_progress.draw("DISCONNECTED");

        var buttons = D.emptyDiv(flex, "flex justify-around py-4");
        this.drawDisconnectButton(buttons,
                             (function() {this.doDisconnect()}).bind(this));
        this.drawCopyBeaconButton(buttons,
                            (function() {this.doCopy()}).bind(this));

    }

    ///////////////////////////////////////////////////////////////////////////
    // connected
    ///////////////////////////////////////////////////////////////////////////

    drawConnectedInterface() {
        var div = document.getElementById("connect-interface");
        D.deleteChildren(div);
        var flex = D.emptyDiv(div, "flex flex-col");
        D.textParagraph(flex, "Wallet Connected", "text-green");
        this.wad_div = D.emptyDiv(flex, "");
        var buttons = D.emptyDiv(flex, "flex justify-around py-4");
        this.drawDisconnectButton(buttons,
            (function() {this.doDisconnect()}).bind(this));
    }

    ///////////////////////////////////////////////////////////////////////////
    // stack lifecycle
    ///////////////////////////////////////////////////////////////////////////

    postConnected() {
        this.drawConnectedInterface();
    }

    postDisconnected() {
        this.wad_div = null;
        this.drawConnectInterface();
    }

    postStackEvent(layer_name, event) {
        this.connect_progress.drawStackEvent(layer_name, event);
    }

    ///////////////////////////////////////////////////////////////////////////
    // chat interface
    ///////////////////////////////////////////////////////////////////////////

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

        this.input_div = D.emptyInput(i,
                                      "w-auto rounded border border-gray-800");

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

    postError(err) {
        var m = document.getElementById("messages");
        D.textParagraph(m, err, "text-red");
    }

    postWadBalance(wad) {
        if (this.wad_div == null) {
            return;
        }
        D.deleteChildren(this.wad_div);
        D.textParagraph(this.wad_div, wad.toString(), "font-bold");
    }

    ///////////////////////////////////////////////////////////////////////////
    // draw
    ///////////////////////////////////////////////////////////////////////////

    start() {
        this.drawChatInput();
        this.drawConnectInterface();
    }
}


exports.ChatView = ChatView;
