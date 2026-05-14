#!/bin/bash
# 주식 종합 대시보드 실행 스크립트 (백그라운드 모드)

# 기존 서버가 실행 중이라면 종료
if [ -f stop.sh ]; then
    ./stop.sh
else
    fuser -k 8080/tcp 2>/dev/null
fi

echo "가상환경(venv)을 확인합니다..."
<<<<<<< HEAD
# venv 디렉토리가 없거나 인터프리터가 깨져있으면(Bad interpreter) 새로 생성
if [ ! -d "venv" ] || ! ./venv/bin/python --version > /dev/null 2>&1; then
    echo "venv가 없거나 인터프리터가 깨져 있어 새로 생성합니다 (python3 -m venv venv)..."
=======
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
>>>>>>> 546e668 (주도테마에서 거래대금 가져오는 부붐 키움API로 수정)
    rm -rf venv
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "에러: 가상환경 생성에 실패했습니다. python3-venv 패키지가 설치되어 있는지 확인해주세요."
        exit 1
    fi
fi

# 가상환경 활성화 (필요한 경우)
source venv/bin/activate

# 가상환경이 정상적으로 활성화되었는지 확인
if [ -z "$VIRTUAL_ENV" ]; then
    echo "에러: 가상환경 활성화에 실패했습니다."
    exit 1
fi

echo "의존성 패키지를 확인하고 설치합니다..."
# 가상환경 내부의 pip를 명시적으로 사용
./venv/bin/python -m pip install --upgrade pip
./venv/bin/python -m pip install -r requirements.txt

echo "백엔드 서버를 백그라운드에서 실행합니다..."
# nohup을 사용하여 터미널이 종료되어도 프로세스가 유지되도록 설정
# -u 옵션으로 버퍼링 없이 즉시 로그 기록 (venv 내부 파이썬 사용)
nohup ./venv/bin/python -u src/app.py > server.log 2>&1 &
echo $! > server.pid

echo "서버를 시작하는 중입니다 (최대 20초 대기)..."
# 서버가 정상적으로 포트를 열었는지 최대 20초간 확인
MAX_RETRIES=40 # 0.5초 * 40 = 20초
RETRY_COUNT=0
PORT_OPEN=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # bash의 내장 기능을 사용하여 포트 오픈 확인 (lsof보다 빠르고 확실함)
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
echo "" # 줄바꿈

if [ "$PORT_OPEN" = true ]; then
    echo "------------------------------------------------"
    echo "서버가 성공적으로 시작되었습니다! (PID: $(cat server.pid))"
    echo "접속 주소: http://localhost:8080"
    echo "로그 확인: tail -f server.log"
    echo "서버 종료: ./stop.sh"
    echo "------------------------------------------------"
else
    if ps -p $(cat server.pid) > /dev/null 2>&1; then
        echo "경고: 서버 프로세스($(cat server.pid))는 실행 중이나 8080 포트가 20초 내에 열리지 않았습니다."
        echo "초기 데이터 수집(Market Data Fetch)이 진행 중이거나, 로컬 호스트 접근에 문제가 있을 수 있습니다."
    else
        echo "에러: 서버 프로세스가 시작 직후 종료되었습니다."
        echo "server.log를 확인하여 에러 원인을 파악하세요."
    fi
    echo "--- 최근 로그 (server.log) ---"
    tail -n 10 server.log
    echo "---------------------------"
fi
