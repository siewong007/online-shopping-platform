import csv
import glob
import os

CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'
have = sorted(os.path.basename(f) for f in glob.glob(CHAT + r'\shard-r1-batch-*.csv'))
print('shards on disk:', have)
missing = [('%02d' % i) for i in range(1, 35) if ('shard-r1-batch-%02d.csv' % i) not in have]
print('missing shards:', missing)
