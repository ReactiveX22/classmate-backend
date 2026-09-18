# Lab 3: Retrieval-Augmented Generation Handout

Course: CSE 481, Lab 3. Due: {{rag_lab_due}} at 11:59 PM. Quiz on this handout plus the Transformer slides on {{quiz_date}} (20 minutes, closed book, in class).

## Goal

Build a small RAG pipeline over 200 Starlight CS lecture chunks and answer 20 test questions with citations.

## Reference configuration (use exactly this for your baseline)

- chunk_size = 512 tokens
- chunk_overlap = 50 tokens
- embedding_model = text-embedding-3-small (1536 dims)
- vector_store = FAISS IndexFlatL2, lower distance means more similar
- top_k = 5 retrieved chunks
- generator = Llama-3-8B-Instruct, temperature = 0.3, max_new_tokens = 256
- prompt template: "Context:\n{context}\n\nQuestion: {question}\nAnswer with [1], [2] citations."

## Steps

1. Chunk the corpus with a RecursiveCharacterTextSplitter (separators: "\n\n", "\n", " "). Verify mean chunk length is 480 to 540 tokens.
2. Embed with text-embedding-3-small. Normalize vectors before FAISS insert.
3. Retrieve top_k = 5 per question. Log the FAISS L2 distance for each hit. Distances above 1.2 are suspicious and usually mean a bad chunk boundary.
4. Generate with temperature 0.3. If the answer is not in the retrieved chunks, output "Not found in corpus [no citation]" instead of hallucinating.
5. Ablation: rerun once with chunk_size = 1024 and once with chunk_size = 256, keep overlap 50. Report EM and citation precision for all three settings in a table.

## Common failure and fix

`ModuleNotFoundError: No module named 'faiss'` means you forgot `pip install faiss-cpu==1.8.0`. On lab machines run `pip install -r lab3-requirements.txt` first. If FAISS returns empty hits, check you wrote to the same index path you read from (`./rag_index.faiss`).

## Deliverable

Lab 3 report, 50 points. One PDF per team: config table, EM for 512 vs 1024 vs 256, 3 error examples with distances, and one paragraph on when 1024 beats 512 (usually multi-hop questions needing full sections).

## Academic integrity for this lab

You may use AI tools for brainstorming, but the retrieved contexts, distances, and error analysis must be your own runs. Undisclosed AI-generated tables violate the Starlight AI Tools Policy effective last week and earn zero. The mini-quiz on {{quiz_date}} is closed book and tests exactly the numbers above.
