import got from 'got'

class MarketStatus {
  constructor(data) {
    Object.assign(this, data)
    this.duration = data.duration
      ? { ...data.duration[0] }
      : { days: null, hrs: null, mins: null }
  }

  static async get(_ctx, _args) {
    try {
      const response = await got(
        `https://finance.yahoo.com/_finance_doubledown/api/resource/finance.market-time`,
        {
          headers: {
            'User-Agent': 'PostmanRuntime/7.35.0',
          },
        },
      ).json()
      return new MarketStatus(response)
    } catch (error) {
      throw error
    }
  }
}

export default MarketStatus
