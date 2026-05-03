from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from data_fetcher import get_intraday_data, get_daily_summary, TICKER_MAP, get_us_top_stocks
from theme_analyzer import get_leading_themes
from us_sector_fetcher import get_us_sectors_data
import pandas as pd
import os

import requests

app = Flask(__name__, static_folder='../frontend', static_url_path='/')
# 프론트엔드와 백엔드가 다른 포트에서 실행될 수 있으므로 CORS 허용
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

US_INDICES = ['S&P 500', '나스닥', '다우 존스', '나스닥 100', '러셀 2000', '필라델피아 반도체', '유가(WTI)', '변동성(VIX)']
KR_INDICES = ['코스피', '코스닥']

# 데이터 요청 시 사용할 실제 티커 명칭 매핑
DISPLAY_NAME_TO_KEY = {
    'S&P 500': 'S&P 500',
    '나스닥': 'NASDAQ',
    '다우 존스': 'Dow Jones',
    '나스닥 100': 'NASDAQ 100',
    '러셀 2000': 'Russell 2000',
    '필라델피아 반도체': 'Philadelphia Semi',
    '유가(WTI)': 'WTI',
    '변동성(VIX)': 'VIX',
    '코스피': 'KOSPI',
    '코스닥': 'KOSDAQ'
}

def fetch_market_data(indices):
    results = []
    
    for display_name in indices:
        key_name = DISPLAY_NAME_TO_KEY.get(display_name, display_name)
        summary = get_daily_summary(key_name)
        chart_data = get_intraday_data(key_name)
        
        # 차트 데이터를 JSON 직렬화 가능하도록 리스트 딕셔너리로 변환
        chart_list = []
        if chart_data is not None and not chart_data.empty:
            df_chart = chart_data.reset_index()
            if len(df_chart.columns) >= 2:
                time_col = df_chart.columns[0]
                val_col = df_chart.columns[1]
                for _, row in df_chart.iterrows():
                    if pd.notnull(row[val_col]):
                        chart_list.append({
                            "time": str(row[time_col]),
                            "value": float(row[val_col])
                        })
                
                # 공식 종가 데이터 추가 (마지막 포인트의 값을 공식 종가로 보정하여 정확도 100% 보장)
                if summary and len(chart_list) > 0:
                    chart_list[-1]["value"] = summary['close']
        
        results.append({
            "name": display_name,
            "summary": summary,
            "chart": chart_list
        })
    return results

@app.route('/api/us-market', methods=['GET'])
def get_us_market():
    return jsonify(fetch_market_data(US_INDICES))

@app.route('/api/kr-market', methods=['GET'])
def get_kr_market():
    return jsonify(fetch_market_data(KR_INDICES))

@app.route('/api/us-sectors', methods=['GET'])
def get_us_sectors():
    return jsonify(get_us_sectors_data())

@app.route('/api/themes', methods=['GET'])
def get_themes():
    themes_list = get_leading_themes()
    return jsonify(themes_list)

from flask import request

@app.route('/api/search-symbol', methods=['GET'])
def search_symbol():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    
    url = f"https://m.stock.naver.com/front-api/search/autoComplete?query={query}&target=stock,index,marketindicator,coin,ipo,fund"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            items = []
            
            if data.get('isSuccess') and 'result' in data and 'items' in data['result']:
                # 미국 주식만 필터링 (필요에 따라 해제 가능)
                items = [item for item in data['result']['items'] if item.get('nationCode') == 'USA']
                
            results = []
            for item in items[:10]:
                results.append({
                    'symbol': item.get('code'),
                    'exchange': item.get('typeCode'),
                    'description': item.get('name'),
                    'type': item.get('category')
                })
            return jsonify(results)
        else:
            return jsonify({"error": f"Failed to fetch from Naver: {response.status_code}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/us-top-stocks', methods=['GET'])
def us_top_stocks():
    exchange = request.args.get('exchange', 'NASDAQ')
    sort_type = request.args.get('sort', 'up')
    data = get_us_top_stocks(exchange=exchange, sort_type=sort_type)
    if data:
        return jsonify(data)
    else:
        return jsonify({"error": "Failed to fetch top stocks"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=8080)
