# Server Environment & Deployment Guide

이 문서는 프로젝트의 실행 환경(로컬 및 운영 서버)과 배포 시 고려해야 할 기술적 세부 사항을 기록합니다.

---

## 1. 로컬 개발 환경 (Local Environment)
- **OS**: macOS (Darwin, Apple Silicon)
- **Python**: `/usr/bin/python3` (v3.9.6)
- **가상환경**: `{ProjectRoot}/venv` (Python 3.9 기반)
- **실행 방식**: `./run.sh`를 통한 백그라운드 실행 (`nohup python src/app.py`)
- **접속**: `http://localhost:8080`
- **특이사항**: PEP 668 적용 환경으로, 반드시 venv 내부의 pip/python을 사용해야 함.

---

## 2. 운영 서버 환경 (Production - Oracle Cloud)
- **OS**: Ubuntu 22.04 LTS
- **IP**: `168.107.13.219`
- **프로젝트 경로**: `/home/ubuntu/stock_dashboard`
- **서버 구성 (Infrastructure)**:
  - **Web Server (Nginx)**: 80 포트 리버스 프록시 역할. 보안 및 정적 파일 처리 보조.
  - **WAS (Gunicorn)**: 파이썬 앱을 실행하는 실제 엔진.
    - **Worker**: `gevent` 워커 사용 (실시간 데이터 및 비동기 처리에 최적화)
    - **Port**: 내부 8080 포트 사용
  - **Process Manager**: `systemd` (`stock.service`)를 통해 서버 부팅 시 자동 실행 및 장애 시 자동 재시작.

---

## 3. 주요 스크립트 및 서비스 관리
- **로컬 전용**:
  - `./run.sh`: 가상환경 체크 및 백그라운드 실행.
  - `./stop.sh`: 로컬 프로세스 종료.
- **운영 서버 전용**:
  - `sudo systemctl restart stock`: Gunicorn 서버 재시작.
  - `sudo systemctl restart nginx`: Nginx 설정 변경 시 재시작.
  - `tail -f /var/log/nginx/error.log`: Nginx 에러 로그 확인.
  - `journalctl -u stock -f`: Gunicorn(App) 실시간 로그 확인.

---

## 4. 배포 프로세스 (CI/CD)

### 방식 A: 도커 배포 (권장 - Recommended)
1. 로컬에서 작업 완료 후 `git push origin main`.
2. 운영 서버에서 `git pull origin main`.
3. `docker-compose up -d --build` 실행.
   - 도커가 이미지 빌드, 패키지 설치, 컨테이너 교체를 자동으로 수행.

### 방식 B: 수동 배포 (기존 방식)
1. 로컬에서 작업 완료 후 `git push origin main`.
2. 운영 서버에 접속하여 `git pull --rebase`.
3. `sudo systemctl restart stock`으로 서버 재시작.
   - (의존성 변경 시 `venv` 내 패키지 재설치 필요)

---

## 5. 관련 문서
- [DOCKER.md](file:///Users/taeheonshin/dev/python/stock_dashboard/docs/DOCKER.md): 도커 환경 구성 및 상세 명령어 가이드.
- [ARCH.md](file:///Users/taeheonshin/dev/python/stock_dashboard/docs/ARCH.md): 시스템 전체 구조 및 로직 설명.

---

## 6. 환경 파악 명령어 (Troubleshooting)
문제가 발생할 경우 다음 명령어로 환경을 재확인하십시오.
- **도커 로그 확인**: `docker-compose logs -f`
- **포트 확인**: `lsof -i :8080` (내부), `lsof -i :80` (외부)
- **서비스 상태**: `systemctl status stock` (수동 배포 시)
- **Nginx 설정 검사**: `nginx -t`
