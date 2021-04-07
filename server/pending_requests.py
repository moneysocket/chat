# Copyright (c) 2021 Moneysocket Developers
# Distributed under the MIT software license, see the accompanying
# file LICENSE or http://www.opensource.org/licenses/mit-license.php

import logging
import time

from moneysocket.utl.bolt11 import Bolt11

MINUTE = 60
HOUR = 60 * MINUTE

class PendingRequests(object):
    def __init__(self):
        self.invoicing = {}
        self.invoiced = {}

    def add_invoicing(self, request_uuid, client_uuid, chat_message):
        logging.info("add invoicing")
        self.invoicing[request_uuid] = {'client_uuid': client_uuid,
                                        'message':     chat_message}

    def got_invoice(self, request_reference_uuid, bolt11):
        if request_reference_uuid not in self.invoicing:
            logging.error("unknown reference uuid? %s" % request_reference_uuid)
            return None, "unknown reference uuid"

        request = self.invoicing.pop(request_reference_uuid)
        payment_hash = Bolt11.get_payment_hash(bolt11)
        request['message']['bolt11'] = bolt11
        self.invoiced[payment_hash] = request
        logging.info("payment hash: %s" % payment_hash)
        return request['client_uuid'], None

    def got_preimage(self, preimage):
        payment_hash = Bolt11.preimage_to_payment_hash(preimage)
        logging.info("payment hash from preimage: %s" % payment_hash)
        if payment_hash not in self.invoiced:
            logging.error("unknown payment hash? %s" % payment_hash)
            return None, "unknown preimage"
        request = self.invoiced.pop(payment_hash)
        request['message']['preimage'] = preimage
        request['message']['paid_timestamp'] = time.time()
        return request['message'], None

    def prune_expired(self):
        expired = []
        for payment_hash, request in self.invoiced.items():
            bolt11 = request['message']['bolt11']
            d = Bolt11.to_dict(bolt11)
            # prune everything after an hour - moneysocket doesn't yet allow
            # us to invoice with a shorter expiry time. TODO - fix this
            if time.time() > (d['created_at'] + HOUR):
                expired.append(payment_hash)
            logging.info("pruning: %s" % bolt11)

        for payment_hash in expired:
            del self.invoiced[payment_hash]
