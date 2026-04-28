from typing import List, Dict, Any
from services.db_service import DBService
class RecommendationService:
    def __init__(self):
        # Resource map from notebook logic
        self.db = DBService()

    def get_recommendations(self, missing_skills: List[str]) -> List[Dict[str, Any]]:
        recs = []

        for skill in missing_skills:
            skill_lower = skill.lower()

            # 🔍 Fetch from DB
            data = self.db.get_skill(skill_lower)

            if data:
                resources = data["resources"]  # comes from JSONB
            else:
                # fallback if skill not in DB
                resources = [
                    ("Search on Coursera: ", f"https://www.coursera.org/search?query={skill}"),
                    ("Search on YouTube: ", f"https://www.youtube.com/results?search_query=learn+{skill}")
                ]

            recs.append({
                "skill": skill,
                "resources": resources
            })

        return recs