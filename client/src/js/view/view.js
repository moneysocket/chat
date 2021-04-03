// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const Crypto = require('crypto');
const Kjua = require('kjua');
const D = require("./dom.js").DomUtl;
const Bolt11 = require("moneysocket").Bolt11;
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
        console.log("DISCONNECT");
        this.wad_div = null;
        this.drawConnectInterface();
    }

    postStackEvent(layer_name, event) {
        this.connect_progress.drawStackEvent(layer_name, event);
    }

    ///////////////////////////////////////////////////////////////////////////
    // chat interface
    ///////////////////////////////////////////////////////////////////////////

    pad2(str) {
        return ("00" + str).slice(-2);
    }

    timestampString(time) {
        var d = new Date(Math.round(time * 1000));
        var s = this.pad2(d.getDate()) +
                "/" + this.pad2(d.getMonth()+1) +
                "/" + d.getFullYear() +
                " " + this.pad2(d.getHours()) +
                ":" + this.pad2(d.getMinutes()) +
                ":" + this.pad2(d.getSeconds());
        return s;
    }


    drawChatInput() {
        var input = document.getElementById("chat-input");
        var flex = D.emptyDiv(input, "flex flex-nowrap justify-start");

        var i = D.emptyDiv(flex, "border border-black break-all");

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

    postWadBalance(wad) {
        if (this.wad_div == null) {
            return;
        }
        D.deleteChildren(this.wad_div);
        D.textParagraph(this.wad_div, wad.toString(), "font-bold");
    }

    ///////////////////////////////////////////////////////////////////////////
    // draw events to chat log
    ///////////////////////////////////////////////////////////////////////////

    unpack(str) {
        var bytes = [];
        for(var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            bytes.push(char >>> 8);
            bytes.push(char & 0xFF);
        }
        return bytes;
    }

    sha256(input_bytes) {
        const hash = Crypto.createHash('sha256');
        hash.update(input_bytes);
        return hash.digest();
    }

    usernameMap(username) {
        var hash = this.sha256(this.unpack(username));
        var v1 = hash[0] / 256.0;
        var v2 = hash[1] / 256.0;
        var v3 = hash[2] / 256.0;
        return [v1, v2, v3];
    }

    usernameColor(username) {
        var [v1, v2, v3] = this.usernameMap(username);
        return 'rgb(' + (Math.floor((256-100)*v1) + 101) + ',' +
                        (Math.floor((256-100)*v2) + 101) + ',' +
                        (Math.floor((256-100)*v3) + 101) + ')'
    }

    postMessage(timestamp, username, message, preimage) {
        var m = document.getElementById("messages");

        var our_username = "Anonymous";
        var justify = (username == our_username) ? "justify-end" :
                                                   "justify-start";
        var bg_color = (username == our_username) ? "bg-gray-600" :
                                                    "bg-gray-800";
        var obg = D.emptyDiv(m, "flex " + justify + " py-1 px-2");
        var bg = D.emptyDiv(obg,
            "shadow-lg rounded-2xl " + bg_color + " w-5/6 py-2");
        var flex = D.emptyDiv(bg, "flex flex-col")

        var t = this.timestampString(timestamp);
        var un = D.textParagraph(flex, username, "pl-4 text-l font-bold");
        un.setAttribute("style", "color:" + this.usernameColor(username));

        D.textParagraph(flex, message, "pl-4 text-white");

        var right = D.emptyDiv(flex, "flex justify-end");
        D.textParagraph(right, t, "pr-4 text-sm text-white");

        if (preimage == null) {
            return;
        }
        var payment_hash = Bolt11.preimageToPaymentHash(preimage);
        var d = document.getElementById(payment_hash);
        if (d == null) {
            return;
        }
        D.deleteChildren(d);
    }

    drawBolt11Qr(div, bolt11) {
        bolt11 = bolt11.toUpperCase();

        var qr = Kjua({
            ecLevel:   "M",
            render:    "canvas",
            size:      220,
            text:      bolt11,
            mSize:     6,
            fontname:  "sans",
            fontcolor: "#3B5323",
            quiet:     0,
        });
        var b = D.emptyDiv(div, "py-2");
        var c = D.emptyDiv(b, "border-8 border-white");
        c.appendChild(qr);
    }

    postInvoice(bolt11) {
        var payment_hash = Bolt11.getPaymentHash(bolt11);
        var m = document.getElementById("messages");

        var bg = D.emptyDiv(m, "rounded-2xl bg-green-500 w-5/6");
        bg.setAttribute("id", payment_hash);
        var flex = D.emptyDiv(bg, "flex flex-col")
        var un = D.textParagraph(flex, "(only visible to you)",
                                 "pl-4 text-l font-bold");
        var frow = D.emptyDiv(bg, "flex justify-around")
        var t = D.emptyDiv(frow, "flex flex-col w-60");
        D.textParagraph(t, "It would be better if you had a Moneysocket wallet connected. You can pay manually, if you want, though:", "text-center");
        D.textParagraph(t, bolt11, "text-xs text-white break-words");
        this.drawBolt11Qr(frow, bolt11);
    }

    postError(err_msg) {
        var m = document.getElementById("messages");
        D.textParagraph(m, err_msg, "text-red-500");
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
