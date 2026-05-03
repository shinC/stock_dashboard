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

@cachetools.func.ttl_cache(maxsize=128, ttl=300)
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
            
        # 한국 시장과 미국 시장의 마감 시간 기준 설정
        if name in ['KOSPI', 'KOSDAQ', 'KOSPI 200', 'KOSDAQ 150']:
            # 한국 시장: 오늘 오후 3시 45분 이전이면 전일 데이터를 보여줌
            market_close_today = now.replace(hour=15, minute=45, second=0, microsecond=0)
            if now < market_close_today:
                # 오늘 날짜를 제외한 가장 최근 날짜 찾기
                today_date = now.date()
                df_past = df[df.index.date < today_date]
                if df_past.empty: return pd.Series(dtype=float)
                latest_date = df_past.index.date[-1]
            else:
                latest_date = df.index.date[-1]
            df_latest = df[df.index.date == latest_date].copy()
            
            # 마감 시간 보정 (15:30)
            # yfinance가 종가 데이터를 14:55까지만 제공하는 경우가 있으므로, 마지막 데이터 포인트를 15:30으로 고정
            if not df_latest.empty:
                last_idx = df_latest.index[-1]
                if 14 <= last_idx.hour <= 16:
                    new_idx = last_idx.replace(hour=15, minute=30)
                    df_latest.index = df_latest.index.delete(-1).insert(len(df_latest)-1, new_idx)
        elif name == 'WTI':
            # 유가는 23시간 거래 (한국시간 07:00 ~ 익일 06:00)
            df_close_window = df[df.index.hour.isin([5, 6, 7])]
            if not df_close_window.empty:
                last_in_window = df_close_window.index[-1]
                
                market_close_limit = now.replace(hour=6, minute=30, second=0, microsecond=0)
                if now.hour < 11 and now < market_close_limit:
                    df_close_window = df_close_window[df_close_window.index < now.replace(hour=0, minute=0)]
                    if not df_close_window.empty:
                        last_in_window = df_close_window.index[-1]
                
                if 3 <= last_in_window.month <= 11:
                    end_dt = last_in_window.replace(hour=6, minute=0, second=0)
                else:
                    end_dt = last_in_window.replace(hour=7, minute=0, second=0)
            else:
                end_dt = df.index[-1]
            
            start_dt = end_dt - timedelta(hours=23)
            df_latest = df[(df.index >= start_dt) & (df.index <= end_dt)].copy()
            
            if not df_latest.empty:
                last_idx = df_latest.index[-1]
                if last_idx.hour == 5 or (last_idx.hour == 6 and last_idx.minute < 30):
                    new_idx = last_idx.replace(hour=6, minute=0)
                    df_latest.index = df_latest.index.delete(-1).insert(len(df_latest)-1, new_idx)

        elif name == 'VIX':
            # VIX 정규장 마감 (한국시간 05:15 / 겨울 06:15)
            df_close_window = df[df.index.hour.isin([4, 5, 6, 7])]
            if not df_close_window.empty:
                last_in_window = df_close_window.index[-1]
                
                market_close_limit = now.replace(hour=6, minute=45, second=0, microsecond=0)
                if now.hour < 11 and now < market_close_limit:
                    df_close_window = df_close_window[df_close_window.index < now.replace(hour=0, minute=0)]
                    if not df_close_window.empty:
                        last_in_window = df_close_window.index[-1]
                
                if 3 <= last_in_window.month <= 11:
                    end_dt = last_in_window.replace(hour=5, minute=15, second=0)
                else:
                    end_dt = last_in_window.replace(hour=6, minute=15, second=0)
            else:
                end_dt = df.index[-1]
            
            # 정규장 6시간 45분
            start_dt = end_dt - timedelta(hours=6, minutes=45)
            df_latest = df[(df.index >= start_dt) & (df.index <= end_dt)].copy()
            
            if not df_latest.empty:
                last_idx = df_latest.index[-1]
                if last_idx.hour == 5 or (last_idx.hour == 6 and last_idx.minute < 45):
                    new_idx = last_idx.replace(hour=end_dt.hour, minute=15)
                    df_latest.index = df_latest.index.delete(-1).insert(len(df_latest)-1, new_idx)

        else:
            # 미국 지수(나스닥 등) 정규장 마감 (05:00 / 06:00)
            df_close_window = df[df.index.hour.isin([4, 5, 6])]
            if not df_close_window.empty:
                last_in_window = df_close_window.index[-1]
                
                market_close_limit = now.replace(hour=6, minute=30, second=0, microsecond=0)
                if now.hour < 10 and now < market_close_limit:
                    df_close_window = df_close_window[df_close_window.index < now.replace(hour=0, minute=0)]
                    if not df_close_window.empty:
                        last_in_window = df_close_window.index[-1]
                
                if 3 <= last_in_window.month <= 11:
                    end_dt = last_in_window.replace(hour=5, minute=0, second=0)
                else:
                    end_dt = last_in_window.replace(hour=6, minute=0, second=0)
            else:
                end_dt = df.index[-1]
            
            # 정규장 6시간 30분
            start_dt = end_dt - timedelta(hours=6, minutes=30)
            df_latest = df[(df.index >= start_dt) & (df.index <= end_dt)].copy()
            
            # 마감 시각 보정
            if not df_latest.empty:
                last_idx = df_latest.index[-1]
                if last_idx.hour == 4 or (last_idx.hour == 5 and last_idx.minute < 30):
                    new_idx = last_idx.replace(hour=5, minute=0)
                    df_latest.index = df_latest.index.delete(-1).insert(len(df_latest)-1, new_idx)
                elif last_idx.hour == 5 or (last_idx.hour == 6 and last_idx.minute < 30):
                    new_idx = last_idx.replace(hour=6, minute=0)
                    df_latest.index = df_latest.index.delete(-1).insert(len(df_latest)-1, new_idx)
        
        return df_latest[close_col]
    except Exception as e:
        print(f"Error fetching chart data for {name}: {e}")
        return pd.Series(dtype=float)

@cachetools.func.ttl_cache(maxsize=128, ttl=300)
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
        
        if name in ['KOSPI', 'KOSDAQ', 'KOSPI 200', 'KOSDAQ 150']:
            fdr_map = {'KOSPI': 'KS11', 'KOSDAQ': 'KQ11', 'KOSPI 200': 'KS200', 'KOSDAQ 150': 'KQ150'}
            df = fdr.DataReader(fdr_map.get(name))
            if df.empty or len(df) < 3: return None
            
            # 한국 시장: 15:45 이전이면 아직 거래중이거나 마감 전으로 간주하여 전일 데이터 사용
            now_kst = datetime.now(pytz.timezone('Asia/Seoul'))
            if now_kst.time() < datetime.strptime("15:45", "%H:%M").time():
                max_final_date = now_kst.date() - timedelta(days=1)
            else:
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

            # 미국 시장: 뉴욕 시간 기준 16:00 이전이면 아직 거래중이거나 마감 전으로 간주
            now_ny = datetime.now(pytz.timezone('America/New_York'))
            if now_ny.time() < datetime.strptime("16:00", "%H:%M").time():
                max_final_date = now_ny.date() - timedelta(days=1)
            else:
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
