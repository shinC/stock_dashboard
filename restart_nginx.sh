#!/bin/bash
# Nginx 재시작 스크립트

echo "Nginx 설정 파일을 검사합니다..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx 설표 검사 성공. 서버를 재시작합니다..."
    sudo systemctl restart nginx
    echo "Nginx 재시작 완료."
else
    echo "Nginx 설정에 오류가 있습니다. 설정을 확인해 주세요."
    exit 1
fi
