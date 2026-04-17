from typing import List, Dict, Any

class RecommendationService:
    def __init__(self):
        # Resource map from notebook logic
        self.resource_map = {
            "python": [
                ("Python.org Tutorial", "https://docs.python.org/3/tutorial/"),
                ("FreeCodeCamp Python Course", "https://youtube.com/watch?v=rfscVS0vtbw")
            ],
            "machine learning": [
                ("Andrew Ng - ML Specialization", "https://coursera.org/specializations/machine-learning-introduction"),
                ("StatQuest ML Basics", "https://youtube.com/@statquest")
            ],
            "nlp": [
                ("HuggingFace NLP Course", "https://huggingface.co/learn/nlp-course"),
                ("Stanford CS224N", "https://web.stanford.edu/class/cs224n")
            ],
            "react.js": [
                ("React Official Docs", "https://react.dev/learn"),
                ("Scrimba React Course", "https://scrimba.com/learn/learnreact")
            ],
            "node.js": [
                ("Node.js Guides", "https://nodejs.org/en/docs/guides"),
                ("Traversy Media Node.js Crash Course", "https://youtube.com/watch?v=fBNz5xF-Kx4")
            ],
            "sql": [
                ("SQLZoo Interactive", "https://sqlzoo.net"),
                ("Mode SQL Tutorial", "https://mode.com/sql-tutorial")
            ],
            "docker": [
                ("Docker Get Started", "https://docs.docker.com/get-started"),
                ("TechWorld with Nana - Docker", "https://youtube.com/watch?v=3c-iBn73dDE")
            ],
            # Add more as needed based on SKILL_TAXONOMY
        }

    def get_recommendations(self, missing_skills: List[str]) -> List[Dict[str, Any]]:
        recs = []
        for skill in missing_skills:
            skill_lower = skill.lower()
            resources = self.resource_map.get(skill_lower, [
                ("Search on Coursera", f"https://www.coursera.org/search?query={skill}"),
                ("Search on YouTube", f"https://www.youtube.com/results?search_query=learn+{skill}")
            ])
            recs.append({
                "skill": skill,
                "resources": resources
            })
        return recs
