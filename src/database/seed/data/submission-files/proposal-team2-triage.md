# CSE 481 Project Proposal — Team 2

Members: Marcus Cole, Grace Mitchell, Haruki Tanaka. One upload for the team.

## Problem

Triage nurses skim long discharge notes to decide follow-up priority. Missed callbacks cause readmissions. Target users: triage nurses at Starlight Medical Center handling 60+ discharges per day.

## Data

MIMIC-IV discharge summaries (de-identified, credentialed access via Grace's forms), 5,000 notes sampled. Split 80/10/10. License: PhysioNet credentialed use only, no redistribution.

## Method

Baseline: Llama-3-8B zero-shot over retrieved note chunks (512/50/5, text-embedding-3-small). Improvement: section-aware chunking (keep Assessment and Plan whole) + LoRA fine-tune (rank 8, 2 epochs). GPU budget: 18 A100 hours (12 fine-tune, 6 retrieval ablations), within the 20-hour cap.

## Evaluation

Metrics: triage-priority accuracy and faithfulness rating by two nurses on 100 cases. Success bar: 0.80 accuracy with zero unfaithful high-priority calls.

## Schedule

- Week 8 (Oct 10): MIMIC access confirmed, baseline running — Grace
- Week 10 (Oct 24): section-aware chunking + LoRA done — Haruki
- Week 12 (Nov 7): nurse eval, final report — Marcus
