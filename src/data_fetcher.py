import FinanceDataReader as fdr
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import cachetools.func
import requests

# 미국 및 국내 지표 매핑 (yfinance 기준, intraday 용도)
TICKER_MAP = {
    'S&P 500': '^GSPC',
    'NASDAQ': '^IXIC',
    'Dow Jones': '^DJI',
    'NASDAQ 100': '^NDX',
    'Russell 2000': '^RUT',
    'Philadelphia Semi': '^SOX',
    'WTI': 'CL=F',
    'VIX': '^VIX',
    'KOSPI': '^KS11',
    'KOSDAQ': '^KQ11',
    'KOSPI 200': '^KS200',
    'KOSDAQ 150': '^KQ150',
}

def get_naver_index_summary(symbol):
    """네이버 실시간 API를 통해 국내 지수 요약 정보를 가져옵니다."""
    url = f"https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:{symbol}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get('resultCode') == 'success':
                datas = data['result']['areas'][0]['datas']
                target = next((item for item in datas if item['cd'] == symbol), None)
                if target:
                    # Naver API의 nv, cv 값은 100이 곱해진 정수 형태로 오는 경우가 많음
                    close = float(target['nv']) / 100.0
                    open_val = float(target['ov']) / 100.0
                    change_val = float(target['cv']) / 100.0
                    # rf: 2 (상승), 3 (보합), 5 (하락)
                    if target['rf'] == '5':
                        prev_close = close + change_val
                    else:
                        prev_close = close - change_val
                        
                    return {
                        'name': symbol,
                        'open': open_val,
                        'close': close,
                        'prev_close': prev_close,
                        'change_pct': float(target['cr'])
                    }
        return None
    except Exception as e:
        print(f"Error fetching Naver index summary for {symbol}: {e}")
        return None


@cachetools.func.ttl_cache(maxsize=128, ttl=60)
def get_intraday_data(name: str):
    """
    주어진 지표의 가장 최근 '1거래일' 동안의 흐름(15분 단위)을 가져옵니다.
    실시간 데이터가 아닌, 가장 최근에 완료된 거래일의 전체 흐름을 보여줍니다.
    """
    ticker = TICKER_MAP.get(name)
    if not ticker:
        return pd.Series(dtype=float)
    try:
        # 충분한 데이터를 위해 최근 7일치를 가져옴
        df = yf.download(ticker, period='7d', interval='5m', progress=False)
        if df.empty:
            return pd.Series(dtype=float)
            
        # 타임존을 KST(Asia/Seoul, UTC+9)로 변환
        if df.index.tz is None:
            df.index = df.index.tz_localize('UTC')
        df.index = df.index.tz_convert('Asia/Seoul')
        
        now = datetime.now(df.index.tz)
        
        if isinstance(df.columns, pd.MultiIndex):
            close_col = ('Close', ticker) if ('Close', ticker) in df.columns else df.columns.get_level_values(0)[0]
        else:
            close_col = 'Close'
            
        # 5/5 수정사항: 실시간 차트를 위해 마지막 거래일(하루치) 데이터만 추출
        # 시간 간격이 2시간 이상 나는 구간을 찾아 새로운 세션의 시작으로 간주
        time_diffs = df.index.to_series().diff()
        session_starts = time_diffs > pd.Timedelta(hours=2)
        if session_starts.any():
            last_session_start_idx = session_starts[session_starts].index[-1]
            df_latest = df.loc[last_session_start_idx:].copy()
        else:
            df_latest = df.copy()
            
        # 국내 지수의 경우 장중(09:00 ~ 15:35)에만 실시간 현재가를 마지막에 강제 삽입하여 '라이브' 느낌 제공
        if name in ['KOSPI', 'KOSDAQ']:
            now_kst = datetime.now(df.index.tz).replace(microsecond=0)
            is_market_open = (now_kst.hour == 9 and now_kst.minute >= 0) or (9 < now_kst.hour < 15) or (now_kst.hour == 15 and now_kst.minute <= 35)
            
            if is_market_open:
                summary = get_naver_index_summary(name)
                if summary:
                    # 마지막 데이터가 현재 시각과 1분 이상 차이날 경우 새로 추가
                    if (now_kst - df_latest.index[-1]).total_seconds() > 60:
                        df_latest.loc[now_kst, close_col] = summary['close']
                        df_latest = df_latest.sort_index()
            else:
                # 장 마감 이후에는 Naver 요약의 공식 종가 데이터로 15:30 데이터를 덮어쓰거나 추가함
                summary = get_naver_index_summary(name)
                if summary:
                    # 마지막 데이터의 날짜를 기준으로 15:30 설정 (주말/공휴일 대응)
                    last_ts = df_latest.index[-1]
                    market_close_time = last_ts.replace(hour=15, minute=30, second=0, microsecond=0)
                    
                    df_latest.loc[market_close_time, close_col] = summary['close']
                    df_latest = df_latest.sort_index()
        else:
            # 미국 지수의 경우, 시작 시간(22:30)은 그대로 두되, 장 마감 종가 지점을 정확히 표기하기 위해 끝 점 추가
            last_ts = df_latest.index[-1]
            now_kst = datetime.now(df.index.tz).replace(microsecond=0)
            
            if (now_kst - last_ts).total_seconds() >= 300:
                # 마지막 5분봉이 확정된 시점(5분 이상 경과)이면, 5분 뒤의 점을 찍어 해당 봉의 마감 지점(예: 05:00)을 생성
                expected_close_time = last_ts + pd.Timedelta(minutes=5)
                summary = get_daily_summary(name)
                final_close = summary['close'] if summary else df_latest.loc[last_ts, close_col]
                df_latest.loc[expected_close_time, close_col] = final_close
                df_latest = df_latest.sort_index()
            else:
                # 장중 라이브 상태일 경우 현재 시각으로 점을 연장
                if (now_kst - last_ts).total_seconds() > 60:
                    df_latest.loc[now_kst, close_col] = df_latest.loc[last_ts, close_col]
                    df_latest = df_latest.sort_index()
        
        return df_latest[close_col]
    except Exception as e:
        print(f"Error fetching chart data for {name}: {e}")
        return pd.Series(dtype=float)

