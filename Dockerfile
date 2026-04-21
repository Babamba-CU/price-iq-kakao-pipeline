FROM python:3.11-slim

WORKDIR /app

# 의존성 설치
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 코드 복사
COPY backend/ ./backend/
COPY CLAUDE.md .

WORKDIR /app/backend

# 포트 노출
EXPOSE 8000

# 시작 명령
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
