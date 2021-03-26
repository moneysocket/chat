// Copyright (c) 2021 Moneysocket Developers
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const D = require("./dom.js").DomUtl;


console.log("abcedf");


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


window.addEventListener("load", start());
