import { v5 as uuidv5 } from 'uuid'
import _ from 'lodash'
import { YahooFinanceTicker } from 'yahoo-finance-ticker'
import got from './utils/got.js'
import { NAMESPACE } from './utils/const.js'
import { getCrumb } from './utils/crumb.js'

const irTable = {
  ONE_MINUTE: {
    interval: '1m',
    range: '7d',
  },
  FIVE_MINUTES: {
    interval: '5m',
    range: '30d',
  },
  FIFTEEN_MINUTES: {
    interval: '15m',
    range: '30d',
  },
  THIRTY_MINUTES: {
    interval: '30m',
    range: '30d',
  },
  ONE_HOUR: {
    interval: '1h',
    range: '60d',
  },
  ONE_DAY: {
    interval: '1d',
    range: '2y',
  },
  ONE_WEEK: {
    interval: '1wk',
    range: '10y',
  },
  ONE_MONTH: {
    interval: '1mo',
    range: '20y',
  },
  THREE_MONTHS: {
    interval: '3mo',
    range: 'max',
  },
}

class Quote {
  constructor(data) {
    Object.assign(this, data)
    this.id = uuidv5(data.symbol, NAMESPACE)
    this.quoteType = data.quoteType?.toUpperCase() || null
  }

  // Our crumb & cookie jar pair is declared as static properties
  // because we want to use the same authentication pair across
  // all request instances, as long as this pair is valid!
  static crumb
  static cookieJar

  // The ticker method instantiates a new web-socket channel
  // for quote (price) updates. This channel is uniquely identified
  // by the 'tickerId' parameter, amking all such ticker requests
  // absolutely independent from each other - this is critical!
  static async ticker(ctx, { symbols, tickerId }) {
    // Create a new YahooFinanceTicker instance
    const streamer = new YahooFinanceTicker()
    try {
      // Start the listener with the symbols of the assets
      // we want price updates for.
      const tickerListener = await streamer.subscribe(symbols)
      // Whenever we have a price update, we update our PubSub
      // instance accordingly, passing in the tickerId (which
      // uniquely identifies the channel) along with the payload
      // (price update, asset symbol, and a unique ID based on the
      // asset symbol).
      // Updating the PubSub instance that was created along with
      // the GraphQL server will trigger a GraphQL subscription
      // message to the proper 'tickerId' channel.
      tickerListener.on('ticker', (t) => {
        // console.log(`new message on stream ${tickerId}`, t)
        ctx.pubsub.publish(tickerId, {
          ...t,
          id: uuidv5(t.id, NAMESPACE),
          symbol: t.id,
        })
      })
      // Return an unsubscribe lambda to cleanly dispose
      // of the YahooFinanceTicker instance when we unsubscribe
      // at the GraphQL level.
      return () => streamer.unsubscribe()
    } catch (error) {
      throw error
    }
  }

  // The get method returns a set of initial price data for the
  // queried asset symbols. Access to this endpoint is restricted
  // on the Yahoo Finance API and thus a valid crumb/cookieJar
  // pair is necessary to make a successful request.
  static async get(_ctx, { symbols }) {
    // The quote response that will ultimately be returned
    let qr
    // A retry flag set to true by default
    let retry = true
    // Do...while block
    do {
      try {
        // If a crumb/cookieJar pair does not currently
        // exists, we get one then store it as static
        // properties on the class.
        if (!this.crumb) {
          const obj = await getCrumb()
          this.crumb = obj.crumb
          this.cookieJar = obj.cookieJar
        }
        // We pass the crumb and cookieJar to the endpoint
        // along with the request.
        const res = await got
          .get(`v7/finance/quote?symbols=${symbols}&crumb=${this.crumb}`, {
            cookieJar: this.cookieJar,
          })
          .json()
        // We map the result according to our expected output format
        qr = res.quoteResponse.result.map((item) => new Quote(item))
      } catch (error) {
        console.log(error.code, error.message)
        // If there was an error:
        // - if that error was a 401 unautorized or a 404 not found
        //   it is likely that our crumb/cookieJar pair is no longer
        //   valid, so we null the static value (which will force
        //   fetching a new crumb/cookieJar pair) and retry.
        // - if the error is something else, then we branch out of
        //   the retry loop and throw.
        if (error.code === 'ERR_NON_2XX_3XX_RESPONSE') {
          this.crumb = null
        } else {
          retry = false
          throw error
        }
      }
      // Loop while qr value is empty AND retry flag is set
    } while (retry && !qr)
    // If all went as planned, return our formatted data.
    return qr
  }

