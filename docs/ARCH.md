# 아키텍처 설계서 (ARCH)

## 1. 시스템 개요
본 프로젝트는 Python과 Streamlit을 기반으로 하는 단일 페이지 대시보드(SPA) 애플리케이션입니다. 사용자에게 주식 시장의 주요 지수 및 당일 주도 테마 정보를 실시간/일별 데이터 기반으로 제공합니다.

## 2. 기술 스택 (Tech Stack)
- **Frontend / UI:** HTML/CSS/Vanilla JS (이전 Streamlit에서 전환)
- **Backend / Logic:** Python 3
- **Data Source / API:**
  - `FinanceDataReader`: 미국/국내 시장 주요 지표 및 지수 수집
  - `Finviz` API: 미국 주식 섹터 및 하위 테마 실시간 등락률 데이터 수집
  - 웹 스크래핑/크롤링 (`requests`, `BeautifulSoup` 등): 당일 테마 정보, 상승 테마 갯수, 거래대금 데이터 수집 (네이버 금융 등 활용)
  - TradingView Search API (Backend Proxy): 심볼 검색 (한국어, 영어, 티커 완벽 지원, 자체 사전 불필요)
- **Data Processing:** `pandas`, `numpy`
- **Caching:** `cachetools`, Streamlit 내장 캐싱 (`st.cache_data`)
- **Environment Management:** `python-dotenv`

## 3. 폴더 구조 (Folder Structure)
```text
stock_dashboard/
├── docs/                   # 기획 및 아키텍처 문서
│   ├── PRD.md
│   └── ARCH.md
├── src/                    # 소스 코드 디렉토리
│   ├── app.py              # Flask 메인 엔트리포인트 및 API 라우터
│   ├── data_fetcher.py     # 외부 API/크롤링 기반 데이터 수집 모듈
│   ├── us_sector_fetcher.py# 미국 시장 섹터 및 테마 시황 수집 로직
│   ├── theme_analyzer.py   # 주도 테마 선정 및 데이터 가공 로직
│   └── sector_mapping.json # 미국 주식 테마 매핑 설정 파일
├── tests/                  # 테스트 디렉토리
│   ├── test_data.py        # 데이터 수집 관련 단위 테스트
│   └── test_theme.py       # 테마 분석 로직 관련 단위 테스트
├── data/                   # 로컬 데이터 캐시 저장 (필요시)
├── requirements.txt        # 의존성 패키지 목록
└── .env                    # 환경 변수 (API 키, URL 설정 등)
```

## 4. 데이터 흐름 (Data Flow)
1. **요청:** 사용자가 웹 브라우저를 통해 Streamlit 앱 접속.
2. **조회:** `main.py` 구동 시 `data_fetcher.py`를 호출하여 금융 데이터 API 및 스크래핑 요청 실행 (결과값은 메모리에 캐싱됨).
3. **분석:** 수집된 데이터를 바탕으로 `theme_analyzer.py`가 거래대금, 평균 등락률, 상승 종목 수를 분석하여 당일 상위 주도 테마 산출.
4. **렌더링:** `app.js`를 활용해 각 인덱스의 하루치 시계열 데이터를 미니 차트(Line chart) 형태로 그리고, 주도 테마를 표(Table) 형태로 렌더링. 새로 추가된 '차트' 탭은 트레이딩뷰 위젯 임베드 스크립트를 동적으로 주입하여 처리.
5. **종목 검색:** '차트' 탭에서 종목 검색 시 `/api/search-symbol` 엔드포인트를 호출하여 결과를 가져오고, 프론트엔드에서 심볼 배열을 업데이트한 후 트레이딩뷰 위젯을 재렌더링.

## 5. 핵심 로직 상세 (주도 테마 분석 알고리즘)
- **대상 데이터:** 당일 활성화된 테마 리스트 및 테마 내 편입 종목의 시세 정보.
- **평가 지표:**
  1. **테마 상승률:** 테마 내 종목들의 평균 등락률.
  2. **거래대금:** 테마 내 종목들의 당일 거래대금 합계.
  3. **상승 종목 수:** 테마 내에서 상승 마감(또는 상승 중)인 종목의 개수 및 비율.
- **산출 방식:** 위 세 가지 지표를 표준화하여 종합 점수(Composite Score)를 매기고, 상위 N개의 테마를 선정.
- **출력 포맷:** DataFrame 형태로 가공되어 UI 테이블에 바인딩.
