from services.db_service import DBService
from skills_taxonomy import SKILL_TAXONOMY  
db = DBService()

for skill, data in SKILL_TAXONOMY.items():
    db.insert_skill(
        name=skill,
        category=data["category"],
        level=data["level"],
        resources=data["resources"]
    )

print("✅ Skills seeded successfully")