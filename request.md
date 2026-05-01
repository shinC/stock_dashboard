

공통
1. 인덱스 지수는 기본적으로 미니차트 형식으로 보여줘. 당일시가와 종가의 변화를 알기위해서 필요해서 하루치만 보여주면 돼.
2. 등락율은 종가기준으로 표시는 해줘.

미국시장 정보
1. FinanceDataReader(https://github.com/FinanceData/FinanceDataReader)와 streamlit을 사용해서 주가 조회 대시보드를 만들 거야
2. 대쉬보드에 필요한 정보는 미국지수(s&p500,나스닥,다우,나스닥100,러셀2000,필라델피아반도체지수,WTI, VIX)

국내시장정보
1. 국장 코스피, 코스닥
2. 야간선물(전일기준)
3. 당일 주도테마 정보를 알고 싶어. 테마 | 종목 | 현재가 | 등락율 | 거래대금 
4. 주도테마는 당일 거래대금, 등락율 , 상승테마 갯수로 파악해서 알려줘.(sample1.png)
5. 주도테마를 어떻게 파악했는지에 대한 설명도 제공.


5/1 추가개발

트레이딩뷰 위젯을 이용한 차트표시

1. 트레이딩뷰 임베디드 코드를 이용하여 차트를 보여준다.(임베디드 코드는 하단에 제공)
2. 미국시장 주식종목 검색을 위한 심볼서치를 작성.(차트 위에 두고 검색가능하게.)
3. 심볼서치는 한국어나 영어 혹은 티커명 자체로 검색해도 나오게끔 처리되야 해.
4. 심볼리스트를 DB에 저장하기보다는 API를 이용하는 방법을 우선적으로 선호.
5. 메인페이지에 미국시장, 한국시장 옆에 차트 탭 하나 더 만들어서 클릭시 페이지로 이동.
6. 검색된 심볼 추가 방법은 하단임베디드 코드 보고 파악.
7. 심볼을 추가하면 바로 반영되게 처리(페이지 리프레쉬가 필요하면 진행)
8. 심볼을 삭제할 수 있게도 만들어줘.


트레이딩뷰 차트 임베디드 코드
<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container">
  <div class="tradingview-widget-container__widget"></div>
  <div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/symbols/NASDAQ-AAPL/" rel="noopener nofollow" target="_blank"><span class="blue-text">Apple</span></a><span class="comma">,</span>&nbsp;<a href="https://www.tradingview.com/symbols/NASDAQ-GOOGL/" rel="noopener nofollow" target="_blank"><span class="blue-text">Google</span></a><span class="comma">,</span><span class="and">&nbsp;and&nbsp;</span><a href="https://www.tradingview.com/symbols/NASDAQ-MSFT/" rel="noopener nofollow" target="_blank"><span class="blue-text">Microsoft stock price</span></a><span class="trademark">&nbsp;by TradingView</span></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js" async>
  {
  "lineWidth": 2,
  "lineType": 0,
  "chartType": "area",
  "fontColor": "rgb(106, 109, 120)",
  "gridLineColor": "rgba(242, 242, 242, 0.06)",
  "volumeUpColor": "rgba(34, 171, 148, 0.5)",
  "volumeDownColor": "rgba(247, 82, 95, 0.5)",
  "backgroundColor": "#0F0F0F",
  "widgetFontColor": "#DBDBDB",
  "upColor": "#22ab94",
  "downColor": "#f7525f",
  "borderUpColor": "#22ab94",
  "borderDownColor": "#f7525f",
  "wickUpColor": "#22ab94",
  "wickDownColor": "#f7525f",
  "colorTheme": "dark",
  "isTransparent": false,
  "locale": "en",
  "chartOnly": false,
  "scalePosition": "right",
  "scaleMode": "Normal",
  "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
  "valuesTracking": "1",
  "changeMode": "price-and-percent",
  "symbols": [
    [
      "Apple",
      "NASDAQ:AAPL|1D"
    ],
    [
      "Google",
      "NASDAQ:GOOGL|1D"
    ],
    [
      "Microsoft",
      "NASDAQ:MSFT|1D"
    ]
  ],
  "dateRanges": [
    "1d|1",
    "1m|30",
    "3m|60",
    "12m|1D",
    "60m|1W",
    "all|1M"
  ],
  "fontSize": "10",
  "headerFontSize": "medium",
  "autosize": true,
  "width": "100%",
  "height": "100%",
  "noTimeScale": false,
  "hideDateRanges": false,
  "hideMarketStatus": false,
  "hideSymbolLogo": false
}
  </script>
</div>
<!-- TradingView Widget END -->