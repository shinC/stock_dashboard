import pandas as pd
from datetime import datetime, timedelta
import pytz
import FinanceDataReader as fdr
import yfinance as yf

def test_daily_summary(name, ticker_map):
    ticker = ticker_map.get(name)
    if not ticker: return None
    
    if name in ['KOSPI', 'KOSDAQ', 'KOSPI 200', 'KOSDAQ 150']:
        fdr_map = {'KOSPI': 'KS11', 'KOSDAQ': 'KQ11', 'KOSPI 200': 'KS200', 'KOSDAQ 150': 'KQ150'}
        df = fdr.DataReader(fdr_map.get(name))
        if df.empty or len(df) < 3: return None
        
        now_kst = datetime.now(pytz.timezone('Asia/Seoul'))
        if now_kst.time() < datetime.strptime("15:45", "%H:%M").time():
            max_final_date = now_kst.date() - timedelta(days=1)
        else:
            max_final_date = now_kst.date()
            
        max_final_ts = pd.Timestamp(max_final_date)
        if df.index.tz is not None: max_final_ts = max_final_ts.tz_localize(df.index.tz)
        df_filtered = df[df.index <= max_final_ts]
        if len(df_filtered) < 2: df_filtered = df
        
        current_close = float(df_filtered['Close'].iloc[-1])
        prev_close = float(df_filtered['Close'].iloc[-2])
        print(f"[{name}] KST: {now_kst.strftime('%Y-%m-%d %H:%M')}, MaxFinal: {max_final_date}, LastDate: {df_filtered.index[-1].date()}, Close: {current_close}")
        
    else:
        df = yf.download(ticker, period='7d', interval='1d', progress=False)
        if df.empty or len(df) < 3: return None
        if isinstance(df.columns, pd.MultiIndex):
            close_col = ('Close', ticker) if ('Close', ticker) in df.columns else df.columns.get_level_values(0)[0]
        else:
            close_col = 'Close'
            
        now_ny = datetime.now(pytz.timezone('America/New_York'))
        if now_ny.time() < datetime.strptime("16:00", "%H:%M").time():
            max_final_date = now_ny.date() - timedelta(days=1)
        else:
            max_final_date = now_ny.date()
            
        max_final_ts = pd.Timestamp(max_final_date)
        if df.index.tz is not None: max_final_ts = max_final_ts.tz_localize(df.index.tz)
        df_filtered = df[df.index <= max_final_ts]
        if len(df_filtered) < 2: df_filtered = df
        
        current_close = float(df_filtered[close_col].iloc[-1])
        prev_close = float(df_filtered[close_col].iloc[-2])
        print(f"[{name}] NY: {now_ny.strftime('%Y-%m-%d %H:%M')}, MaxFinal: {max_final_date}, LastDate: {df_filtered.index[-1].date()}, Close: {current_close}")

TICKER_MAP = {
    'S&P 500': '^GSPC',
    'NASDAQ': '^IXIC',
    'KOSPI': '^KS11',
}

test_daily_summary('NASDAQ', TICKER_MAP)
test_daily_summary('KOSPI', TICKER_MAP)
