# Lab 3 Report — Team 4

Team 4: David Kim, Emily Watson, Olivia Taylor. CSE 481, Lab 3.

## Config table (baseline)

- chunk_size = 512, chunk_overlap = 50, top_k = 5
- embedding_model = text-embedding-3-small
- vector_store = FAISS IndexFlatL2, normalized
- generator = Llama-3-8B-Instruct, temperature = 0.3

## EM results

- chunk 512 (baseline): EM 0.60, citation precision 0.77
- chunk 1024: EM 0.55, citation precision 0.70
- chunk 256: EM 0.48, citation precision 0.61

1024 beats 512 when the question needs two adjacent paragraphs at once. Otherwise 512 is better because smaller chunks match the question more exactly.

## Error examples (FAISS L2 distances)

1. Q6: top-1 distance 1.32, chunk boundary cut the definition in half. Fixed by re-chunking, new distance 0.84.
2. Q9: temperature 0.7 output added a detail not present in the chunk. At 0.3 the answer stays grounded.
3. Q14: 256-chunk run retrieved a fragment at distance 1.18; the 512 run gets the full passage at 0.75.

## Disclosure

All runs are our own. The bonus attention cell confirmed scattering around cut boundaries on our 1024-chunk run.
