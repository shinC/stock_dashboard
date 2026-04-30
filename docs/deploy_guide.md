# Ubuntu 서버 배포 가이드

이 문서는 로컬 환경에서 완성된 주식 대시보드를 실제 서비스용 Ubuntu 서버(Ubuntu 22.04 LTS)에 배포하고 유지보수하는 방법을 안내합니다.

## 1. 배포 환경 요약
- **OS**: Ubuntu 22.04 LTS (ARM64)
- **Web Server**: Nginx (리버스 프록시, 포트 80)
- **WSGI / App Server**: Gunicorn (포트 8080)
- **Framework**: Python Flask
- **서비스 상태 관리**: Systemd (`stock.service`)

## 2. 최초 자동 배포 방법

서버에 SSH로 접속한 뒤 아래 명령어를 순서대로 실행하시면, 환경 구성부터 Nginx 라우팅까지 자동으로 설정됩니다.

```bash
# 1. 서버에 접속
ssh -i "본인의_프라이빗_키.pem" ubuntu@168.107.13.219

# 2. 깃허브 레파지토리에서 배포 스크립트를 다운로드하여 실행
wget -O deploy.sh https://raw.githubusercontent.com/shinC/stock_dashboard/main/deploy.sh
sudo bash deploy.sh
```

> 위 명령어가 성공적으로 완료되면 브라우저에서 `http://168.107.13.219` 로 접속하여 대시보드가 정상 동작하는지 확인합니다.

---

## 3. 코드 수정 후 서버 업데이트 방법

로컬(VS Code)에서 코드를 수정한 뒤 깃허브에 푸시(Push)했다면, 서버에서도 변경 사항을 가져와야 합니다. 

서버에 접속하여 아래 명령어를 실행하세요:

```bash
cd ~/stock_dashboard
git pull origin main

# 파이썬 패키지가 추가된 경우
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Gunicorn 서비스 재시작 (코드 변경 사항 반영)
sudo systemctl restart stock
```

---

## 4. 유용한 상태 확인 명령어

**웹 서버(Nginx) 상태 확인**
```bash
sudo systemctl status nginx
```

**앱 서버(Gunicorn) 상태 및 로그 확인**
```bash
sudo systemctl status stock
sudo journalctl -u stock -f -n 50  # 실시간 로그 마지막 50줄 보기
```

**Nginx 설정 파일 검사 및 재시작**
```bash
sudo nginx -t
sudo systemctl restart nginx
```
