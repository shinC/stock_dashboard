#!/bin/bash
# 빠른 업데이트 및 서버 재시작 스크립트

echo "GitHub에서 최신 코드를 가져옵니다..."
sudo -u ubuntu git pull origin main

echo "stock 서비스를 재시작합니다..."
sudo systemctl restart stock

echo "업데이트가 완료되었습니다!"
