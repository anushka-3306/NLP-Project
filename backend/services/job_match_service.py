import re
import pickle
import os
from typing import Dict, Any


class JobMatchService:
    """
    Resume category classifier using TF-IDF + Logistic Regression.
    Loads pre-trained artifacts produced by Best_Job.ipynb.
    """

    # Confidence threshold from the notebook
    THRESHOLD = 0.076788

    def __init__(self, models_dir: str = None):
        """
        Load the three pickled artefacts.
        models_dir defaults to the project root (three levels above this file).
        """
        if models_dir is None:
            # backend/services/ -> backend/ -> Aira/ -> project root
            models_dir = os.path.join(
                os.path.dirname(__file__), "..", "..", ".."
            )

        tfidf_path   = os.path.join(models_dir, "tfIDF.pkl")
        clf_path     = os.path.join(models_dir, "clfLR.pkl")
        encoder_path = os.path.join(models_dir, "encoderLabel.pkl")

        print(f"[JobMatchService] Loading models from {os.path.abspath(models_dir)}")
        with open(tfidf_path,   "rb") as f: self.tfidf    = pickle.load(f)
        with open(clf_path,     "rb") as f: self.clf      = pickle.load(f)
        with open(encoder_path, "rb") as f: self.encoding = pickle.load(f)
        print("[JobMatchService] ✅ Models loaded.")

    # ------------------------------------------------------------------
    # Replicate the notebook's preprocessing pipeline exactly
    # ------------------------------------------------------------------
    def _preprocess(self, text: str) -> str:
        from nltk.stem import PorterStemmer
        from nltk.corpus import stopwords

        try:
            STOPWORDS = set(stopwords.words("english"))
        except Exception:
            import nltk
            nltk.download("stopwords", quiet=True)
            STOPWORDS = set(stopwords.words("english"))

        stemmer = PorterStemmer()
        review  = re.sub(r"[^a-zA-Z]", " ", text)
        tokens  = review.lower().split()
        tokens  = [stemmer.stem(w) for w in tokens if w not in STOPWORDS]
        return " ".join(tokens)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def predict(self, resume_text: str) -> Dict[str, Any]:
        """
        Returns:
          {
            "predicted_category": str | None,
            "confidence": float,
            "low_confidence": bool
          }
        """
        if not resume_text or not resume_text.strip():
            return {"predicted_category": None, "confidence": 0.0, "low_confidence": True}

        processed     = self._preprocess(resume_text)
        vectorized    = self.tfidf.transform([processed])
        probabilities = self.clf.predict_proba(vectorized)[0]
        max_proba     = float(probabilities.max())

        low_confidence = max_proba < self.THRESHOLD

        if low_confidence:
            return {
                "predicted_category": None,
                "confidence": round(max_proba, 4),
                "low_confidence": True,
            }

        vectorized_dense = vectorized.toarray()
        pred_encoded     = self.clf.predict(vectorized_dense)
        category         = self.encoding.inverse_transform(pred_encoded)[0]

        return {
            "predicted_category": str(category),
            "confidence": round(max_proba, 4),
            "low_confidence": False,
        }
