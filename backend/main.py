from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from services.parser_service import parse_resume
from services.graph_service import GraphService
from services.ner_service import NERService
from services.similarity_service import SimilarityService
from services.fraud_service import FraudService
from services.recommendation_service import RecommendationService
from services.db_service import DBService

app = FastAPI(title="Aira ATS API")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
# Note: In production, use dependency injection or singleton pattern
graph_service = GraphService()
similarity_service = SimilarityService()
fraud_service = FraudService()
rec_service = RecommendationService()
db_service = DBService()

# For NER, we need a skill list. Let's get all skills from Graph once.
# In a real app, this would be cached or reactive.
ALL_SKILLS = [s for s in graph_service.get_all_jobs()] # This is just titles, we need skills
# Let's use a hardcoded fallback or better logic if get_all_skills was available
SKILL_TAXONOMY = ["Python", "Java", "React.js", "Node.js", "Machine Learning", "NLP", "SQL", "Docker", "AWS", "TensorFlow", "PyTorch"]
ner_service = NERService(SKILL_TAXONOMY)

class JobCreate(BaseModel):
    title: str
    description: str

@app.post("/api/jobs")
async def create_job(job: JobCreate):
    return db_service.create_job(job.title, job.description)

@app.get("/api/jobs")
async def get_db_jobs():
    return db_service.get_all_jobs()

@app.get("/api/jobs/{job_id}/applications")
async def get_job_applications(job_id: int):
    return db_service.get_applications_for_job(job_id)

@app.get("/jobs")
async def get_jobs():
    return graph_service.get_all_jobs()

@app.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    job_title: str = Form(None),
    job_description: str = Form(""),
    job_id: int = Form(None)
):
    if job_id is not None:
        db_job = db_service.get_job(job_id)
        if db_job:
            job_title = db_job["title"]
            job_description = db_job["description"]
            
    if not job_title:
        job_title = "Unknown"

    print("\n" + "#"*60)
    print("### /analyze ENDPOINT CALLED ###")
    print(f"Filename: {file.filename}")
    print(f"Job title: {job_title}")
    print(f"Job ID: {job_id}")
    print("#"*60)

    # 1. Save File Temporarily
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    print(f"[1/8] File saved to: {file_path}")

    try:
        # 2. Parse Resume
        parsed_data = parse_resume(file_path)
        full_text = parsed_data["full_text"]
        print(f"[2/8] Parsed resume. Text length: {len(full_text)}")
        print(f"       Extracted fields: {parsed_data['extracted_fields']}")

        # 3. Graph Job Requirements
        graph_job_reqs = graph_service.get_job_requirements(job_title)
        
        # Merge with JD Skills (NER)
        jd_skills = ner_service.extract_skills(job_description) if job_description else set()
        
        reqs_dict = {req["skill"].lower(): {"skill": req["skill"], "weight": req["weight"]} for req in graph_job_reqs}
        
        for skill in jd_skills:
            # High priority weight for JD skills, overwrites graph skill if exists
            reqs_dict[skill] = {"skill": skill.title(), "weight": 2.0}
            
        job_reqs = list(reqs_dict.values())
        
        required_skill_names = [r["skill"] for r in job_reqs]
        print(f"[3/8] Combined Job requirements (Graph + JD): {len(job_reqs)} skills")
        print(f"       Skills: {required_skill_names}")

        if not job_reqs:
            print(f"       WARNING: No skills found for job title '{job_title}' and no JD provided.")
            print(f"       Available jobs: {graph_service.get_all_jobs()}")

        # 4. NER Skill Extraction
        resume_skills = ner_service.extract_skills(full_text)
        print(f"[4/8] Extracted {len(resume_skills)} skills from resume: {list(resume_skills)}")

        # 5. Skill Match Scoring (40%)
        matched_skills = []
        missing_skills = []
        skill_score_sum = 0
        total_weight = sum(r["weight"] for r in job_reqs) if job_reqs else 1

        for req in job_reqs:
            if req["skill"].lower() in resume_skills:
                matched_skills.append(req["skill"])
                skill_score_sum += req["weight"]
            else:
                missing_skills.append(req["skill"])

        skill_match_final = (skill_score_sum / total_weight) * 100
        print(f"[5/8] Skill match: {matched_skills} | Missing: {missing_skills}")
        print(f"       Skill match score: {skill_match_final}")

        # 6. Semantic Similarity (40%)
        # Pass the raw original Job Description sentence structures for accurate embedding context
        jd_text_context = job_description if job_description else ". ".join(required_skill_names) + "."
        print(f"[6/8] Computing semantic similarity...")
        sim_result = similarity_service.compute_similarity(jd_text_context, full_text)
        semantic_score = sim_result["overall_score"]
        print(f"       Semantic score: {semantic_score}")

        # 7. Fraud Detection (20%)
        print(f"[7/8] Running fraud detection...")
        fraud_result = fraud_service.detect_fraud(full_text, list(resume_skills))
        integrity_score = fraud_result["integrity_score"]
        print(f"       Integrity score: {integrity_score}")

        # 8. Aggregation
        final_score = (
            (skill_match_final * 0.4) +
            (semantic_score * 0.4) +
            (integrity_score * 0.2)
        )
        print(f"[8/8] Final aggregated score: {final_score}")
        
        candidate_name = parsed_data["extracted_fields"].get("contact", {}).get("name", "Unknown")
        if job_id is not None:
            db_service.create_application(
                job_id=job_id,
                candidate_name=candidate_name,
                final_score=round(final_score, 2),
                skill_match=round(skill_match_final, 2),
                semantic_similarity=round(semantic_score, 2),
                fraud_integrity=round(integrity_score, 2)
            )

        # 9. Recommendations for missing skills
        recommendations = rec_service.get_recommendations(missing_skills)
        print(f"       Recommendations: {recommendations}")
        print("### RESPONSE SENT ###\n")

        return {
            "candidate_name": parsed_data["extracted_fields"].get("contact", {}).get("name", "Unknown"),
            "final_score": round(final_score, 2),
            "breakdown": {
                "skill_match": round(skill_match_final, 2),
                "semantic_similarity": round(semantic_score, 2),
                "fraud_integrity": round(integrity_score, 2)
            },
            "details": {
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "fraud_report": fraud_result,
                "similarity_report": sim_result["details"]
            },
            "recommendations": recommendations
        }

    except Exception as e:
        print(f"\n!!! ERROR in /analyze: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"       Temp file cleaned: {file_path}")


