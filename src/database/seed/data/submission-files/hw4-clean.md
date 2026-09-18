# Homework 4: Linked Lists

CSE 201, Homework 4. Autograder submission plus paragraph.

## Code (linked_list.py)

```
class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

def insert(head, val):
    node = Node(val)
    if head is None:
        return node
    cur = head
    while cur.next is not None:
        cur = cur.next
    cur.next = node
    return head

def delete(head, val):
    if head is None:
        return None
    if head.val == val:
        return head.next
    prev = head
    cur = head.next
    while cur is not None and cur.val != val:
        prev = cur
        cur = cur.next
    if cur is None:
        return head
    prev.next = cur.next
    return head

def reverse(head):
    prev = None
    cur = head
    while cur is not None:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    return prev
```

All autograder tests pass, including delete-from-empty.

## Why reverse needs three pointers

Reversing rewires each node's `next` to point backwards. With only two pointers you lose the rest of the list the moment you overwrite `cur.next` — there is no way back to the unvisited nodes. So you keep three: `prev` (the already-reversed head), `cur` (the node being flipped now), and `nxt` (the saved link to the untouched remainder). Each step flips one link and slides all three forward. One pass, O(n) time, O(1) space.
