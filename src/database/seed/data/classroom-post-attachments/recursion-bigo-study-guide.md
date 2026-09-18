# CSE 201 Study Guide: Recursion and Big-O (Weeks 5-6)

Midterm is {{midterm_cse201}} in Room 105. This guide covers the two ideas behind Quiz 2 and half the midterm.

## 1. Recursion in two parts

Every recursive function has exactly two parts:

- **Base case:** the input so small the answer is direct. `factorial(0) = 1`. No base case means the calls never stop, and Python ends that with `RecursionError` around call 1000.
- **Recursive case:** solve a smaller copy of the same problem and combine. `factorial(n) = n * factorial(n - 1)`.

Trace of `factorial(4)`: 4 * factorial(3), 3 * factorial(2), 2 * factorial(1), 1 * factorial(0), 0 hits the base case and returns 1, then the stack unwinds: 1, 2, 6, 24. Quiz 2 asks you to write traces like this one, showing the call stack.

Three checks before you submit any recursive function: does the input shrink on every call, is there an input that hits the base case directly, and what happens at the smallest real input (empty list, n = 0).

## 2. Big-O: count the growth, not the seconds

Big-O describes how work grows when the input grows. It ignores your laptop, the language, and constant factors.

Rules for reading code:

- Single loop over n items: O(n). Example: HW4 linked-list reverse, one pass.
- Nested loops, each over n: n times n, O(n^2). Example: bubble sort, selection sort.
- Loop that halves the problem each pass: about log n passes, O(log n). Example: binary search on a sorted array of 1024 items needs about 10 comparisons.
- Divide and conquer with n work per level and log n levels: O(n log n). Example: mergesort, and quicksort on average.

Growth table for n = 1,000,000: O(1) is 1 step, O(log n) is about 20, O(n) is 1,000,000, O(n log n) is about 20,000,000, O(n^2) is 1,000,000,000,000. That last number is why sorting choice matters.

The Olivia rule: count the levels, multiply by the work per level.

## 3. Sorting: average vs worst case

- **Mergesort:** always O(n log n), but allocates and copies. Steady, not the fastest in practice.
- **Quicksort:** O(n log n) on average with small constants (in place, cache friendly), O(n^2) worst case. Worst case needs already-sorted input plus a naive first-element pivot. Random or median-of-three pivots make it vanishingly rare, which is why quicksort usually wins in practice.
- Quiz 2 scope is tracing plus Big-O only. Sorting analysis is midterm-only.

## 4. Practice prompts

1. Trace `fib(5)` as a call tree. Count the repeated calls. Why is naive Fibonacci O(2^n)?
2. Binary search on 1,000,000 sorted items: worst-case comparisons?
3. This loop halves `n` each pass and does 3 operations per pass. Give the Big-O.

## 5. Cheat sheet allowance

Midterm: closed book, one handwritten sheet, both sides, no printouts. Suggested layout: one side recursion traces (factorial, binary search), other side the growth table plus the Olivia rule.
