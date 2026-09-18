# CSE 481 Project Proposal — Team 5

Members: Mia Johnson, Andrew Patel, Ryan Cooper. One upload for the team. Seeking a fourth member interested in eval.

## Problem

RAG answers sound fluent even when unfaithful, and automatic metrics miss it. Teams need a cheap faithfulness check before nurse or instructor review. Target users: student teams evaluating course RAG projects.

## Data

Lab 3 outputs across all teams (with permission): 300 generated answers with retrieved chunks, course-internal. Split 80/10/10. Human faithfulness labels from two annotators per item.

## Method

Baseline: Llama-3-8B zero-shot judge prompted to rate faithfulness. Improvement: entailment-check pipeline (DeBERTa NLI over each claim vs retrieved chunks) calibrated against the human labels. GPU budget: 8 A100 hours (3 calibration, 5 large sweep), within the 20-hour cap.

## Evaluation

Metrics: agreement with human labels (Cohen's kappa) and precision on unfaithful-flagged items. Success bar: kappa 0.70+, precision 0.85 on flags.

## Schedule

- Week 8 (Oct 10): answer pool collected, annotation guide written — Mia
- Week 10 (Oct 24): NLI pipeline calibrated — Andrew
- Week 12 (Nov 7): validation on held-out teams, report — Ryan + fourth member
