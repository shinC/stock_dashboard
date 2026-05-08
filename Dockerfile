# 1. 베이스 이미지 설정 (경량화된 파이썬 3.9 이미지 사용)
FROM python:3.9-slim

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 시스템 의존성 설치 (gevent 빌드 등에 필요한 도구들)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 4. 의존성 파일 복사 및 설치 (캐싱 효율을 위해 먼저 수행)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 5. 소스코드 및 관련 디렉토리 복사
COPY src/ ./src/
COPY frontend/ ./frontend/

# 6. 환경변수 설정 (파이썬 로그 출력 실시간 확인용)
ENV PYTHONUNBUFFERED=1

# 7. Gunicorn 실행 (gevent 워커 사용, 8080 포트 바인딩)
CMD ["gunicorn", "--workers", "1", "--worker-class", "gevent", "--bind", "0.0.0.0:8080", "--chdir", "src", "app:app"]
