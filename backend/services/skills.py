"""Skill extraction from text using keyword matching + NLP normalization."""

import re

SKILLS_LIST = [
    # Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
    "ruby", "php", "swift", "kotlin", "scala", "r", "matlab",
    # Web
    "react", "vue", "angular", "next.js", "node.js", "express", "django",
    "flask", "fastapi", "graphql", "rest api", "html", "css", "tailwind",
    # Data / ML
    "machine learning", "deep learning", "nlp", "computer vision",
    "tensorflow", "pytorch", "keras", "scikit-learn", "hugging face",
    "llm", "transformers", "rag", "langchain", "openai",
    # Data
    "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "pandas", "numpy", "matplotlib", "seaborn", "plotly",
    "data analysis", "data visualization", "etl", "data pipelines",
    "spark", "hadoop", "kafka", "airflow",
    # Cloud / DevOps
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform",
    "ci/cd", "github actions", "jenkins", "linux", "bash",
    # General
    "git", "agile", "scrum", "microservices", "system design",
    "api design", "unit testing", "technical writing",
]

# Build a regex pattern for fast matching
_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(s) for s in sorted(SKILLS_LIST, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)

 
def extract_skills(text: str) -> list[str]:
    """Return lowercase unique skills found in text."""
    matches = _PATTERN.findall(text)
    return list({m.lower() for m in matches})