# Copyright (c) 2021 Moneysocket Developers
# Distributed under the MIT software license, see the accompanying
# file LICENSE or http://www.opensource.org/licenses/mit-license.php
import time
import sys
import json
import logging
import traceback
import uuid

from twisted.internet import reactor
from twisted.internet.task import LoopingCall

from autobahn.twisted.websocket import WebSocketServerProtocol
from autobahn.twisted.websocket import WebSocketServerFactory

from txzmq import ZmqEndpoint, ZmqEndpointType
from txzmq import ZmqFactory
from txzmq import ZmqSubConnection

from moneysocket.stack.consumer import OutgoingConsumerStack
from moneysocket.beacon.beacon import MoneysocketBeacon

from server.chat_db import ChatDb
from server.pending_requests import PendingRequests


UNPAID_PRUNE_CHECK = 60
UNPAID_PRUNE_SECONDS = 120


MAX_USERNAME = 20
MAX_MESSAGE = 1000

###############################################################################


class ChatMessage(dict):
    def __init__(self, username, message):
        super().__init__()
        self['type'] = "MESSAGE"
        self['chat_uuid'] = str(uuid.uuid4())
        self['recv_timestamp'] = time.time()
        self['username'] = username
        self['message'] = message
        self['paid_timestamp'] = None
        self['preimage'] = None
        self['bolt11'] = None

    @staticmethod
    def is_valid(msg_dict):
        if 'username' not in msg_dict:
            return False
        if len(msg_dict['username']) > MAX_USERNAME:
            return False
        if not msg_dict['username'].isalnum():
            return False
        if 'message' not in msg_dict:
            return False
        if len(msg_dict['message']) > MAX_MESSAGE:
            return False
        return True


###############################################################################

class ChatSocketClient(WebSocketServerProtocol):
    def onConnect(self, request):
        logging.info("Client connecting: {0}".format(request.peer))

    def onOpen(self):
        self.client_uuid = uuid.uuid4()
        logging.info("WebSocket client connection open. %s" % self.client_uuid)
        self.server.clients[self.client_uuid] = self
        self.server.app.send_chat_history(self.client_uuid)

    def onMessage(self, payload, isBinary):
        if isBinary:
            logging.error("got binary payload?")
            self.send_error("could not decode message")
            return
        try:
            msg_dict = json.loads(payload.decode('utf8'))
        except Exception as e:
            self.send_error("could not decode message")
            logging.error(e)
            logging.error(traceback.format_exc())
            return

        if not ChatMessage.is_valid(msg_dict):
            self.send_error("message validation error")
            return

        self.handle_message(msg_dict)
        logging.info("message: %s" % payload)

    def onClose(self, wasClean, code, reason):
        logging.info("WebSocket connection closed: %s %s" % (reason,
                                                             self.client_uuid))
        if self.client_uuid in self.server.clients:
            del self.server.clients[self.client_uuid]

    def handle_message(self, msg_dict):
        cm = ChatMessage(msg_dict['username'], msg_dict['message'])
        err = self.server.client_message_request(self.client_uuid, cm)
        if err:
            self.send_error(err)

    ###########################################################################

    def send_error(self, err):
        e = {'type': "ERROR",
             'error': err}
        self.sendMessage(json.dumps(e).encode('utf8'), isBinary=False)

    def send_invoice(self, bolt11):
        i = {'type': "INVOICE",
             'bolt11': bolt11}
        self.sendMessage(json.dumps(i).encode('utf8'), isBinary=False)

    def send_message(self, message):
        self.sendMessage(json.dumps(message).encode('utf8'), isBinary=False)

    def send_messages(self, messages):
        m = {'type': "MESSAGES",
             'messages': messages}
        self.sendMessage(json.dumps(m).encode('utf8'), isBinary=False)

###############################################################################

class ChatSocketServer(WebSocketServerFactory):
    def __init__(self, config, app):
        self.config = config
        host = config['Server']['BindHost']
        port = int(config['Server']['BindPort'])
        # TODO - tls
        ws_url = u"ws://%s:%d" % (host, port)
        super().__init__()
        self.setProtocolOptions(openHandshakeTimeout=15, autoPingInterval=30,
                                autoPingTimeout=5)

        self.protocol = ChatSocketClient
        self.protocol.server = self
        self.clients = {}
        print("listening on websocket %s" % ws_url)
        reactor.listenTCP(port, self)
        self.app = app

    ###########################################################################

    def send_to_all_chat_clients(self, message):
        for c in self.clients.values():
            c.send_message(message)

    def send_message(self, client_uuid, message):
        if client_uuid not in self.clients:
            logging.info("client disconnected?")
            return
        self.clients[client_uuid].send_message(message)

    def client_message_request(self, client_uuid, chat_message):
        return self.app.client_message_request(client_uuid, chat_message)

    def send_invoice(self, client_uuid, bolt11):
        if client_uuid not in self.clients:
            logging.info("client for invoice %s not connected" % bolt11)
            return
        self.clients[client_uuid].send_invoice(bolt11)

    ###########################################################################


