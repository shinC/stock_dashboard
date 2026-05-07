#!/bin/bash
# 주식 종합 대시보드 실행 스크립트 (백그라운드 모드)

# 기존 서버가 실행 중이라면 종료
if [ -f stop.sh ]; then
    ./stop.sh
else
    fuser -k 8080/tcp 2>/dev/null
fi

echo "가상환경(venv)을 활성화합니다..."
source venv/bin/activate

echo "의존성 패키지를 확인하고 설치합니다..."
pip install -r requirements.txt

echo "백엔드 서버를 백그라운드에서 실행합니다..."
# nohup을 사용하여 터미널이 종료되어도 프로세스가 유지되도록 설정
# 로그는 server.log에 기록됨
nohup python src/app.py > server.log 2>&1 &
echo $! > server.pid

echo "------------------------------------------------"
echo "서버가 백그라운드에서 실행 중입니다. (PID: $(cat server.pid))"
echo "로그 확인: tail -f server.log"
echo "서버 종료: ./stop.sh"
echo "로컬 접속: http://127.0.0.1:8080"
echo "------------------------------------------------"
