@echo off
echo Installing dependencies...
pip install -r requirements.txt

echo Starting ML Service...
cd src
uvicorn api:app --reload --port 8000
