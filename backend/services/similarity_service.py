import re
import os
import numpy as np
from typing import List, Dict, Any

from FlagEmbedding import BGEM3FlagModel

class SimilarityService:
    def __init__(self, model_name: str = 'BAAI/bge-m3', use_fp16: bool = True):
        # FlagEmbedding uses transformers internally which respects HF_TOKEN env var
        # but we can also set it explicitly in the environment for this process
        if os.getenv("HF_TOKEN"):
            os.environ["HUGGING_FACE_HUB_TOKEN"] = os.getenv("HF_TOKEN")
            
        print(f"Loading {model_name} Model...")
        # use_fp16=True is faster on GPU, falls back gracefully on CPU
        self.model = BGEM3FlagModel(model_name, use_fp16=use_fp16)
        # Calibration thresholds
        self.PERFECT_SCORE_CAP = 0.75
        self.MIN_THRESHOLD = 0.35

    def segment_text(self, text: str) -> List[str]:
        # Split by newlines or sentence endings
        raw_chunks = re.split(r'\n|\.\s', text)
        processed = []
        for c in raw_chunks:
            clean = c.strip().replace('\n', ' ')
            if len(clean) > 20:
                # Truncate extremely long chunks to prevent model overflow
                processed.append(clean[:1000])
        return processed

    def compute_similarity(self, jd_text: str, resume_text: str) -> Dict[str, Any]:
        print("\n" + "="*60)
        print("=== SIMILARITY SERVICE DEBUG ===")
        print(f"JD text length: {len(jd_text)}")
        print(f"Resume text length: {len(resume_text)}")

        resume_chunks = self.segment_text(resume_text)
        jd_sentences = [s.strip() for s in jd_text.split('.') if len(s.strip()) > 15]

        if not jd_sentences or not resume_chunks:
            return {"overall_score": 0, "details": []}

        print(f"Analyzing {len(jd_sentences)} requirements against {len(resume_chunks)} resume segments...")

        # 1. Pre-calculate Resume Embeddings (Massively faster)
        # Using 'dense_vecs' for fast cosine similarity
        resume_embeddings = self.model.encode(resume_chunks, batch_size=12)['dense_vecs']
        
        total_normalized_score = 0
        results = []

        # 2. Compare each JD requirement
        for req in jd_sentences:
            jd_embedding = self.model.encode([req])['dense_vecs']
            
            # Compute Cosine Similarities
            # Similarity = (A . B) / (||A|| ||B||)
            # BGE-M3 dense vecs are usually normalized, so simple dot product works
            similarities = np.dot(resume_embeddings, jd_embedding.T).flatten()
            
            raw_score = float(np.max(similarities))
            best_idx = int(np.argmax(similarities))
            
            best_match = resume_chunks[best_idx] if raw_score >= self.MIN_THRESHOLD else "Insufficient match found"

            # Scale to 0-100 based on calibrated thresholds
            normalized_score = 0
            if raw_score >= self.MIN_THRESHOLD:
                # Map [MIN_THRESHOLD, PERFECT_SCORE_CAP] to [40, 100]
                # Using a slightly different scaling for dense vecs
                normalized_score = min(100, ((raw_score - 0.2) / (self.PERFECT_SCORE_CAP - 0.2)) * 100)
                normalized_score = max(0, normalized_score)

            total_normalized_score += normalized_score
            results.append({
                "jd_sentence": req,
                "best_match": best_match,
                "score": round(normalized_score / 100, 4) # API expects 0-1 range for detail table
            })

        final_score = total_normalized_score / len(jd_sentences)
        print(f"Analysis Complete. Final Score: {round(final_score, 2)}%")
        print("="*60 + "\n")

        return {
            "overall_score": round(final_score, 2),
            "details": results
        }