@cachetools.func.ttl_cache(maxsize=128, ttl=60)
def get_daily_summary(name: str):
    """
    FinanceDataReader 및 yfinance를 사용하여 '최근 완료된 종가' 기준 요약을 구합니다.
    """
    ticker = TICKER_MAP.get(name)
    if not ticker:
        return None
    try:
        import pytz
        from datetime import datetime, timedelta
        import pandas as pd
        
        if name in ['KOSPI', 'KOSDAQ']:
            summary = get_naver_index_summary(name)
            if summary:
                return summary
            # 실패 시 기존 fdr/yfinance 로직으로 fallback (아래 기존 코드 유지)
            
        if name in ['KOSPI', 'KOSDAQ', 'KOSPI 200', 'KOSDAQ 150']:
            fdr_map = {'KOSPI': 'KS11', 'KOSDAQ': 'KQ11', 'KOSPI 200': 'KS200', 'KOSDAQ 150': 'KQ150'}
            df = fdr.DataReader(fdr_map.get(name))
            if df.empty or len(df) < 3: return None
            
            # 한국 시장: 실시간 업데이트를 위해 현재 날짜 허용
            now_kst = datetime.now(pytz.timezone('Asia/Seoul'))
            max_final_date = now_kst.date()
                
            max_final_ts = pd.Timestamp(max_final_date)
            if df.index.tz is not None:
                max_final_ts = max_final_ts.tz_localize(df.index.tz)
                
            df_filtered = df[df.index <= max_final_ts]
            if len(df_filtered) < 2:
                df_filtered = df  # fallback
                
            current_close = float(df_filtered['Close'].iloc[-1])
            current_open = float(df_filtered['Open'].iloc[-1])
            prev_close = float(df_filtered['Close'].iloc[-2])
        else:
            df = yf.download(ticker, period='7d', interval='1d', progress=False)
            if df.empty or len(df) < 3: return None
            
            if isinstance(df.columns, pd.MultiIndex):
                close_col = ('Close', ticker) if ('Close', ticker) in df.columns else df.columns.get_level_values(0)[0]
                open_col = ('Open', ticker) if ('Open', ticker) in df.columns else 'Open'
            else:
                close_col, open_col = 'Close', 'Open'

            # 미국 시장: 실시간 업데이트를 위해 현재 날짜 허용
            now_ny = datetime.now(pytz.timezone('America/New_York'))
            max_final_date = now_ny.date()
                
            max_final_ts = pd.Timestamp(max_final_date)
            if df.index.tz is not None:
                max_final_ts = max_final_ts.tz_localize(df.index.tz)
                
            df_filtered = df[df.index <= max_final_ts]
            if len(df_filtered) < 2:
                df_filtered = df  # fallback
                
            current_close = float(df_filtered[close_col].iloc[-1])
            current_open = float(df_filtered[open_col].iloc[-1])
            prev_close = float(df_filtered[close_col].iloc[-2])
            
        change_pct = ((current_close - prev_close) / prev_close) * 100
        
        return {
            'name': name,
            'open': current_open,
            'close': current_close,
            'prev_close': prev_close,
            'change_pct': change_pct
        }
    except Exception as e:
        print(f"Error fetching daily summary for {name}: {e}")
        return None

@cachetools.func.ttl_cache(maxsize=128, ttl=60)
def get_us_top_stocks(exchange: str = 'NASDAQ', sort_type: str = 'up'):
    url = f"https://m.stock.naver.com/front-api/worldstock/exchange/stock/list?stockExchangeType={exchange}&stockPriceSortType={sort_type}&page=1&pageSize=50"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    try:
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            return res.json()
        return None
    except Exception as e:
        print(f"Error fetching US top stocks: {e}")
        return None
