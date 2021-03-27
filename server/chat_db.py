# Copyright (c) 2021 Moneysocket Developers
# Distributed under the MIT software license, see the accompanying
# file LICENSE or http://www.opensource.org/licenses/mit-license.php
import os
import time
import mmap
import json


PIXEL_RECORD_BIT_SIZE = 12
BITS_PER_BYTE = 8

WIDTH = 1024
HEIGHT = 1024

INIT_DATA = b'chat log:\0'

class ChatDb(object):
    def __init__(self, chat_db_path):
        chat_db_dir, _ = os.path.split(chat_db_path)
        if not os.path.exists(chat_db_dir):
            os.makedirs(chat_db_dir)
        self.chat_db_path = chat_db_path
        self.mmap_chat_bin()

    def flush(self):
        self.bin.flush()
        self.bin.close()
        self.file_ref.close()


    ###########################################################################

    def start_file_initialization(self, path):
        self.path = path
        self.file_ref = open(path, "wb")
        self.bin = bytearray()

    def write_file_initialization_bytes(self, record_bytes):
        self.file_ref.write(record_bytes)
        self.bin += record_bytes

    def end_file_initialization(self):
        self.file_ref.close()

    def mmap_file_init(self, path):
        self.start_file_initialization(path)
        self.write_file_initialization_bytes(INIT_DATA)
        self.end_file_initialization()

    ###########################################################################

    def mmap_chat_bin(self):
        path = self.chat_db_path
        if not os.path.exists(path):
            self.mmap_file_init(path)
        self.file_ref = open(path, "r+b")
        self.bin = mmap.mmap(self.file_ref.fileno(), os.path.getsize(path))

    def unmap_chat_bin(self):
        self.bin.flush()
        self.bin.close()
        self.file_ref.close()

    ###########################################################################

    def grow_mmap(self, growbytes):
        #print("fancy grow")
        current_len = len(self.bin)
        new_len = current_len + growbytes
        #print("fancy grow: %d" % new_len)
        self.bin.resize(new_len)
        self.plate_size = new_len

    def append_end(self, content):
        content_len = len(content)
        self.grow_mmap(content_len)
        self.bin[len(self.bin) - content_len:len(self.bin)] = content


    ###########################################################################

    def add_chat_message(self, chat_uuid, bolt11, preimage, recv_timestamp,
                         paid_timestamp, username, message):
        d = {'chat_uuid':       chat_uuid,
             'bolt11':          bolt11,
             'preimage':        preimage,
             'recv_timestamp':  recv_timestamp,
             'paid_timestamp':  paid_timestamp,
             'username':        username,
             'message':         message}
        s = json.dumps(d)
        e = s.encode("utf-8") + b'\0'
        self.append_end(e)

    def iter_chat_messages_json(self):
        i = 0
        while i < len(self.bin):
            start = i
            while i < len(self.bin) and self.bin[i] != 0:
                i += 1
            yield self.bin[start:i].decode("utf-8")
            i += 1

    def chat_messages(self):
        return list(self.iter_chat_messages_json())[1:]
