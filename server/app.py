# Copyright (c) 2021 Moneysocket Developers
# Distributed under the MIT software license, see the accompanying
# file LICENSE or http://www.opensource.org/licenses/mit-license.php
import time
import sys
import json

from twisted.internet import reactor
from twisted.internet.task import LoopingCall

from autobahn.twisted.websocket import WebSocketServerProtocol
from autobahn.twisted.websocket import WebSocketServerFactory

from txzmq import ZmqEndpoint, ZmqEndpointType
from txzmq import ZmqFactory
from txzmq import ZmqSubConnection

from server.chat_db import ChatDb


UNPAID_PRUNE_CHECK = 60
UNPAID_PRUNE_SECONDS = 120

###############################################################################

class AppClient(WebSocketServerProtocol):
    def onConnect(self, request):
        print("Client connecting: {0}".format(request.peer))

    def onOpen(self):
        print("WebSocket client connection open.")
        self.server.clients.append(self)
        for m in self.server.app.chat_db.chat_messages():
            self.sendMessage(m.encode('utf8'), isBinary=False)

    def onMessage(self, payload, isBinary):
        print("message: %s" % payload)
        self.server.app.chat_db.add_chat_message("tbd", "tbd", "tbd", "tbd",
                                                 "tbd", "tbd",
                                                 payload.decode('utf8'))
        self.server.echo_to_clients(payload)

    def onClose(self, wasClean, code, reason):
        print("WebSocket connection closed: {0}".format(reason))

###############################################################################

class AppServer(WebSocketServerFactory):
    def __init__(self, config, app):
        self.config = config
        host = config['Server']['BindHost']
        port = int(config['Server']['BindPort'])
        # TODO - tls
        ws_url = u"ws://%s:%d" % (host, port)
        super().__init__()
        self.setProtocolOptions(openHandshakeTimeout=15, autoPingInterval=30,
                                autoPingTimeout=5)

        self.protocol = AppClient
        self.protocol.server = self
        self.clients = []
        print("listening on websocket %s" % ws_url)
        reactor.listenTCP(port, self)
        self.app = app

    def echo_to_clients(self, message):
        #encoded = {'message':   message}
        #encoded = json.dumps(encoded)
        #print("echoing to clients: %s" % encoded)
        #for c in self.clients:
        #    c.sendMessage(encoded.encode("utf8"))
        for c in self.clients:
            c.sendMessage(message)

###############################################################################

class ChatApp(object):
    def __init__(self, config):
        self.config = config
        self.chat_db_file = config['Db']['ChatDbFile']
        self.unpaid_htlcs = {}
        #self.prune_loop = LoopingCall(self.prune_unpaid)
        #self.prune_loop.start(interval=UNPAID_PRUNE_CHECK, now=False)

    ###########################################################################

    def setup_chat_db(self):
        self.chat_db = ChatDb(self.chat_db_file)

    ###########################################################################

    def setup_websocket(self):
        self.ws_server = AppServer(self.config, self)

    ###########################################################################

    def prune_unpaid(self):
        now = time.time()
        new = {k: v for k, v in self.unpaid_htlcs.items() if
               (now - v['recv_time']) < UNPAID_PRUNE_SECONDS}
        self.unpaid_htlcs = new

    ###########################################################################

    def run(self):
        self.setup_websocket()
        self.setup_chat_db()

    def stop(self):
        #self.chat_db.unmap_chat_bin()
        pass
