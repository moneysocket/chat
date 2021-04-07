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

SEND_HISTORY_LEN = 200

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

    def add_chat_message(self, chat_message):
        d = {'type':            chat_message['type'],
             'chat_uuid':       chat_message['chat_uuid'],
             'bolt11':          chat_message['bolt11'],
             'preimage':        chat_message['preimage'],
             'recv_timestamp':  chat_message['recv_timestamp'],
             'paid_timestamp':  chat_message['paid_timestamp'],
             'username':        chat_message['username'],
             'message':         chat_message['message']}
        s = json.dumps(d)
        e = s.encode("utf-8") + b'\0'
        self.append_end(e)

    def iter_send_history(self, length=None):
        # This is a bit gross, but avoids holding too much in memory at a time
        # For a long chat history, this won't have to read all of it, just
        # the relevent newsest set of messages in the mmap.
        i = len(self.bin) - 2
        yielded = 0
        while i >= 0:
            end = i
            while i >= 0 and self.bin[i] != 0:
                i -= 1
            if length and yielded >= length:
                return
            msg = self.bin[i+1:end+1].decode("utf-8")
            if msg == "chat log:":
                return
            yield msg
            yielded += 1
            i -= 1

    def send_history(self):
        l = list(self.iter_send_history(length=SEND_HISTORY_LEN))
        l.reverse()
        return l

