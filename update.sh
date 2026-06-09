#!/bin/bash
# 빠른 업데이트 및 서버 재시작 스크립트 (운영환경 HTTPS 통합 도커버전)

echo "GitHub에서 최신 코드를 가져옵니다..."
git pull origin main

echo "통합 도커 환경(Nginx+WAS)을 재빌드하고 재시작합니다..."
./stop.sh --prod
./run.sh --prod

echo "업데이트가 완료되었습니다!"
