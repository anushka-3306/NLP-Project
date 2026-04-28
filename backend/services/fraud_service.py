
import re
import pandas as pd
import numpy as np
import joblib
import os
from collections import Counter
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from typing import List, Dict, Any


class FraudService:
    def __init__(self, data_path: str = "resume_data.csv", model_dir: str = "models"):
        self.model_path = os.path.join(model_dir, "fraud_model.joblib")
        self.scaler_path = os.path.join(model_dir, "scaler.joblib")
        self.tfidf_path = os.path.join(model_dir, "tfidf.joblib")

        self.data_path = data_path
        self.model_dir = model_dir

        # 🔥 Debug flag
        self.debug = True




        if not os.path.exists(model_dir):
            os.makedirs(model_dir)

        if not os.path.exists(self.model_path):
            self.train_model()
        else:
            self.iso = joblib.load(self.model_path)
            self.scaler = joblib.load(self.scaler_path)
            self.tfidf = joblib.load(self.tfidf_path)

    # =========================
    # TRAIN MODEL
    # =========================
    def train_model(self):
        print("🚀 Training Fraud Detection Model...")

        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"{self.data_path} not found for training.")

        df = pd.read_csv(self.data_path)
        df_clean = df[df['matched_score'] > 0.5]

        print(f"📊 Total records: {len(df)}")
        print(f"✅ Clean records used: {len(df_clean)}")

        def get_features(row):
            def safe_eval(x):
                import ast
                try:
                    return ast.literal_eval(x) if isinstance(x, str) else []
                except:
                    return []

            skills = safe_eval(row.get('skills', '[]'))
            text = f"{row.get('career_objective', '')} {row.get('responsibilities', '')}"
            return self.extract_features(text, skills)

        # -------- TEXT --------
        texts = (
            df_clean.get("career_objective", "").fillna("") + " " +
            df_clean.get("responsibilities", "").fillna("")
        )

        # -------- TF-IDF --------
        self.tfidf = TfidfVectorizer(max_features=200, stop_words='english')
        X_text = self.tfidf.fit_transform(texts).toarray()

        print(f"🧠 TF-IDF vocab size: {len(self.tfidf.vocabulary_)}")

        # -------- MANUAL FEATURES --------
        X_manual = np.array(df_clean.apply(get_features, axis=1).tolist())

        print(f"📐 Manual feature shape: {X_manual.shape}")
        print(f"📐 TF-IDF feature shape: {X_text.shape}")

        # -------- COMBINE --------
        X = np.hstack([X_manual, X_text])

        print(f"📐 Final feature shape: {X.shape}")

        # -------- SCALE --------
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # -------- MODEL --------
        self.iso = IsolationForest(n_estimators=300, contamination=0.08, random_state=42)
        self.iso.fit(X_scaled)

        # -------- DEBUG: Score stats --------
        scores = self.iso.decision_function(X_scaled)
        print("\n📉 Anomaly Score Stats:")
        print(f"   Min: {np.min(scores):.4f}")
        print(f"   Max: {np.max(scores):.4f}")
        print(f"   Mean: {np.mean(scores):.4f}")
        print(f"   Std: {np.std(scores):.4f}")

        # -------- SAVE --------
        joblib.dump(self.iso, self.model_path)
        joblib.dump(self.scaler, self.scaler_path)
        joblib.dump(self.tfidf, self.tfidf_path)

        print("✅ Fraud model trained and saved.\n")

    # =========================
    # FEATURE EXTRACTION
    # =========================
    def extract_features(self, text: str, skills: List[str]) -> List[float]:
        rep_score = 1 - (len(set(skills)) / (len(skills) + 1)) if skills else 0

        words = text.lower().split()

        if not words:
            word_rep = 0
        else:
            counts = Counter(words)
            stop = {"i", "am", "a", "the", "in", "and", "for", "with", "of", "to", "as", "is"}
            repeated = sum(c - 1 for w, c in counts.items() if c > 1 and w not in stop)
            word_rep = repeated / (len(words) + 1)

        clean_words = [re.sub(r'[^a-z]', '', w) for w in words]
        max_run, cur = 1, 1
        for i in range(1, len(clean_words)):
            if clean_words[i] and clean_words[i] == clean_words[i - 1]:
                cur += 1
                max_run = max(max_run, cur)
            else:
                cur = 1

        # 🔥 Dynamic buzzword detection
        if not words:
            buzz_score = 0
        else:
            counts = Counter(words)
            # Only count excessive repetition if consecutive or very high
            repeated_words = [
                w for w, c in counts.items()
                if c > 3 and (c / len(words)) > 0.08
            ]
            buzz_score = sum(counts[w] for w in repeated_words) / (len(words) + 1)

        richness = len(set(words)) / len(words) if words else 0
        has_proj = 1 if "project" in text.lower() else 0

        return [rep_score, word_rep, float(max_run), buzz_score, richness, float(has_proj)]

    # =========================
    # TIMELINE CHECK
    # =========================
    def _check_timeline_consistency(self, experience: List[Dict[str, Any]]) -> List[str]:
        if not experience:
            return []

        flags = []
        parsed_dates = []

        from dateutil import parser as dt_parser
        from datetime import datetime

        for exp in experience:
            duration = exp.get("duration", "")
            if not duration or "-" not in duration:
                continue

            start_str, end_str = duration.split("-", 1)

            try:
                start_dt = dt_parser.parse(start_str.strip())

                if end_str.lower().strip() in ["present", "current", "ongoing", "now"]:
                    end_dt = datetime.now()
                else:
                    end_dt = dt_parser.parse(end_str.strip())

                parsed_dates.append({
                    "start": start_dt,
                    "end": end_dt,
                    "title": exp.get("title", "Unknown Role")
                })
            except:
                pass

        if len(parsed_dates) < 2:
            return []

        parsed_dates.sort(key=lambda x: x["start"])

        for i in range(1, len(parsed_dates)):
            prev = parsed_dates[i - 1]
            curr = parsed_dates[i]

            gap_days = (curr["start"] - prev["end"]).days
            if gap_days > 365:
                flags.append(f"Unaccounted chronological gap before '{curr['title']}'")

            if curr["start"] < prev["end"]:
                overlap_days = (prev["end"] - curr["start"]).days
                if overlap_days > 180:
                    flags.append(f"Suspicious overlap between '{prev['title']}' and '{curr['title']}'")

        return flags
    def _check_experience_vs_education(self, text: str) -> List[str]:
        import re
        flags = []

        # Extract graduation year
        edu_year_match = re.search(r'(20\d{2})', text)
        
        # Extract experience years
        exp_match = re.search(r'(\d+)\s*(\+?\s*)?(years|yrs)', text.lower())

        if edu_year_match and exp_match:
            grad_year = int(edu_year_match.group(1))
            exp_years = int(exp_match.group(1))

            from datetime import datetime
            current_year = datetime.now().year

            possible_experience = current_year - grad_year

            # 🚨 suspicious if claimed > possible + buffer
            if exp_years > possible_experience + 1:
                flags.append(
                    f"Experience inconsistency: claims {exp_years} years but graduated in {grad_year}"
                )

        return flags
    # =========================
    # AI PATTERN CHECK
    # =========================
    def _check_ai_hallucination(self, text: str) -> List[str]:
        flags = []

        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 5]

        if len(sentences) > 4:
            lengths = [len(s.split()) for s in sentences]
            std_dev = np.std(lengths)
            mean_len = np.mean(lengths)

            if mean_len > 0 and std_dev / mean_len < 0.25:
                flags.append("Low linguistic burstiness (machine-like text)")

        return flags

    # =========================
    # MAIN DETECTION
    # =========================
    def detect_fraud(
        self,
        text: str,
        skills: List[str],
        experience: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:

        features = self.extract_features(text, skills)

        manual = np.array(features).reshape(1, -1)
        text_vec = self.tfidf.transform([text]).toarray()

        X = np.hstack([manual, text_vec])
        fs = self.scaler.transform(X)

        score = self.iso.decision_function(fs)[0]
        pred = self.iso.predict(fs)[0]
        # 🔥 Override for obvious fraud patterns
        if features[2] >= 5 or features[3] > 0.2:
            score = min(score, -0.25)
        flags = []
        if features[2] >= 3:
            flags.append("Suspicious word padding detected")

        if features[3] > 0.08:
            flags.append("Excessive buzzword density")

        if features[4] < 0.4:
            flags.append("Low content diversity (possible template abuse)")

        if experience:
            flags.extend(self._check_timeline_consistency(experience))

        flags.extend(self._check_ai_hallucination(text))
        flags.extend(self._check_experience_vs_education(text))
        verdict = "Normal"
        if len(flags) >= 2 or score < -0.19:
            verdict = "High Risk"
        elif len(flags) == 1 or score < -0.15:
            verdict = "Suspicious"

                # 🔥 Stronger integrity scoring

        baseline_integrity = max(0, 100 + (score * 100))

        penalty = 0

        if "Suspicious word padding detected" in flags:
            penalty += 25

        if "Excessive buzzword density" in flags:
            penalty += 25

        if "Low content diversity (possible template abuse)" in flags:
            penalty += 20

        if any("Experience inconsistency" in f for f in flags):
            penalty += 30

        # extra penalty if multiple issues
        penalty += max(0, len(flags) - 1) * 10

        final_integrity = max(0, min(100, baseline_integrity - penalty))
                # 🔥 DEBUG OUTPUT
        if self.debug:
            print("\n🔍 FRAUD DEBUG INFO")
            print(f"Text length: {len(text.split())}")
            print(f"Features: {features}")
            print(f"Model score: {score:.4f}")
            print(f"Prediction: {'Anomaly' if pred == -1 else 'Normal'}")
            print(f"Flags: {flags}")
            print(f"Verdict: {verdict}")
            print(f"Integrity Score: {final_integrity:.2f}")

            print("\n🧩 Feature Breakdown:")
            print(f"  Skill repetition: {features[0]:.3f}")
            print(f"  Word repetition: {features[1]:.3f}")
            print(f"  Max repetition run: {features[2]}")
            print(f"  Buzz score: {features[3]:.3f}")
            print(f"  Richness: {features[4]:.3f}")
            print(f"  Has project: {features[5]}")

            return {
                "fraud_score": round(float(score), 4),
                "verdict": verdict,
                "flags": flags,
                "integrity_score": round(final_integrity, 2),
                "timeline_valid": not any(
                    "gap" in f.lower() or "overlap" in f.lower() for f in flags
                ),

                # 🔥 ADD THESE (for frontend)
                "keyword_stuffing": features[3] > 0.08,
                "hidden_text": False
            }

