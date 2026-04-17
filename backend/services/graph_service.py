from neo4j import GraphDatabase
import os

class GraphService:
    def __init__(self, uri="bolt://localhost:7687", user="neo4j", password="password"):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def get_job_requirements(self, job_title: str):
        """
        Retrieves skills required for a job title from Neo4j.
        Returns a list of dicts: [{\"skill\": str, \"weight\": float, \"category\": str}]
        """
        with self.driver.session() as session:
            result = session.run("""
                MATCH (j:Job {title: $title})-[r:REQUIRES]->(s:Skill)-[:IS_A]->(c:Category)
                RETURN s.name AS skill, r.weight AS weight, c.name AS category
                ORDER BY weight DESC
            """, title=job_title)
            return [record.data() for record in result]

    def get_all_jobs(self):
        with self.driver.session() as session:
            result = session.run("MATCH (j:Job) RETURN j.title AS title")
            return [record["title"] for record in result]

    def get_skill_details(self, skill_name: str):
        with self.driver.session() as session:
            result = session.run("""
                MATCH (s:Skill {name: $name})-[:IS_A]->(c:Category)
                RETURN s.name AS skill, c.name AS category
            """, name=skill_name).single()
            return result.data() if result else None
