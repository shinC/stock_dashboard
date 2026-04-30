#!/bin/bash
# 이 스크립트는 Ubuntu 22.04 서버에 복사하여 실행하기 위한 배포 스크립트입니다.
# 사용법: sudo bash deploy.sh

set -e

REPO_DIR="/home/ubuntu/stock_dashboard"
APP_USER="ubuntu"
PORT="8080"

echo "==========================================="
echo " 주식 대시보드 서버 배포 자동화 스크립트"
echo "==========================================="

echo "[1/5] 패키지 업데이트 및 의존성 설치"
apt update
apt install -y python3-pip python3-venv nginx git curl

echo "[2/5] 프로젝트 소스코드 설정"
if [ ! -d "$REPO_DIR" ]; then
    echo "레파지토리를 클론합니다..."
    sudo -u $APP_USER git clone https://github.com/shinC/stock_dashboard.git $REPO_DIR
else
    echo "기존 레파지토리를 업데이트합니다..."
    cd $REPO_DIR
    sudo -u $APP_USER git fetch --all
    sudo -u $APP_USER git reset --hard origin/main
fi

echo "[3/5] Python 가상환경 구성 및 패키지 설치"
cd $REPO_DIR
sudo -u $APP_USER bash -c "
    echo '기존 가상환경 초기화 중...'
    rm -rf venv
    python3 -m venv venv
    ./venv/bin/python3 -m pip install --upgrade pip
    ./venv/bin/python3 -m pip install -r requirements.txt
"

echo "[4/5] Gunicorn Systemd 서비스 등록"
cat <<EOF > /etc/systemd/system/stock.service
[Unit]
Description=Gunicorn daemon for Stock Dashboard
After=network.target

[Service]
User=$APP_USER
Group=www-data
WorkingDirectory=$REPO_DIR
Environment="PATH=$REPO_DIR/venv/bin"
# Gunicorn 실행 (src.app:app 모듈 지정, 8080 포트 바인딩)
ExecStart=$REPO_DIR/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8080 --chdir $REPO_DIR/src app:app

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable stock
systemctl restart stock

echo "[5/5] Nginx 리버스 프록시 설정 (80 포트)"
cat <<EOF > /etc/nginx/sites-available/stock
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 기본 Nginx 설정 해제 후 새 설정 링크
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi
if [ ! -f /etc/nginx/sites-enabled/stock ]; then
    ln -s /etc/nginx/sites-available/stock /etc/nginx/sites-enabled/
fi

nginx -t
systemctl restart nginx

echo "==========================================="
echo " 배포가 성공적으로 완료되었습니다!"
echo " 이제 브라우저에서 http://168.107.13.219 로 접속해 보세요."
echo "==========================================="
