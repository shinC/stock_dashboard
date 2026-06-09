import yfinance as yf
from datetime import datetime
import pytz
import pandas as pd

def test_yf(name, ticker):
    df = yf.download(ticker, period='7d', interval='1d', progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        close_col = ('Close', ticker) if ('Close', ticker) in df.columns else df.columns.get_level_values(0)[0]
        open_col = ('Open', ticker) if ('Open', ticker) in df.columns else 'Open'
    else:
        close_col, open_col = 'Close', 'Open'
    now_ny = datetime.now(pytz.timezone('America/New_York'))
    max_final_date = now_ny.date()
    max_final_ts = pd.Timestamp(max_final_date)
    if df.index.tz is not None:
        max_final_ts = max_final_ts.tz_localize(df.index.tz)
    df_filtered = df[df.index <= max_final_ts]
    print(f"{name} df_filtered length: {len(df_filtered)}")
    print(f"{name} Current close: {df_filtered[close_col].iloc[-1]}")
    print(f"{name} Current open: {df_filtered[open_col].iloc[-1]}")

test_yf('S&P 500', '^GSPC')