###############################################################################

class ChatApp(object):
    def __init__(self, config):
        self.config = config
        self.chat_db_file = config['Db']['ChatDbFile']
        self.chat_socket_server = None
        self.chat_db = None
        self.pending_requests = None
        self.consumer_stack = None
        self.consumer_announced = False
        self.consumer_connecting = None
        self.price_msats = int(config['Server']['ChatMsatPrice'])
        self.prune_loop = None

    ###########################################################################

    def setup_consumer_stack(self):
        s = OutgoingConsumerStack()
        s.onannounce = self.consumer_on_announce
        s.onrevoke = self.consumer_on_revoke
        s.onstackevent = self.consumer_on_stack_event
        s.onproviderinfo = self.consumer_on_provider_info
        s.onping = self.consumer_on_ping
        s.oninvoice = self.consumer_on_invoice
        s.onpreimage = self.consumer_on_preimage
        s.onerror = self.consumer_on_error
        self.consumer_stack = s

    def setup_pending_requests(self):
        self.pending_requests = PendingRequests()

    def setup_chat_db(self):
        self.chat_db = ChatDb(self.chat_db_file)

    def setup_chatsocket_server(self):
        self.chat_socket_server = ChatSocketServer(self.config, self)

    ###########################################################################

    def client_message_request(self, client_uuid, chat_message):
        if not self.consumer_announced:
            return "chat server invoice failure"

        request_uuid, err = self.consumer_stack.request_invoice(
            self.consumer_nexus_uuid, self.price_msats, "")
        if err:
            return err

        self.pending_requests.add_invoicing(request_uuid, client_uuid,
                                            chat_message)
        return None

    def send_chat_history(self, client_uuid):
        for m in self.chat_db.send_history():
            self.chat_socket_server.send_message(client_uuid, json.loads(m))

    ###########################################################################

    def consumer_on_announce(self, nexus):
        self.consumer_announced = True
        self.consumer_nexus_uuid = nexus.uuid
        print("consumer online")

    def consumer_on_revoke(self, nexus):
        self.consumer_announced = False
        self.consumer_nexus_uuid = None
        print("consumer offline")

    def consumer_on_provider_info(self, nexus, provider_info):
        print("consumer provider info")

    def consumer_on_ping(self, nexus, msecs):
        print("got ping: %s" % msecs)

    def consumer_on_stack_event(self, layer_name, nexus, status):
        print("consumer layer: %s  status: %s" % (layer_name, status))

    def consumer_on_invoice(self, nexus, bolt11, request_reference_uuid):
        print("consumer on invoice")
        client_uuid, err = self.pending_requests.got_invoice(
            request_reference_uuid, bolt11)
        if err:
            return
        self.chat_socket_server.send_invoice(client_uuid, bolt11)

    def consumer_on_preimage(self, nexus, preimage, request_reference_uuid):
        print("consumer on preimage")
        message, err = self.pending_requests.got_preimage(preimage)
        if err:
            return
        self.chat_db.add_chat_message(message)
        self.chat_socket_server.send_to_all_chat_clients(message)

    def consumer_on_error(self, nexus, error_msg, request_reference_uuid):
        print("consumer on error")

    ###########################################################################

    def connect(self):
        beacon, err = MoneysocketBeacon.from_bech32_str(
            self.config['WalletProvider']['Beacon'])
        if err:
            sys.exit("bad beacon? %s" % err)
        self.consumer_connecting = self.consumer_stack.do_connect(beacon)

    def reconnect(self):
        if self.consumer_connecting.get_state() in {'connecting', 'connected'}:
            return
        self.connect()

    ###########################################################################

    def run(self):
        self.setup_chatsocket_server()
        self.setup_chat_db()
        self.setup_consumer_stack()
        self.setup_pending_requests()

        self.connect()
        self.prune_loop = LoopingCall(self.pending_requests.prune_expired)
        self.prune_loop.start(60, now=False)

        self.reconnect_loop = LoopingCall(self.reconnect)
        self.reconnect_loop.start(5, now=False)

    def stop(self):
        self.consumer_stack.do_disconnect()
        self.chat_db.unmap_chat_bin()
        self.prune_loop.stop()
