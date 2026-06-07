#!/bin/bash
# 주식 종합 대시보드 구동 스크립트 (도커 컴포즈 기본 / 로컬 venv 옵션 제공)

# 인자값 파싱
RUN_LOCAL=false
for arg in "$@"; do
    if [ "$arg" = "--local" ]; then
        RUN_LOCAL=true
    fi
done

if [ "$RUN_LOCAL" = true ]; then
    echo "================================================="
    echo " [로컬 venv 방식] 호스트 OS에서 직접 서버를 구동합니다."
    echo "================================================="
    # 기존 백그라운드 서버 종료
    if [ -f stop.sh ]; then
        ./stop.sh --local
    else
        fuser -k 8080/tcp 2>/dev/null
    fi

    echo "가상환경(venv)을 확인합니다..."
    # venv 디렉토리가 없거나 python 바이너리가 유효하지 않으면 재생성
    RECREATE_VENV=false
    if [ ! -d "venv" ]; then
        RECREATE_VENV=true
    elif [ ! -f "venv/bin/python" ]; then
        RECREATE_VENV=true
    else
        # venv의 python이 실제로 실행 가능한지 확인 (Broken symlink 체크)
        ./venv/bin/python --version > /dev/null 2>&1
        if [ $? -ne 0 ]; then
            RECREATE_VENV=true
        fi
    fi

    if [ "$RECREATE_VENV" = true ]; then
        echo "venv가 없거나 손상되어 새로 생성합니다..."
        rm -rf venv
        python3 -m venv venv
        if [ $? -ne 0 ]; then
            echo "에러: 가상환경 생성에 실패했습니다. python3-venv 패키지가 설치되어 있는지 확인해주세요."
            exit 1
        fi
    fi

    # 가상환경 활성화
    source venv/bin/activate

    # 가상환경이 정상적으로 활성화되었는지 확인
    if [ -z "$VIRTUAL_ENV" ]; then
        echo "에러: 가상환경 활성화에 실패했습니다."
        exit 1
    fi

    echo "의존성 패키지를 확인하고 설치합니다..."
    ./venv/bin/python -m pip install --upgrade pip
    ./venv/bin/python -m pip install -r requirements.txt

    echo "백엔드 서버를 백그라운드에서 실행합니다..."
    nohup ./venv/bin/python -u src/app.py > server.log 2>&1 &
    echo $! > server.pid

    echo "서버를 시작하는 중입니다 (최대 20초 대기)..."
    MAX_RETRIES=40 # 0.5초 * 40 = 20초
    RETRY_COUNT=0
    PORT_OPEN=false

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if timeout 1 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/8080" > /dev/null 2>&1; then
            PORT_OPEN=true
            break
        fi
        if [ $((RETRY_COUNT % 2)) -eq 0 ]; then
            echo -n "."
        fi
        sleep 0.5
        RETRY_COUNT=$((RETRY_COUNT + 1))
    done
    echo ""

    if [ "$PORT_OPEN" = true ]; then
        echo "------------------------------------------------"
        echo "서버가 성공적으로 시작되었습니다! (PID: $(cat server.pid))"
        echo "접속 주소: http://localhost:8080"
        echo "로그 확인: tail -f server.log"
        echo "서버 종료: ./stop.sh --local"
        echo "------------------------------------------------"
    else
        if ps -p $(cat server.pid) > /dev/null 2>&1; then
            echo "경고: 서버 프로세스($(cat server.pid))는 실행 중이나 8080 포트가 20초 내에 열리지 않았습니다."
        else
            echo "에러: 서버 프로세스가 시작 직후 종료되었습니다."
            echo "server.log를 확인하여 에러 원인을 파악하세요."
        fi
        echo "--- 최근 로그 (server.log) ---"
        tail -n 10 server.log
        echo "---------------------------"
    fi

else
    echo "================================================="
    echo " [도커 컴포즈 방식] Docker 컨테이너를 구동합니다."
    echo "================================================="
    
    # 기존 도커 컨테이너 종료
    if [ -f stop.sh ]; then
        ./stop.sh
    fi

    # docker compose 지원 여부에 따라 명령어 설정
    DOCKER_COMPOSE_CMD="docker compose"
    if ! docker compose version >/dev/null 2>&1; then
        if docker-compose version >/dev/null 2>&1; then
            DOCKER_COMPOSE_CMD="docker-compose"
        else
            echo "에러: 도커(Docker) 또는 Docker Compose가 설치되어 있지 않습니다."
            echo "로컬에서 도커 없이 직접 구동하려면 다음 옵션을 사용하세요: ./run.sh --local"
            exit 1
        fi
    fi

    echo "도커 컴포즈 빌드 및 백그라운드 실행..."
    $DOCKER_COMPOSE_CMD up -d --build

    echo "컨테이너 상태 확인..."
    sleep 3
    $DOCKER_COMPOSE_CMD ps

    echo "------------------------------------------------"
    echo "도커 기반 서버 기동이 성공적으로 호출되었습니다!"
    echo "접속 주소: http://localhost (Nginx 포트 80)"
    echo "로그 확인: $DOCKER_COMPOSE_CMD logs -f"
    echo "서버 종료: ./stop.sh"
    echo "------------------------------------------------"
fi
