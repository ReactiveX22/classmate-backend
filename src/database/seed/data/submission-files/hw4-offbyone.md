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
    cur = head
    while cur is not None and cur.val != val:
        cur = cur.next
    if cur is None:
        return head
    cur.next = cur.next.next
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

Insert and reverse pass. Delete fails most tests with off-by-one behavior.

## Why reverse needs three pointers

Reverse needs extra pointers because you have to remember nodes while changing links. I used prev, cur, and nxt. It works in one pass.
