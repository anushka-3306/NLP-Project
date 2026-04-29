import re
import os
from typing import List, Set
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

class NERService:
    def __init__(self, skills_list: List[str] = None):
        print("Initializing NERService with Transformer model...")
        self.model_name = "dbmdz/bert-large-cased-finetuned-conll03-english"
        hf_token = os.getenv("HF_TOKEN")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, token=hf_token)
        self.model = AutoModelForTokenClassification.from_pretrained(self.model_name, token=hf_token)
        self.ner_pipeline = pipeline("ner", model=self.model, tokenizer=self.tokenizer, aggregation_strategy="simple")
        
        self.stopwords = {
            "assistant", "platform", "agent", "recognition",
            "api", "web", "google", "india", "mumbai"
        }
        
        self.skill_map = {
            "node": "node.js",
            "react": "react",
            "tailwind cs": "tailwind css",
            "dock": "docker",
            "kubernete": "kubernetes",
            "postg": "postgresql",
            "mongo": "mongodb",
            "tf": "tensorflow"
        }

    def chunk_text(self, text: str, max_length: int = 100) -> List[str]:
        """Split text into overlapping chunks"""
        tokens = self.tokenizer.encode(text, add_special_tokens=False)
        chunks = []
        for i in range(0, len(tokens), max_length - 10):  # 10 token overlap
            chunk_tokens = tokens[i:i + max_length]
            chunk_text = self.tokenizer.decode(chunk_tokens)
            chunks.append(chunk_text)
        return chunks

    def clean_ner_output(self, ner_output) -> List[str]:
        cleaned = []
        current = ""
        for token in ner_output:
            # Drop Person and Location identifiers
            entity_group = token.get("entity_group", "")
            if entity_group in ["PER", "LOC"]:
                if current:
                    cleaned.append(current)
                    current = ""
                continue

            word = token["word"]
            # Merge subwords like ##QL → SQL
            if word.startswith("##"):
                current += word[2:]
            else:
                if current:
                    cleaned.append(current)
                current = word
        if current:
            cleaned.append(current)
        return cleaned

    def normalize_tokens(self, tokens: List[str]) -> List[str]:
        normalized = []
        for t in tokens:
            t = t.lower().strip()
            t = re.sub(r'[^a-z0-9+\-\. ]', '', t)  # remove junk
            # filter very short garbage
            if len(t) < 2:
                continue
            normalized.append(t)
        return normalized

    def filter_skills(self, tokens: List[str]) -> List[str]:
        return list(set([t for t in tokens if t not in self.stopwords]))

    def map_skills(self, tokens: List[str]) -> List[str]:
        return [self.skill_map.get(t, t) for t in tokens]

    def extract_skills(self, text: str) -> Set[str]:
        if not text:
            return set()
            
        all_ner_outputs = []
        chunks = self.chunk_text(text)
        
        for chunk in chunks:
            try:
                ner_results = self.ner_pipeline(chunk)
                if ner_results:
                    all_ner_outputs.extend(ner_results)
            except Exception as e:
                print(f"Error processing NER chunk: {e}")
                
        tokens = self.clean_ner_output(all_ner_outputs)
        tokens = self.normalize_tokens(tokens)
        tokens = self.filter_skills(tokens)
        tokens = self.map_skills(tokens)
        
        return set(tokens)
