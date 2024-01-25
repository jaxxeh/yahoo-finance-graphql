import got from 'got'

export default got.extend({
  prefixUrl: `https://query1.finance.yahoo.com`,
  headers: {
    'User-Agent': 'PostmanRuntime/7.35.0',
  },
})
