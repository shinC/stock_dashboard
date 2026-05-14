import requests
from bs4 import BeautifulSoup
import pandas as pd
import cachetools.func

@cachetools.func.ttl_cache(maxsize=1, ttl=600)
def get_leading_themes():
    """
    네이버 금융 테마 시세 페이지를 크롤링하여 주도 테마와 해당 테마의 종목들을 분석합니다.
    """
    url = "https://finance.naver.com/sise/theme.naver"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        res = requests.get(url, headers=headers)
        res.raise_for_status()
        
        # 한글 깨짐 방지
        res.encoding = 'euc-kr' 
        soup = BeautifulSoup(res.text, 'html.parser')
        
        table = soup.find('table', {'class': 'type_1 theme'})
        if not table:
            return []
            
        rows = table.find_all('tr')
        themes = []
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 3:
                theme_tag = cols[0].find('a')
                if not theme_tag:
                    continue
                    
                theme_name = theme_tag.text.strip()
                theme_url = "https://finance.naver.com" + theme_tag['href']
                
                # 전일대비 등락률
                rate_str = cols[1].text.strip().replace('%', '').replace('+', '').replace(',', '')
                try:
                    rate = float(rate_str)
                except ValueError:
                    rate = 0.0
                
                themes.append({
                    '테마명': theme_name,
                    '등락률(%)': rate,
                    'theme_url': theme_url
                })
                
        # 등락률 기준으로 내림차순 정렬하여 상위 11개 추출
        themes = sorted(themes, key=lambda x: x['등락률(%)'], reverse=True)[:11]
        
        # 각 테마별 종목 상세 정보 크롤링
        for theme in themes:
            theme['stocks'] = []
            try:
                t_res = requests.get(theme['theme_url'], headers=headers)
                t_res.raise_for_status()
                t_res.encoding = 'euc-kr'
                t_soup = BeautifulSoup(t_res.text, 'html.parser')
                
                t_tables = t_soup.find_all('table', {'class': 'type_5'})
                if t_tables:
                    all_theme_stocks = []
                    # 5/13: Polling API를 사용하여 정확한 거래대금을 가져오기 위해 티커 수집
                    stock_ticker_map = {} # ticker -> stock_data
                    
                    for tr in t_tables[0].find_all('tr'):
                        t_cols = tr.find_all('td')
                        if len(t_cols) > 5:
                            # 종목명 및 티커 추출
                            a_tag = t_cols[0].find('a')
                            if a_tag and 'code=' in a_tag.get('href', ''):
                                stock_name = a_tag.text.strip()
                                ticker = a_tag.get('href').split('code=')[-1].split('&')[0]
                                
                                # 기본 데이터 (크롤링 기반)
                                # Naver 상세 페이지 구조상 Index 8이 거래대금(백만)임
                                price = t_cols[2].text.strip()
                                rate_str = t_cols[4].text.strip().replace('%', '').replace('+', '').replace(',', '')
                                trade_amount_str = t_cols[8].text.strip().replace(',', '')
                                
                                try:
                                    rate_val = float(rate_str)
                                    trade_amt_val = int(trade_amount_str)
                                    
                                    stock_data = {
                                        '종목명': stock_name,
                                        '현재가': price,
                                        '등락률': t_cols[4].text.strip(),
                                        '거래대금': t_cols[8].text.strip(),
                                        'is_high_volume': trade_amt_val >= 100000,
                                        'rate_val': rate_val,
                                        'trade_amt_val': trade_amt_val,
                                        'ticker': ticker
                                    }
                                    all_theme_stocks.append(stock_data)
                                    stock_ticker_map[ticker] = stock_data
                                except ValueError:
                                    continue
                    
                    # 5/13: 키움증권 REST API를 사용하여 거래대금 데이터 보정
                    try:
                        from kiwoom_api import KiwoomAPI
                    except ImportError:
                        from src.kiwoom_api import KiwoomAPI
                    
                    kiwoom = KiwoomAPI()
                    # 토큰 발급 시도 (로그인 가능 여부 먼저 확인)
                    has_kiwoom_access = kiwoom.get_access_token() is not None
                    
                    if stock_ticker_map:
                        tickers = list(stock_ticker_map.keys())
                        for ticker in tickers:
                            # 키움 API 접근 가능할 때만 시도
                            if has_kiwoom_access:
                                try:
                                    # 키움 API를 통해 상세 정보 조회
                                    kiwoom_data = kiwoom.get_stock_info(ticker)
                                    if kiwoom_data:
                                        # 키움 응답 필드명 확인 필요 (보통 'tr_pb' 또는 '거래대금')
                                        # 'tr_pb'가 거래대금(원 단위)인 경우가 많음
                                        raw_tr_val = kiwoom_data.get('tr_pb') or kiwoom_data.get('거래대금')
                                        if raw_tr_val:
                                            # 원 -> 백만 단위 변환
                                            real_trade_amt_val = int(float(raw_tr_val) / 1000000)
                                            
                                            s_data = stock_ticker_map[ticker]
                                            s_data['거래대금'] = f"{real_trade_amt_val:,}"
                                            s_data['trade_amt_val'] = real_trade_amt_val
                                            s_data['is_high_volume'] = real_trade_amt_val >= 100000
                                            
                                            # 현재가 및 등락률도 키움 데이터로 보정 가능
                                            curr_p = kiwoom_data.get('curr_p') or kiwoom_data.get('현재가')
                                            if curr_p:
                                                s_data['현재가'] = f"{abs(int(curr_p)):,}"
                                            
                                            diff_r = kiwoom_data.get('diff_r') or kiwoom_data.get('등락율')
                                            if diff_r:
                                                s_data['등락률'] = f"{float(diff_r):+}%"
                                                s_data['rate_val'] = float(diff_r)
                                                
                                            continue # 키움 데이터 성공 시 다음 티커로
                                except Exception as ke:
                                    print(f"Kiwoom API error for {ticker}: {ke}")
                            
                            # 키움 API 비활성화 상태거나 실패 시 기존 Naver Polling API (fallback)
                            try:
                                polling_url = f"https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:{ticker}"
                                p_res = requests.get(polling_url, headers=headers, timeout=5)
                                if p_res.status_code == 200:
                                    p_data = p_res.json()
                                    if p_data.get('resultCode') == 'success' and p_data['result']['areas']:
                                        item = p_data['result']['areas'][0]['datas'][0]
                                        real_trade_amt_val = int(float(item['aa']) / 1000000)
                                        s_data = stock_ticker_map[ticker]
                                        s_data['거래대금'] = f"{real_trade_amt_val:,}"
                                        s_data['현재가'] = f"{int(item['nv']):,}"
                                        s_data['등락률'] = f"{item['cr']:+}%"
                                        s_data['trade_amt_val'] = real_trade_amt_val
                                        s_data['rate_val'] = float(item['cr'])
                                        s_data['is_high_volume'] = real_trade_amt_val >= 100000
                            except Exception as pe:
                                print(f"Error polling real-time data for {ticker}: {pe}")

                    # 1차 필터링: 등락률 10% 이상 또는 거래대금 1000억 이상
                    filtered_stocks = [s for s in all_theme_stocks if s['rate_val'] >= 10.0 or s['trade_amt_val'] >= 100000]
                    
                    # 최종 출력 데이터에서 정렬용 필드 삭제 및 개수 제한
                    for s in filtered_stocks:
                        del s['rate_val']
                        del s['trade_amt_val']
                        if 'ticker' in s: del s['ticker']
                    
                    theme['stocks'] = filtered_stocks[:7]

            except Exception as e:
                print(f"Error scraping theme details for {theme['테마명']}: {e}")
                
            # URL 정보는 프론트에 필요 없으므로 삭제
            if 'theme_url' in theme:
                del theme['theme_url']
            
        return themes
        
    except Exception as e:
        print(f"Error scraping themes: {e}")
        return []
