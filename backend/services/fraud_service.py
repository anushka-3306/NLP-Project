import re
import pandas as pd
import numpy as np
import joblib
import os
from collections import Counter
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any

class FraudService:
    def __init__(self, data_path: str = "resume_data.csv", model_dir: str = "models"):
        self.model_path = os.path.join(model_dir, "fraud_model.joblib")
        self.scaler_path = os.path.join(model_dir, "scaler.joblib")
        self.data_path = data_path
        self.model_dir = model_dir
        
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
            
        if not os.path.exists(self.model_path):
            self.train_model()
        else:
            self.iso = joblib.load(self.model_path)
            self.scaler = joblib.load(self.scaler_path)

    def train_model(self):
        print("Training Fraud Detection Model...")
        if not os.path.exists(self.data_path):
            # Fallback if CSV missing - use some defaults or create dummy to avoid crash
            # But in this repo, resume_data.csv is expected.
            raise FileNotFoundError(f"{self.data_path} not found for training.")
        
        df = pd.read_csv(self.data_path)
        df_clean = df[df['matched_score'] > 0.5]
        
        # We need a small mock extraction since we can't run full parser on CSV rows easily here
        # But we'll follow the notebook's 'extract_features_from_dataset' logic
        def get_features(row):
            def safe_eval(x):
                import ast
                try: return ast.literal_eval(x) if isinstance(x, str) else []
                except: return []
            
            skills = safe_eval(row.get('skills', '[]'))
            text = f"{row.get('career_objective', '')} {row.get('responsibilities', '')}"
            return self.extract_features(text, skills)

        X = np.array(df_clean.apply(get_features, axis=1).tolist())
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        self.iso = IsolationForest(n_estimators=300, contamination=0.08, random_state=42)
        self.iso.fit(X_scaled)
        
        joblib.dump(self.iso, self.model_path)
        joblib.dump(self.scaler, self.scaler_path)
        print("✅ Fraud model trained and saved.")

    def extract_features(self, text: str, skills: List[str]) -> List[float]:
        # Feature 0: Repetition score
        rep_score = 1 - (len(set(skills)) / (len(skills) + 1)) if skills else 0
        
        # Feature 1: Word repetition score
        words = text.lower().split()
        if not words: word_rep = 0
        else:
            counts = Counter(words)
            stop = {"i","am","a","the","in","and","for","with","of","to","as","is"}
            repeated = sum(c - 1 for w, c in counts.items() if c > 1 and w not in stop)
            word_rep = repeated / (len(words) + 1)
            
        # Feature 2: Consecutive word repeat
        clean_words = [re.sub(r'[^a-z]', '', w) for w in text.lower().split()]
        max_run, cur = 1, 1
        for i in range(1, len(clean_words)):
            if clean_words[i] and clean_words[i] == clean_words[i - 1]:
                cur += 1
                max_run = max(max_run, cur)
            else: cur = 1
            
        # Feature 3: Buzzword score
        buzzwords = ["expert", "advanced", "proficient", "specialist", "guru", "ninja"]
        buzz_count = sum(text.lower().count(w) for w in buzzwords)
        buzz_score = buzz_count / (len(words) + 1)
        
        # Feature 4: Content richness
        richness = len(set(words)) / len(words) if words else 0
        
        # Feature 5: Projects section (simplified here, in real app we'd check sections dict)
        has_proj = 1 if "project" in text.lower() else 0
        
        return [rep_score, word_rep, float(max_run), buzz_score, richness, float(has_proj)]

    def _check_timeline_consistency(self, experience: List[Dict[str, Any]]) -> List[str]:
        if not experience: return []
        flags = []
        parsed_dates = []
        from dateutil import parser as dt_parser
        from datetime import datetime

        for exp in experience:
            duration = exp.get("duration", "")
            if not duration or "-" not in duration: continue
            start_str, end_str = duration.split("-", 1)
            try:
                start_dt = dt_parser.parse(start_str.strip())
                if end_str.lower().strip() in ["present", "current", "ongoing", "now"]:
                    end_dt = datetime.now()
                else:
                    end_dt = dt_parser.parse(end_str.strip())
                parsed_dates.append({"start": start_dt, "end": end_dt, "title": exp.get("title", "Unknown Role")})
            except Exception:
                pass

        if len(parsed_dates) < 2: return []
        
        parsed_dates.sort(key=lambda x: x["start"])
        # Detect overlaps and gaps
        for i in range(1, len(parsed_dates)):
            prev = parsed_dates[i-1]
            curr = parsed_dates[i]
            
            # Gap detection
            gap_days = (curr["start"] - prev["end"]).days
            if gap_days > 365:
                flags.append(f"Unaccounted chronological gap of {gap_days//365} years before '{curr['title']}'")
            
            # Overlap detection
            if curr["start"] < prev["end"]:
                overlap_days = (prev["end"] - curr["start"]).days
                if overlap_days > 180: # 6 months overlap of full time jobs is suspicious
                    flags.append(f"Suspicious {overlap_days//30} month chronological overlap between '{prev['title']}' and '{curr['title']}'")
        return flags

    def _check_ai_hallucination(self, text: str) -> List[str]:
        flags = []
        words = text.lower().split()
        
        # ChatGPT specific signature biases (empirical tracking)
        ai_signatures = {
            "delve", "testament", "orchestrated", "spearheaded", "realm", 
            "multifaceted", "revolutionized", "unwavering", "paradigm", 
            "tapestry", "demystify", "embark", "landscape", "pivotal"
        }
        
        signature_matches = sum(1 for w in words if w in ai_signatures)
        if len(words) > 50 and (signature_matches / len(words)) > 0.015: # 1.5% density of rare words is astronomically high
            flags.append("High semantic fingerprint correlation with AI-generated text")
            
        # Burstiness (Sentence length variation)
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 5]
        if len(sentences) > 4:
            lengths = [len(s.split()) for s in sentences]
            std_dev = np.std(lengths)
            mean_len = np.mean(lengths)
            pulse_ratio = std_dev / (mean_len + 1e-5)
            if pulse_ratio < 0.25: # Very uniform, non-human sentence structure length
                flags.append("Low linguistic burstiness (machine-like uniform sentence distribution)")
                
        return flags

    def detect_fraud(self, text: str, skills: List[str], experience: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        features = self.extract_features(text, skills)
        fs = self.scaler.transform([features])
        
        score = self.iso.decision_function(fs)[0]
        pred = self.iso.predict(fs)[0]
        
        # Hard flags
        flags = []
        if features[2] >= 3: flags.append("Suspicious word padding detected")
        if features[3] > 0.08: flags.append("Excessive buzzword density")
        if features[4] < 0.4: flags.append("Low content diversity (possible template abuse)")
        
        # New advanced integrity checks
        if experience:
            flags.extend(self._check_timeline_consistency(experience))
            
        flags.extend(self._check_ai_hallucination(text))
        
        # Base verdict logic from Isolation Forest
        verdict = "Normal"
        if len(flags) >= 2 or score < -0.19: verdict = "High Risk"
        elif len(flags) == 1 or score < -0.15: verdict = "Suspicious"
        
        baseline_integrity = max(0, 100 + (score * 200))
        penalty = len(flags) * 12.5 # Deduct sharply for rule-based heuristics
        final_integrity = max(0, min(100, baseline_integrity - penalty))
        
        return {
            "fraud_score": round(float(score), 4),
            "verdict": verdict,
            "flags": flags,
            "integrity_score": round(final_integrity, 2),
            "timeline_valid": not any("gap" in f.lower() or "overlap" in f.lower() for f in flags)
        }
