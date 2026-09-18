# CSE 481 Project Proposal — Team 4

Members: David Kim, Emily Watson, Olivia Taylor. One upload for the team.

## Problem

Lecture QA accuracy depends on chunk size, but nobody has measured the tradeoff on our own course corpus. Teams keep guessing between 256, 512, and 1024. Target users: students and staff building RAG study tools over Starlight lecture notes.

## Data

Starlight CS lecture corpus: 200 chunks plus our Lab 3 20-question test set with gold answers, course-internal. Split 80/10/10 by question topic.

## Method

Baseline: 512/50/5 with text-embedding-3-small + Llama-3-8B zero-shot reader. Improvement: adaptive chunker that keeps definitions and theorem statements whole, evaluated at 256/512/1024 against fixed-overlap controls. GPU budget: 10 A100 hours (all eval sweeps, no training), within the 20-hour cap.

## Evaluation

Metrics: EM and citation precision per chunk size, plus boundary-cut rate (share of top-1 hits split mid-definition). Success bar: adaptive chunking cuts boundary cuts by half at equal EM.

## Schedule

- Week 8 (Oct 10): corpus + gold set frozen, baseline replicated — David
- Week 10 (Oct 24): adaptive chunker built, three-size sweep — Emily
- Week 12 (Nov 7): analysis, boto3 cost appendix — Olivia
