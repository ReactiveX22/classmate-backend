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

Most tests pass. Delete-from-empty crashes; I am still debugging that one.

## Why reverse needs three pointers

You need `prev` for the reversed part, `cur` for the node you are flipping, and `nxt` so you don't lose the rest of the list. Without the third pointer the remaining nodes become unreachable after the first rewiring. Reverse walks the list once, so it is O(n).
