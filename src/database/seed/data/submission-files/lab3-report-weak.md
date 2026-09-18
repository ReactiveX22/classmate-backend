# Lab 3 Report — Team 1

Team 1: Sophia Martinez, Ethan Brown, Daniel Lee, Yuki Nakamura. CSE 481, Lab 3.

## Config table

- chunk_size = 512, chunk_overlap = 50, top_k = 5
- embedding_model = text-embedding-3-small
- vector_store = FAISS
- generator = Llama-3-8B, temperature = 0.7 (we forgot to set 0.3 until the last run)

## EM results

- chunk 512: EM 0.52
- chunk 1024: EM 0.49
- chunk 256: EM 0.44

1024 is sometimes better because bigger chunks have more text. 512 was best overall in our runs.

## Error examples

1. Q5: top-1 distance 1.5, wrong answer. We think the chunk boundary was bad.
2. Q10: the 0.7 output looked good but the citation did not match. The 0.3 rerun was more accurate.
3. Q17: 256-chunk run got a fragment. 512 was better.

## Note

Colab disconnected twice and we lost the first index, so the 1024 numbers come from a rerun on a fresh index. Distances were logged after the final setup.
