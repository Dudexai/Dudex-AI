@echo off
echo Starting DudexAI using Docker Compose...
docker-compose down
docker-compose up --build
