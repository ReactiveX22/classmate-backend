# Lab 3 Report — Team 2

Team 2: Marcus Cole, Grace Mitchell, Haruki Tanaka. CSE 481, Lab 3.

## Config table (baseline)

- chunk_size = 512, chunk_overlap = 50, top_k = 5
- embedding_model = text-embedding-3-small (1536 dims)
- vector_store = FAISS IndexFlatL2 over normalized vectors, index saved to Drive
- generator = Llama-3-8B-Instruct, temperature = 0.3, max_new_tokens = 256

## EM results

- chunk 512 (baseline): EM 0.65, citation precision 0.81
- chunk 1024: EM 0.58, citation precision 0.74
- chunk 256: EM 0.51, citation precision 0.66

1024 beats 512 on multi-hop questions that need a full section in one chunk (Q7, Q13, Q19): the answer spans a definition plus its example, which 512 splits. Everywhere else 512 wins on precision.

## Error examples (FAISS L2, normalized index)

1. Q4, definition cut mid-sentence: top-1 distance 1.41, wrong chunk. Re-chunked so definitions stay whole: distance 0.79, correct.
2. Q11, temperature rerun at 0.7: fluent answer with invented citation, distance 0.66 on the retrieved chunk but unfaithful generation. At 0.3 the same chunk yields the grounded answer.
3. Q16, 256-chunk run: top-1 distance 1.24, retrieved a fragment without the theorem name. 512 run retrieves the full statement at 0.71.

## Disclosure

Attention-weight figure in Appendix A was produced with the Lab 3 bonus cell on our own 512-chunk run. All distances are our own runs, same saved index.
