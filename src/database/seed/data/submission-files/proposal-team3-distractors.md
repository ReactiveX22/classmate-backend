# CSE 481 Project Proposal — Team 3

Members: Ava Robinson, Chris Nguyen, Isabella Garcia. One upload for the team.

## Problem

Instructors writing DSA quizzes spend hours crafting wrong-but-plausible multiple-choice distractors. Weak distractors make quizzes too easy and uninformative. Target users: CS instructors authoring weekly quizzes.

## Data

Starlight DSA quiz bank: 300 past questions with distractors and student selection rates, internal teaching use. Split 80/10/10.

## Method

Baseline: Llama-3-8B zero-shot distractor generation. Improvement: fine-tune with a plausibility ranker trained on historical selection rates (distractors students actually pick score higher). GPU budget: 12 A100 hours (7 ranker, 5 generation sweeps), within the 20-hour cap.

## Evaluation

Metrics: expert plausibility rating (1-5) and selection-rate correlation on held-out items. Success bar: mean rating 4+ with positive correlation to real selection rates.

## Schedule

- Week 8 (Oct 10): quiz bank cleaned, baseline outputs sampled — Ava
- Week 10 (Oct 24): ranker trained, first human rating round — Chris
- Week 12 (Nov 7): final eval, demo for CSE 201 staff — Isabella
