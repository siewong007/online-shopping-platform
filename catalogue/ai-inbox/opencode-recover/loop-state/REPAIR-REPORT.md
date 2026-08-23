# Ledger repair — 2026-08-23 15:59

```
tiers_tried normalised on 491 rows, 45 distinct rewrites
  T1,T5 -> 1|5  (149)
  2|1 -> 1|2  (104)
  T1,T2,T5 -> 1|2|5  (40)
  2;3 -> 2|3  (37)
  T1(blocked),T5 -> 1|5  (22)
  T1,T4,T5 -> 1|4|5  (18)
  2;4 -> 2|4  (18)
  T1,T3,T5 -> 1|3|5  (12)
  2;3;4 -> 2|3|4  (12)
  T1,T2,T4,T5 -> 1|2|4|5  (11)
  T1,T3,T4,T5 -> 1|3|4|5  (9)
  T1,T2 -> 1|2  (9)

mis-keyed rows recovered: 8
  chat-04 (no promotion): 7
  chat-04 -> exhausted: 1
still unresolvable: 6
  chat-02: ('SWI-T/BOX-PP100-923A', 'SET')  (item_code absent from the worklist entirely)
  chat-02: ('SWI-T/BOX-PP100-740B', 'SET')  (item_code absent from the worklist entirely)
  chat-02: ('SWI-T/SOC-FLE-TC-5GL-240B', 'SET')  (item_code absent from the worklist entirely)
  chat-02: ('SWI-T/SOC-FLE-TC-3GL-340B', 'SET')  (item_code absent from the worklist entirely)
  chat-02: ('SWI-T/SOC-FLE-TC-4GL-240B', 'SET')  (item_code absent from the worklist entirely)
  chat-02: ('SWI-T/SOC-FLE-TC-2GL-340B', 'SET')  (item_code absent from the worklist entirely)

chat-01 shard candidates promoted open -> candidate: 15

final ledger: {'open': 6192, 'verified_pass': 419, 'candidate': 98, 'exhausted': 1062}
```
