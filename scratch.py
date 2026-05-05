import yfinance as yf
import pandas as pd
df = yf.download('^IXIC', period='5d', interval='5m')
time_diffs = df.index.to_series().diff()
session_starts = time_diffs > pd.Timedelta(hours=2)
if session_starts.any():
    last_session_start_idx = session_starts[session_starts].index[-1]
    df_latest = df.loc[last_session_start_idx:].copy()
else:
    df_latest = df.copy()
print("All rows:", len(df))
print("Latest session rows:", len(df_latest))
print("Start:", df_latest.index[0])
print("End:", df_latest.index[-1])
