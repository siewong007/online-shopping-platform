# Refund and inventory policy

## Production recommendation

A payment refund changes the financial ledger only. It must not automatically increase physical
stock because a successful refund does not prove that Ekoway has the item back in sellable
condition. Keep restocking as an audited admin decision until the order model records item-level
return receipt and inspection.

| Payment / fulfilment state | Automatic restock | Required handling |
|---|---:|---|
| Full refund, `received`, picking never started | No | Admin may cancel and restock after confirming the item was never removed from stock. |
| Full refund, `picking`, `packed`, or `ready_for_pickup` | No | Locate and inspect every item, then perform a controlled inventory adjustment. |
| Full refund, `completed` or `delivered` | Never | Create a return, receive and inspect the goods, then restock only accepted quantities. |
| Partial refund at any fulfilment stage | Never | Record item/quantity/reason; do not restock the whole order. |
| Failed or abandoned unpaid payment | Reservation release only | The existing 60-minute release returns the held quantity exactly once. |
| Valid late capture after reservation release | No silent discard | Reacquire stock atomically; if unavailable, preserve payment and create a stock exception for staff. |

## Future automation prerequisite

Automatic restock is safe only after adding an item-level return record with requested, received,
inspected, accepted and rejected quantities plus an idempotent inventory movement. Until then,
the current manual-review behavior is deliberate and should not be treated as a defect.
