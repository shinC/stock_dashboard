#!/bin/bash
# 주식 대시보드 서버 종료 스크립트

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
fuser -k 8080/tcp 2>/dev/null

echo "서버 종료 처리가 완료되었습니다."
