#!/bin/bash
# 이 스크립트는 Ubuntu 22.04 서버에 복사하여 실행하기 위한 Docker 기반 배포 자동화 스크립트입니다.
# 사용법: sudo bash deploy.sh

set -e

REPO_DIR="/home/ubuntu/stock_dashboard"
APP_USER="ubuntu"

echo "========================================================="
echo " 주식 대시보드 서버 Docker 기반 배포 자동화 스크립트"
echo "========================================================="

# 1. 루트 권한 확인
if [ "$EUID" -ne 0 ]; then
  echo "에러: 이 스크립트는 반드시 root 권한(sudo)으로 실행해야 합니다."
  exit 1
fi

echo "[1/5] Docker 및 Docker Compose 환경 검사"
# Docker 설치 여부 확인 및 자동 설치 시도
if ! command -v docker >/dev/null 2>&1; then
    echo "Docker가 설치되어 있지 않습니다. Docker 설치를 시작합니다..."
    apt-get update
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# docker compose 명령어 호환성 판단
DOCKER_COMPOSE_CMD="docker compose"
if ! docker compose version >/dev/null 2>&1; then
    if docker-compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        echo "에러: Docker Compose 플러그인 또는 docker-compose 명령어가 누락되었습니다."
        exit 1
    fi
fi

echo "[2/5] 호스트 OS 기존 서비스 종료 (포트 80 및 8080 해제)"
# 80 포트 충돌 방지: 호스트 OS의 Nginx 정지 및 비활성화
if systemctl is-active --quiet nginx; then
    echo "호스트 OS에 실행 중인 기존 Nginx 서비스를 중지합니다..."
    systemctl stop nginx
    systemctl disable nginx
fi

# 호스트 OS의 기존 Gunicorn 서비스(stock) 정지 및 비활성화
if systemctl is-active --quiet stock; then
    echo "호스트 OS에 실행 중인 기존 Gunicorn(stock) 서비스를 중지합니다..."
    systemctl stop stock
    systemctl disable stock
fi

echo "[3/5] 프로젝트 소스코드 최신화"
if [ ! -d "$REPO_DIR" ]; then
    echo "레파지토리를 새로 클론합니다..."
    sudo -u $APP_USER git clone https://github.com/shinC/stock_dashboard.git $REPO_DIR
else
    echo "기존 레파지토리 디렉토리에서 소스코드를 업데이트합니다..."
    cd $REPO_DIR
    sudo -u $APP_USER git fetch --all
    sudo -u $APP_USER git reset --hard origin/main
fi

echo "[4/5] Docker Compose 컨테이너 빌드 및 백그라운드 구동"
cd $REPO_DIR

# 만약 .env 파일이 없다면, 템플릿 또는 빈 환경 설정 생성 (수동 보완 유도)
if [ ! -f ".env" ]; then
    echo "경고: .env 파일이 존재하지 않습니다. 빈 템플릿을 생성합니다."
    sudo -u $APP_USER touch .env
fi

echo "도커 컨테이너 빌드 및 시작 (운영 HTTPS 모드)..."
./stop.sh --prod
./run.sh --prod

echo "[5/5] 최종 배포 상태 검증"
sleep 5
docker compose -f docker-compose.prod.yml ps

echo "========================================================="
echo " 배포가 성공적으로 완료되었습니다!"
echo " 이제 브라우저에서 서버 도메인(https://stock.tripods.kr/)으로 접속하세요."
echo " 로그 확인: cd $REPO_DIR && sudo docker compose -f docker-compose.prod.yml logs -f"
echo "========================================================="
