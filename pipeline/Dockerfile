FROM python:3.12-slim

WORKDIR /app

# Chemin relatif à la racine du projet (contexte de build)
COPY pipeline/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY pipeline/ ./pipeline/

ENV PYTHONUNBUFFERED=1

CMD ["python", "pipeline/fetch_bsdata.py"]
