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
                
        # 등락률 기준으로 내림차순 정렬하여 상위 5개 추출
        themes = sorted(themes, key=lambda x: x['등락률(%)'], reverse=True)[:5]
        
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
                    for tr in t_tables[0].find_all('tr'):
                        # 최대 10개 종목까지만 수집
                        if len(theme['stocks']) >= 10:
                            break
                            
                        t_cols = tr.find_all('td')
                        if len(t_cols) > 5:
                            # 종목명 추출
                            name_div = t_cols[0].find('div', class_='name_area')
                            if name_div and name_div.find('a'):
                                stock_name = name_div.find('a').text.strip()
                            else:
                                stock_name = t_cols[0].text.strip().split('\n')[0].replace('*', '').strip()
                                
                            # 현재가, 등락률, 거래대금(백만)
                            price = t_cols[2].text.strip()
                            rate_str = t_cols[4].text.strip().replace('%', '').replace('+', '').replace(',', '')
                            trade_amount_str = t_cols[8].text.strip().replace(',', '')
                            
                            try:
                                rate_val = float(rate_str)
                                trade_amt_val = int(trade_amount_str)
                                
                                # 조건: 등락률 10% 이상이거나 거래대금 천억(100,000백만) 이상만 포함
                                if rate_val >= 10.0 or trade_amt_val >= 100000:
                                    is_high_volume = trade_amt_val >= 100000
                                    
                                    theme['stocks'].append({
                                        '종목명': stock_name,
                                        '현재가': price,
                                        '등락률': t_cols[4].text.strip(),
                                        '거래대금': t_cols[8].text.strip(),
                                        'is_high_volume': is_high_volume
                                    })
                                    
                                    # 상위 7개 종목까지만 수집
                                    if len(theme['stocks']) >= 7:
                                        break
                            except ValueError:
                                continue
            except Exception as e:
                print(f"Error scraping theme details for {theme['테마명']}: {e}")
                
            # URL 정보는 프론트에 필요 없으므로 삭제
            del theme['theme_url']
            
        return themes
        
    except Exception as e:
        print(f"Error scraping themes: {e}")
        return []
