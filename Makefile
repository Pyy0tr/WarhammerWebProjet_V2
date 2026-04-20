.PHONY: help data-fetch data-parse browser backend-install backend-dev

help:
	@echo ""
	@echo "  make data-fetch       Télécharge les dernières données BSData"
	@echo "  make data-parse       Parse les .cat/.gst → data/cache/*.json"
	@echo "  make data             fetch + parse en une commande"
	@echo "  make browser          Lance le browser local (http://localhost:8080/browser/index.html)"
	@echo "  make backend-install  Installe les dépendances Python du backend"
	@echo "  make backend-dev      Lance le serveur FastAPI en mode dev"
	@echo ""

data-fetch:
	python pipeline/fetch_bsdata.py

data-parse:
	python pipeline/parse_bsdata.py

data: data-fetch data-parse

browser:
	@echo "Browser : http://localhost:8080/browser/index.html"
	python -m http.server 8080

backend-install:
	cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt

backend-dev:
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000
