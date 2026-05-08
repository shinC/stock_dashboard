# Docker Deployment Guide

이 문서는 프로젝트의 도커(Docker) 환경 구성 및 배포 방법을 설명합니다.

## 1. 아키텍처 (Architecture)
본 프로젝트는 **Nginx**와 **Gunicorn(WAS)**을 각각 독립된 컨테이너로 분리하여 운영합니다.

- **Nginx Container**: 외부의 80 포트 요청을 받아 내부망의 앱 컨테이너로 전달 (리버스 프록시).
- **App Container**: Python 3.9 환경에서 Gunicorn 엔진을 사용하여 Flask 앱 실행.
- **Docker Compose**: 두 컨테이너의 실행, 네트워크 연결, 볼륨 매핑을 관리.

## 2. 주요 파일 설명
- `Dockerfile`: 파이썬 앱 이미지를 빌드하기 위한 레시피.
- `docker-compose.yml`: Nginx와 앱 컨테이너의 조립 및 실행 설정.
- `nginx/default.conf`: Nginx 컨테이너 내부의 가상 호스트 설정.

## 3. 로컬 개발 및 테스트 (OrbStack/Docker)

### 서버 실행
```bash
# 컨테이너 빌드 및 백그라운드 실행
docker-compose up -d --build
```

### 서버 상태 확인
```bash
# 실행 중인 컨테이너 확인
docker-compose ps

# 실시간 로그 확인
docker-compose logs -f
```

### 서버 종료
```bash
docker-compose down
```

## 4. 운영 서버(Oracle Cloud) 배포 절차
운영 서버에 도커가 설치되어 있다는 전제하에 다음 과정을 수행합니다.

1. **코드 업데이트**: `git pull origin main`
2. **배포 실행**: `docker-compose up -d --build`
3. **완료**: 도커가 알아서 이미지를 빌드하고, 기존 컨테이너를 새 컨테이너로 무중단에 가깝게 교체합니다.

## 5. 도커 도입의 장점
- **환경 일관성**: 개발자의 맥(OrbStack)과 운영 서버(Ubuntu)의 환경이 100% 일치함.
- **자동 복구**: `restart: always` 옵션으로 인해 프로세스 다운 시 자동 재시작.
- **의존성 격리**: 시스템 파이썬과 완전히 분리되어 패키지 충돌이 원천 차단됨.
- **간편한 업데이트**: `docker-compose` 명령어 하나로 빌드부터 재시작까지 자동화.
