#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== PNF PRICE-IQ 로컬 실행 ==="

# PostgreSQL / Redis 시작
echo "[1/3] PostgreSQL & Redis 시작..."
brew services start postgresql@15 2>/dev/null || true
brew services start redis 2>/dev/null || true
sleep 1

# 백엔드 실행 (백그라운드)
echo "[2/3] 백엔드 시작 (포트 8000)..."
cd "$PROJECT_DIR/backend"
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
echo "  백엔드 PID: $BACKEND_PID"

sleep 2

# 프론트엔드 실행 (백그라운드)
echo "[3/3] 프론트엔드 시작 (포트 5173)..."
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "  프론트엔드 PID: $FRONTEND_PID"

echo ""
echo "========================================="
echo "  웹 브라우저에서 접속하세요:"
echo "  http://localhost:5173"
echo ""
echo "  로그인 정보:"
echo "  이메일:     admin@example.com"
echo "  비밀번호:   changeme123!"
echo ""
echo "  API 문서:   http://localhost:8000/docs"
echo "========================================="
echo ""
echo "종료하려면 Ctrl+C 를 누르세요."

# Ctrl+C 시 두 프로세스 모두 종료
cleanup() {
    echo ""
    echo "종료 중..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

wait
