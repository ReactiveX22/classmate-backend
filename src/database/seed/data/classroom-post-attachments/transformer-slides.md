# Transformer Slides Companion (Lectures 4-5)

Course: CSE 481. Covers the exact material quizzed on {{quiz_date}}. Pair with the RAG Lab Handout due {{rag_lab_due}}.

## Architecture we teach (6-layer demo model)

- d_model = 512, heads = 8, d_k = 64, feed-forward = 2048, layers = 6, dropout = 0.1
- Attention: Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
- QKVO means four projections: W_Q, W_K, W_V, W_O. Removing W_O in the ablation drops EM by 4 points on our lecture QA set.
- Positional encoding: sinusoidal, max_len = 4096. Lab corpus chunks of 512 tokens fit comfortably inside one window.

## Decoding settings for Lab 3 vs creative work

- Lab baseline generator: temperature = 0.3, top_p = 0.9, max_new_tokens = 256. Low temperature keeps citations faithful.
- Creative demo in lecture: temperature = 0.7, top_p = 0.95. Higher temperature is only for the in-class story generator, never for the lab report.
- Greedy decoding (temperature = 0.0) is acceptable for the ablation table if your GPU is slow.

## What the quiz will ask from these slides

1. Write the attention formula and name Q, K, V, O shapes for d_model 512 and 8 heads.
2. Why divide by sqrt(d_k)? One sentence: keeps dot products from exploding as dimension grows.
3. Temperature 0.3 vs 0.7: which one for faithful RAG answers and why?
4. What breaks if you remove the W_O projection?
5. Given chunk_size 512 from the handout, how many chunks fit in a 4096-token window, ignoring prompt overhead?

## Errata (Lecture 5 attention, fixed re-upload)

Slide 14 in the old upload had V and O shapes swapped. Fixed PDF is Lecture 5 attention, re-uploaded today. If you printed the old version, reprint pages 14 to 16. Quiz follows the fixed version.
