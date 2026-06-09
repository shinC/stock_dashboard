#!/bin/bash
# 주식 대시보드 서버 종료 스크립트 (도커 컴포즈 기본 / 로컬 venv 옵션 제공)

# 인자값 파싱
STOP_LOCAL=false
STOP_PROD=false
for arg in "$@"; do
    if [ "$arg" = "--local" ]; then
        STOP_LOCAL=true
    elif [ "$arg" = "--prod" ]; then
        STOP_PROD=true
    fi
done

if [ "$STOP_LOCAL" = true ]; then
    echo "================================================="
    echo " [로컬 venv 방식] 호스트 OS에서 직접 실행된 서버를 종료합니다."
    echo "================================================="
    echo "주식 대시보드 서버(8080 포트)를 종료합니다..."

    # PID 파일이 있으면 해당 PID로 종료 시도
    if [ -f server.pid ]; then
        PID=$(cat server.pid)
        if ps -p $PID > /dev/null; then
            kill $PID
            echo "PID $PID 프로세스에 종료 신호를 보냈습니다."
        fi
        rm server.pid
    fi

    # 추가적으로 8080 포트를 점유 중인 프로세스 강제 종료
    if command -v fuser >/dev/null 2>&1; then
        fuser -k 8080/tcp 2>/dev/null
    fi

    # lsof를 이용한 추가 확인 및 종료 (fuser가 실패하거나 없는 경우 대비)
    if command -v lsof >/dev/null 2>&1; then
        PIDS=$(lsof -t -i:8080)
        if [ ! -z "$PIDS" ]; then
            echo "8080 포트를 점유 중인 프로세스($PIDS)를 종료합니다..."
            kill -9 $PIDS 2>/dev/null
        fi
    fi

    echo "서버 종료 처리가 완료되었습니다."

else
    echo "================================================="
    echo " [도커 컴포즈 방식] Docker 컨테이너 환경을 종료합니다."
    echo "================================================="

    # docker compose 지원 여부에 따라 명령어 설정
    DOCKER_COMPOSE_CMD="docker compose"
    if ! docker compose version >/dev/null 2>&1; then
        if docker-compose version >/dev/null 2>&1; then
            DOCKER_COMPOSE_CMD="docker-compose"
        else
            echo "에러: 도커(Docker) 또는 Docker Compose가 설치되어 있지 않습니다."
            echo "로컬에서 직접 구동 중인 백업 서버 종료 시: ./stop.sh --local"
            exit 1
        fi
    fi

    COMPOSE_FILE_ARG=""
    if [ "$STOP_PROD" = true ]; then
        echo " [운영 모드] docker-compose.prod.yml 컨테이너 환경을 종료합니다."
        COMPOSE_FILE_ARG="-f docker-compose.prod.yml"
    fi

    echo "도커 컨테이너를 정지하고 네트워크를 제거합니다..."
    $DOCKER_COMPOSE_CMD $COMPOSE_FILE_ARG down

    echo "컨테이너 종료 처리가 완료되었습니다."
fi
