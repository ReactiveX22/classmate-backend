# CSE 481 Project Proposal — Team 1

Members: Sophia Martinez, Ethan Brown, Daniel Lee, Yuki Nakamura. One upload for the team.

## Problem

Campus lecture QA today is keyword search over slides. Students cannot ask follow-up questions in their own words. Target users: undergraduates in large lecture courses (200+ seats) who rewatch recordings.

## Data

Starlight lecture corpus: 200 CS lecture chunks with transcripts, CC-BY. Split 80/10/10. No PII; synthetic course data.

## Method

Baseline: bert-base-uncased retriever + Llama-3-8B zero-shot reader. Improvement: cross-encoder reranker (ms-marco-MiniLM) over top-20 before generation. GPU budget: 14 A100 hours (6 reranker training, 8 eval sweeps), within the 20-hour cap.

## Evaluation

Metrics: EM and citation precision on a held-out 40-question set. Success bar: +8 EM over the no-reranker baseline.

## Schedule

- Week 8 (Oct 10): corpus frozen, baseline running — Sophia
- Week 10 (Oct 24): reranker trained, ablation done — Ethan + Daniel
- Week 12 (Nov 7): final eval, poster draft — Yuki
