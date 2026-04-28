from FlagEmbedding import BGEM3FlagModel
import re
from typing import List, Dict, Any

class SimilarityService:
    def __init__(self, model_name: str = 'BAAI/bge-m3', use_fp16: bool = True):
        print(f"Loading {model_name} Model...")
        self.model = BGEM3FlagModel(model_name, use_fp16=use_fp16)
        # Thresholds from notebook logic
        self.PERFECT_SCORE_CAP = 0.50
        self.MIN_THRESHOLD = 0.20

    def segment_text(self, text: str) -> List[str]:
        # Improved chunking from notebook
        chunks = re.split(r'\n(?=[A-Z•-])|\.\s', text)
        return [c.strip().replace('\n', ' ') for c in chunks if len(c.strip()) > 15]

    def compute_similarity(self, jd_text: str, resume_text: str) -> Dict[str, Any]:
        print("=== SIMILARITY SERVICE DEBUG ===")
        print(f"JD text length: {len(jd_text)}")
        print(f"Resume text length: {len(resume_text)}")

        resume_chunks = self.segment_text(resume_text)
        jd_sentences = [s.strip() for s in jd_text.split('.') if len(s.strip()) > 10]

        print(f"Resume chunks: {len(resume_chunks)}")
        for i, chunk in enumerate(resume_chunks[:3]):
            print(f"  Chunk {i+1}: {chunk[:80]}...")
        print(f"JD sentences: {len(jd_sentences)}")
        for i, sent in enumerate(jd_sentences[:3]):
            print(f"  Sent {i+1}: {sent[:80]}...")

        if not jd_sentences or not resume_chunks:
            print("WARNING: No JD sentences or resume chunks to compare")
            return {"overall_score": 0, "details": []}

        total_normalized_score = 0
        results = []

        for i, req in enumerate(jd_sentences):
            print(f"\n--- Processing JD requirement {i+1}/{len(jd_sentences)} ---")
            print(f"  JD: '{req[:100]}'")

            sentence_pairs = [[req, chunk] for chunk in resume_chunks]
            print(f"  Created {len(sentence_pairs)} pairs")

            scores = self.model.compute_score(
                sentence_pairs,
                max_passage_length=128,
                weights_for_different_modes=[0.4, 0.3, 0.3]
            )

            print(f"  Scores type: {type(scores).__name__}")
            print(f"  Scores (raw): {scores}")

            # FlagEmbedding may return a list or a dict depending on version
            if isinstance(scores, list):
                # List of floats: [dense, sparse, colbert] or weighted combo
                raw_score = max(scores) if scores else 0
                best_match = resume_chunks[scores.index(raw_score)] if raw_score >= self.MIN_THRESHOLD else "NO MATCH FOUND"
                print(f"  List mode - raw_score: {raw_score}, best_match: '{best_match[:50]}'")
            elif isinstance(scores, dict):
                available_keys = list(scores.keys())
                print(f"  Dict keys: {available_keys}")
                hybrid_scores = scores.get('colbert+sparse+dense', [])
                raw_score = max(hybrid_scores) if hybrid_scores else 0
                best_match = resume_chunks[hybrid_scores.index(raw_score)] if raw_score >= self.MIN_THRESHOLD else "NO MATCH FOUND"
                print(f"  Dict mode - raw_score: {raw_score}, best_match: '{best_match[:50]}'")
            else:
                raw_score = 0
                best_match = "NO MATCH FOUND"
                print(f"  Unknown mode - raw_score: {raw_score}")

            # Scale to 0-100
            normalized_score = 0
            if raw_score >= self.MIN_THRESHOLD:
                normalized_score = min(100, (raw_score / self.PERFECT_SCORE_CAP) * 100)

            print(f"  Normalized score: {normalized_score}")

            total_normalized_score += normalized_score
            results.append({
                "requirement": req,
                "best_match": best_match,
                "score": normalized_score
            })

        final_score = total_normalized_score / len(jd_sentences)
        print(f"\nFinal overall score: {final_score}")
        print("="*60 + "\n")

        return {
            "overall_score": round(final_score, 2),
            "details": results
        }
