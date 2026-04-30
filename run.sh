#!/bin/bash
# 주식 종합 대시보드 실행 스크립트

echo "가상환경(venv)을 활성화합니다..."
source venv/bin/activate

echo "의존성 패키지를 확인하고 설치합니다..."
pip install -r requirements.txt

echo "백엔드(Flask) 및 프론트엔드를 포트 8080에서 실행합니다..."
echo "로컬 접속: http://127.0.0.1:8080"
echo "외부(같은 네트워크) 접속: http://192.168.123.103:8080"
python src/app.py
