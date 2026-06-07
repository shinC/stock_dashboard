# Ubuntu 서버 Docker 기반 통합 배포 가이드

이 문서는 Nginx와 WAS(Flask/Gunicorn)를 모두 도커 컨테이너화하여, 서비스용 Ubuntu 서버(Ubuntu 22.04 LTS)에 Docker Compose 기반으로 통합 배포하고 유지보수하는 방법을 안내합니다.

## 1. 배포 환경 요약
- **OS**: Ubuntu 22.04 LTS (ARM64 등)
- **Container Engine**: Docker / Docker Compose
- **Web Server Container**: Nginx (리버스 프록시, 외부 포트 80 -> 내부 포트 80)
- **App Server Container**: Gunicorn + Flask (내부 포트 8080)

## 2. 배포 전 필수 확인 사항 (포트 충돌 방지)

> [!IMPORTANT]
> **기존 호스트 OS Nginx 서비스 중지**
> - 외부 80 포트를 Nginx 도커 컨테이너가 바인딩하여 사용할 예정이므로, 만약 Ubuntu 호스트 OS에 직접 Nginx가 활성화되어 있다면 반드시 먼저 중지하고 비활성화해야 포트 충돌(Address already in use)이 발생하지 않습니다.
> ```bash
> sudo systemctl stop nginx
> sudo systemctl disable nginx
> ```

## 3. 최초 자동 배포 방법

서버에 SSH로 접속한 뒤 아래 명령어를 순서대로 실행하시면, 환경 구성부터 컨테이너 빌드 및 기동까지 자동으로 완료됩니다.

```bash
# 1. 서버에 접속
ssh -i "본인의_프라이빗_키.pem" ubuntu@168.107.13.219

# 2. 깃허브 레파지토리에서 배포 스크립트를 다운로드하여 실행
wget -O deploy.sh https://raw.githubusercontent.com/shinC/stock_dashboard/main/deploy.sh
sudo bash deploy.sh
```

> 위 명령어가 성공적으로 완료되면 브라우저에서 `http://168.107.13.219` 로 접속하여 대시보드가 정상 동작하는지 확인합니다.

---

## 4. 코드 수정 후 서버 업데이트 방법

로컬(VS Code)에서 코드를 수정한 뒤 깃허브에 푸시(Push)했다면, 서버에서도 변경 사항을 가져와 빌드를 새로 해주어야 합니다.

서버에 접속하여 아래 명령어를 실행하세요:

```bash
cd ~/stock_dashboard
git pull origin main

# Docker Compose 빌드 및 재생성 (무중단에 가깝게 재기동됨)
docker-compose up -d --build
```

---

## 5. 유용한 도커 상태 확인 명령어

**컨테이너 구동 상태 확인**
```bash
docker-compose ps
```

**실시간 앱/웹 서버 통합 로그 확인**
```bash
docker-compose logs -f
```

**특정 컨테이너 실시간 로그 확인 (예: 백엔드 앱만)**
```bash
docker-compose logs -f app
```

**도커 컨테이너 및 볼륨 전체 정리 (완전 재시작 시)**
```bash
docker-compose down
```
