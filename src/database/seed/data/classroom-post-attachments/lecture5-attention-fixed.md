# Lecture 5: Attention (Fixed Re-upload)

Course: CSE 481, Lecture 5. Fixed re-upload replaces the version with swapped shapes on slide 14. Quiz on {{quiz_date}} follows this fixed version.

## Corrected shapes (d_model = 512, heads = 8, d_k = 64)

- W_Q: 512 x 512, W_K: 512 x 512, W_V: 512 x 512, W_O: 512 x 512
- Per head: Q, K, V each 128 x 64 for a 128-token sequence. Concatenated heads: 128 x 512 before W_O.
- Old (wrong) version listed W_V as 512 x 64. That was the bug. Use the table above.

## Pages to reprint

Pages 14 to 16 only. Everything else is unchanged from the in-class version.

## One worked check

Sequence length 128, d_model 512. QK^T per head is 128 x 128. Softmax over keys, multiply by V (128 x 64), concat 8 heads to 128 x 512, apply W_O to 128 x 512. If your dimensions do not match this chain, recheck your head split.
