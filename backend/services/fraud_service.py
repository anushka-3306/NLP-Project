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
        
    def has_projects_section(self, text: str) -> float:
        """Returns 0 if projects section exists but is empty or says 'None'."""
        tl = text.lower()
        if "projects" in tl:
            idx = tl.find("projects")
            after = tl[idx:idx + 60]
            if "none" in after or after.strip().endswith("projects"):
                return 0.0
        return 1.0

    def extract_features(self, text: str, skills: List[str]) -> List[float]:
        # Feature 0: Repetition score
        rep_score = 1 - (len(set(skills)) / (len(skills) + 1)) if skills else 0
        
        # Feature 1: Word repetition score
        words = text.lower().split()
        if not words: word_rep = 0
        else:
            counts = Counter(words)
            stop = {"i","am","a","the","in","and","for","with","of","to","as","is",
                    "my","have","has","at","on","an","by","be","are","was","were"}
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
        buzzwords = [
            "expert", "advanced", "proficient", "specialist", "experienced",
            "highly", "everything", "all technologies", "best", "master",
            "guru", "ninja", "rockstar", "wizard", "exceptional"
        ]
        buzz_count = sum(text.lower().count(w) for w in buzzwords)
        buzz_score = buzz_count / (len(words) + 1)
        
        # Feature 4: Content richness
        richness = len(set(words)) / len(words) if words else 0
        
        # Feature 5: Projects section
        proj_score = self.has_projects_section(text)
        
        return [float(rep_score), float(word_rep), float(max_run), float(buzz_score), float(richness), float(proj_score)]

    def experience_credibility_gap(self, text: str) -> float:
        exp = re.search(r'(\d+)\s*years?', text.lower())
        grad = re.search(r'(202\d|201\d)', text)
        if exp and grad:
            ey, gy = int(exp.group(1)), int(grad.group(1))
            if gy >= 2018 and ey >= 5:
                return min(ey / 5.0, 3.0)
        return 0.0

    def is_student_resume(self, text: str) -> bool:
        indicators = ["student", "intern", "fresher", "cgpa", "pursuing", "present",
                      "ongoing", "b.tech", "btech", "engineering student",
                      "third-year", "second-year", "first-year"]
        tl = text.lower()
        return any(w in tl for w in indicators)

    def detect_fraud(self, text: str, skills: List[str]) -> Dict[str, Any]:
        features = self.extract_features(text, skills)
        fs = self.scaler.transform([features])
        
        score = self.iso.decision_function(fs)[0]
        pred = self.iso.predict(fs)[0]
        # Hard flags
        flags = []
        rep    = features[0]
        wrep   = features[1]
        consec = features[2]
        buzz   = features[3]
        rich   = features[4]
        proj   = features[5]
        exp_gap = self.experience_credibility_gap(text)

        if consec >= 3:
            flags.append(f"Word repeated {int(consec)}x in a row — likely skill padding")
        if exp_gap >= 2.0:
            flags.append("Claims 10+ years experience but graduated recently — timeline impossible")
        elif exp_gap >= 1.0:
            flags.append("Experience years inconsistent with graduation year")
        if buzz > 0.08:
            flags.append("Excessive self-praise language (highly/expert/best overused)")
        if proj == 0:
            flags.append("Projects section is empty or says 'None'")
        if wrep > 0.25:
            flags.append("High word repetition in free text")
            
        n = len(flags)
        
        # Interpret prediction
        if n >= 2:
            verdict = "🚨 High Risk Resume"
        elif n == 1 and pred == -1:
            verdict = "⚠️ Suspicious Resume"
        elif pred == 1:
            verdict = "✅ Normal Resume"
        elif self.is_student_resume(text) and n == 0:
            verdict = "✅ Normal Resume"
        elif score < -0.19:
            verdict = "🚨 High Risk Resume"
        elif score < -0.165:
            verdict = "⚠️ Suspicious Resume"
        elif score < -0.13:
            verdict = "🟡 Slight Anomaly"
        else:
            verdict = "✅ Normal Resume"
            
        # Explanations
        reasons = list(flags)
        if rep > 0.3 and not any("padding" in f for f in reasons):
            reasons.append("Skill list contains many duplicate entries")
        if rich < 0.5:
            reasons.append("Very low vocabulary diversity")
        if not reasons:
            reasons.append("Resume looks normal" if score > -0.13 else "Resume deviates from normal patterns")

        # UI Integrity constraint
        if "High Risk" in verdict:
            integrity = max(0, 100 + (score * 200) - 50)
        elif "Suspicious" in verdict:
            integrity = max(0, 100 + (score * 200) - 25)
        elif "Anomaly" in verdict:
            integrity = max(0, 100 + (score * 200) - 10)
        else:
            integrity = min(100, max(0, 100 + (score * 200)))

        return {
            "fraud_score": round(float(score), 4),
            "verdict": verdict,
            "flags": reasons,
            "integrity_score": round(integrity, 2)
        }
