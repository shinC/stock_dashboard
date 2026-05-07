# Server Environment & Deployment Guide

이 문서는 프로젝트의 실행 환경과 배포 시 고려해야 할 기술적 세부 사항을 기록합니다. AI 에이전트가 환경을 오해하지 않도록 최신 상태를 유지하십시오.

## 1. 시스템 정보 (Current)
- **OS**: macOS (Darwin)
- **Architecture**: arm64 (Apple Silicon)
- **Default Python**: `/usr/bin/python3` (v3.9.6)
- **Project Path**: `/Users/taeheonshin/dev/python/stock_dashboard`

## 2. 가상환경 (venv) 구성
- **경로**: `{ProjectRoot}/venv`
- **상태**: Python 3.9 기반으로 구성됨.
- **주의사항**: 이 시스템은 PEP 668(externally-managed-environment)이 적용되어 있어, **반드시 venv 내부의 pip를 사용**해야 합니다. 시스템 전역 pip 사용 시 에러가 발생합니다.
- **복구 로직**: `run.sh`에 인터프리터 유효성 검사 로직이 포함되어 있어, 파이썬 업데이트 등으로 `venv`가 깨질 경우 자동으로 재생성합니다.

## 3. 네트워크 및 포트
- **Backend Port**: `8080` (Flask)
- **Frontend**: `../frontend` 디렉토리를 Flask의 정적 파일로 서빙
- **Access URL**: `http://localhost:8080` (또는 설정된 도메인)

## 4. 주요 실행 스크립트
- **`./run.sh`**: 가상환경 확인 -> 의존성 설치 -> 백그라운드 실행 (`nohup`)
- **`./stop.sh`**: PID 파일을 찾아 서버 종료

## 5. 배포 및 업데이트 절차
1. **코드 업데이트**: `git pull --rebase origin main` (이력 충돌 방지)
2. **서버 재실행**: `./run.sh` 실행 (스크립트 내부에서 venv 및 패키지 체크 자동 수행)
3. **로그 확인**: `tail -f server.log`

## 6. 환경 파악 명령어 (Troubleshooting)
문제가 발생할 경우 다음 명령어로 환경을 재확인하십시오.
```bash
which python3 && python3 --version
./venv/bin/python --version
pip --version (venv 활성화 상태에서)
lsof -i :8080
```
