# Copyright (c) 2021 Moneysocket Developers
# Distributed under the MIT software license, see the accompanying
# file LICENSE or http://www.opensource.org/licenses/mit-license.php
import os
import time
import mmap


PIXEL_RECORD_BIT_SIZE = 12
BITS_PER_BYTE = 8

WIDTH = 1024
HEIGHT = 1024


class ChatDb(object):
    def __init__(self, chat_db_dir):
        if not os.path.exists(chat_db_dir):
            os.makedirs(chat_db_dir)
        self.chat_db_dir = chat_db_dir
        self.n_pixels = WIDTH * HEIGHT
        self.size = ChatDb.total_bytes()
        self.mmap_chat_bin()


    def mmap_file_init(self, path):
        file_ref = open(path, "wb")
        file_ref.close()

    ###########################################################################

    def mmap_chat_bin(self):
        path = self.chat_path()
        if not os.path.exists(path):
            self.mmap_file_init(path)
        self.file_ref = open(path, "r+b")
        self.bin = mmap.mmap(self.file_ref.fileno(), self.size)

    def unmap_chat_bin(self):
        self.bin.flush()
        self.bin.close()
        self.file_ref.close()

    def log_payload(self, payload):
        path = self.update_log_path()
        s = "%0.4f payload %s\n" % (time.time(), payload)
        f = open(path, "a")
        f.write(s)
        f.close()
