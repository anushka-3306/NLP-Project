
import re
from typing import List, Dict, Any

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import re
from typing import List, Dict, Any

class SimilarityService:
    def __init__(self):
        print("Loading SentenceTransformer model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

        self.PERFECT_SCORE_CAP = 0.8   # adjusted for cosine scale
        self.MIN_THRESHOLD = 0.3

    def segment_text(self, text: str) -> List[str]:
        chunks = re.split(r'\n(?=[A-Z•-])|\.\s', text)
        return [c.strip().replace('\n', ' ') for c in chunks if len(c.strip()) > 15]

    def compute_similarity(self, jd_text: str, resume_text: str) -> Dict[str, Any]:

        resume_chunks = self.segment_text(resume_text)
        jd_sentences = [s.strip() for s in jd_text.split('.') if len(s.strip()) > 10]

        if not jd_sentences or not resume_chunks:
            return {"overall_score": 0, "details": []}

        # Precompute embeddings
        jd_embeddings = self.model.encode(jd_sentences)
        resume_embeddings = self.model.encode(resume_chunks)

        total_score = 0
        results = []

        for i, jd_emb in enumerate(jd_embeddings):
            similarities = cosine_similarity([jd_emb], resume_embeddings)[0]

            best_idx = similarities.argmax()
            raw_score = similarities[best_idx]

            best_match = resume_chunks[best_idx] if raw_score >= self.MIN_THRESHOLD else "NO MATCH FOUND"

            normalized_score = 0
            if raw_score >= self.MIN_THRESHOLD:
                normalized_score = min(100, (raw_score / self.PERFECT_SCORE_CAP) * 100)

            total_score += normalized_score

            results.append({
                "requirement": jd_sentences[i],
                "best_match": best_match,
                "score": round(normalized_score, 2)
            })

        final_score = total_score / len(jd_sentences)

        return {
            "overall_score": round(final_score, 2),
            "details": results
        }