  // The data method returns historical price data for the
  // requested asset symbol, at the requested time interval.
  // Access to this endpoint is NOT restricted on the Yahoo
  // Finance API and thus the crumb/cookieJar pair is not used.
  static async data(_ctx, { symbol, interval: itv }) {
    try {
      // Look up the range and interval values to be used
      // with the endpoint based on the requested interval.
      const { interval, range } = irTable[itv]
      // API request
      const res = await got
        .get(`v8/finance/chart/${symbol}?interval=${interval}&range=${range}`)
        .json()
      // Format and return the data based on the expected output.
      const { meta, timestamp, indicators } = res.chart.result[0]
      return {
        id: uuidv5(meta.symbol, NAMESPACE),
        symbol: meta.symbol,
        quoteType: meta.instrumentType,
        exchange: meta.exchangeName,
        priceHint: meta.priceHint,
        dataGranularity: meta.dataGranularity,
        data: timestamp
          .map((t, i) => {
            return {
              timestamp: t,
              open: indicators.quote[0].open[i],
              high: indicators.quote[0].high[i],
              low: indicators.quote[0].low[i],
              close: indicators.quote[0].close[i],
              volume: indicators.quote[0].volume[i],
              adjClose: indicators.adjclose
                ? indicators.adjclose[0].adjclose[i]
                : null,
            }
          })
          .slice(0, -1),
      }
    } catch (error) {
      console.log(error.code, error.message)
      throw error
    }
  }

  // The profile method returns profile data for the asset
  // specified by the requested symbol. Access to this
  // endpoint is restricted on the Yahoo Finance API and thus
  // a valid crumb/cookieJar pair is necessary to make a
  // successful request.
  static async profile(_ctx, { symbol }) {
    // The quote summary that will ultimately be returned
    let qs
    // A retry flag set to true by default
    let retry = true
    // Do...while block
    do {
      try {
        // If a crumb/cookieJar pair does not currently
        // exists, we get one then store it as static
        // properties on the class.
        if (!this.crumb) {
          const obj = await getCrumb()
          this.crumb = obj.crumb
          this.cookieJar = obj.cookieJar
        }
        // We pass the crumb and cookieJar to the endpoint
        // along with the request.
        const res = await got
          .get(
            `v10/finance/quoteSummary/${symbol}?modules=assetProfile,price,summaryDetail,recommendationTrend&crumb=${this.crumb}`,
            { cookieJar: this.cookieJar },
          )
          .json()
        // We set the result according to our expected output format
        qs = new Quote(res.quoteSummary.result[0].price)
      } catch (error) {
        console.log(error.code, error.message)
        // If there was an error:
        // - if that error was a 401 unautorized or a 404 not found
        //   it is likely that our crumb/cookieJar pair is no longer
        //   valid, so we null the static value (which will force
        //   fetching a new crumb/cookieJar pair) and retry.
        // - if the error is something else, then we branch out of
        //   the retry loop and throw.
        if (error.code === 'ERR_NON_2XX_3XX_RESPONSE') {
          this.crumb = null
        } else {
          retry = false
          throw error
        }
      }
      // Loop while qr value is empty AND retry flag is set
    } while (retry && !qs)
    // If all went as planned, return our formatted data.
    return qs
  }

  // The recommend method returns a set of asset symbols related
  // to the asset symbol being queried.
  // Access to this endpoint is NOT restricted on the Yahoo
  // Finance API and thus the crumb/cookieJar pair is not used.
  static async recommend(_ctx, { symbol }) {
    try {
      // API request
      const res = await got
        .get(`v6/finance/recommendationsbysymbol/${symbol}`)
        .json()
      // Format and return the data based on the expected output.
      return res.finance.result[0].recommendedSymbols.map(
        (item) => new Quote(item),
      )
    } catch (error) {
      throw error
    }
  }

  // The lookup method returns asset suggestions based on a
  // search term and an asset type.
  // Access to this endpoint is NOT restricted on the Yahoo
  // Finance API and thus the crumb/cookieJar pair is not used.
  static async lookup(_ctx, { query, type: t }) {
    // Force the search term to lowercase
    const type = t.toLowerCase()
    // If the search term is zero-length, return an empty
    // set of results.
    if (query.length < 1) {
      return {
        id: uuidv5(`${query}_${t}`, NAMESPACE),
        totals: {
          all: 0,
          equity: 0,
          index: 0,
          future: 0,
          mutualfund: 0,
          etf: 0,
          currency: 0,
          cryptocurrency: 0,
        },
        quotes: [],
      }
    }
    try {
      // Our initial API request just fetches the total number
      // of matches for our search term, per asset type.
      const res = await got
        .get(`v1/finance/lookup/totals?query=${query}`)
        .json()
      const totals = res.finance.result[0].totals
      // If the there is at least one match for our search term
      // in the requested asset type, we fetch those matches up
      // to a maximum of 500 matches.
      if (totals[type] > 0) {
        try {
          const res = await got
            .get(
              `v1/finance/lookup?query=${query}&type=${type}&count=${Math.min(
                totals[type],
                500,
              )}`,
            )
            .json()
          // We format and return the matches according to the
          // expected output.
          return {
            id: uuidv5(`${query}_${t}`, NAMESPACE),
            totals,
            quotes: _.uniqBy(
              res.finance.result[0].documents.map((item) => new Quote(item)),
              'id',
            ),
          }
        } catch (error) {
          throw error
        }
        // If there were no matches for our search term in the
        // requested asset type, we return an empty set.
      } else {
        return {
          id: uuidv5(`${query}_${t}`, NAMESPACE),
          totals,
          quotes: [],
        }
      }
    } catch (error) {
      throw error
    }
  }
}

export default Quote
