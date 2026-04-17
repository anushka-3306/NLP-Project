import psycopg2
import psycopg2.extras
import os

class DBService:
    def __init__(self):
        self.conn_str = "dbname='airadb' user='postgres' host='localhost' password='password' port='15432'"
        # In a production scenario, avoid aggressive _init_db on every startup, 
        # but this is safe with IF NOT EXISTS for MVP.
        try:
            self._init_db()
            print("DBService initialized successfully connected to Postgres.")
        except Exception as e:
            print(f"Warning: Failed to connect to postgres on init: {e}")

    def get_connection(self):
        return psycopg2.connect(self.conn_str)

    def _init_db(self):
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS jobs (
                        id SERIAL PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        description TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS applications (
                        id SERIAL PRIMARY KEY,
                        job_id INTEGER REFERENCES jobs(id),
                        candidate_name VARCHAR(255),
                        final_score FLOAT,
                        skill_match FLOAT,
                        semantic_similarity FLOAT,
                        fraud_integrity FLOAT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
            conn.commit()

    def create_job(self, title: str, description: str):
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "INSERT INTO jobs (title, description) VALUES (%s, %s) RETURNING *",
                    (title, description)
                )
                return cur.fetchone()

    def get_all_jobs(self):
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM jobs ORDER BY created_at DESC")
                return cur.fetchall()

    def get_job(self, job_id: int):
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM jobs WHERE id = %s", (job_id,))
                return cur.fetchone()

    def create_application(
        self,
        job_id: int,
        candidate_name: str,
        final_score,
        skill_match,
        semantic_similarity,
        fraud_integrity
    ):
        # ✅ Normalize all numeric values
        final_score = float(final_score)
        skill_match = float(skill_match)
        semantic_similarity = float(semantic_similarity)
        fraud_integrity = float(fraud_integrity)

        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO applications 
                    (job_id, candidate_name, final_score, skill_match, semantic_similarity, fraud_integrity)
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING *
                """, (job_id, candidate_name, final_score, skill_match, semantic_similarity, fraud_integrity))
                return cur.fetchone()

    def get_applications_for_job(self, job_id: int):
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM applications 
                    WHERE job_id = %s 
                    ORDER BY final_score DESC
                """, (job_id,))
                return cur.fetchall()
