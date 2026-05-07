#!/bin/bash
# 주식 종합 대시보드 실행 스크립트 (백그라운드 모드)

# 기존 서버가 실행 중이라면 종료
if [ -f stop.sh ]; then
    ./stop.sh
else
    fuser -k 8080/tcp 2>/dev/null
fi

echo "가상환경(venv)을 확인합니다..."
# venv 디렉토리가 없거나 인터프리터가 깨져있으면(Bad interpreter) 새로 생성
if [ ! -d "venv" ] || ! ./venv/bin/python --version > /dev/null 2>&1; then
    echo "venv가 없거나 인터프리터가 깨져 있어 새로 생성합니다 (python3 -m venv venv)..."
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
# 로그는 server.log에 기록됨
nohup ./venv/bin/python src/app.py > server.log 2>&1 &
echo $! > server.pid

echo "------------------------------------------------"
echo "서버가 백그라운드에서 실행 중입니다. (PID: $(cat server.pid))"
echo "로그 확인: tail -f server.log"
echo "서버 종료: ./stop.sh"
echo "------------------------------------------------"
