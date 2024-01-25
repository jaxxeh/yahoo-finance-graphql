import Quote from '../../business/quote.js'
import MarketStatus from '../../business/marketStatus.js'

export default {
  Query: {
    version(root, args, ctx) {
      return '0.1.0'
    },
    echo(root, args, ctx) {
      return args.value
    },
    lookup(root, args, ctx) {
      return Quote.lookup(ctx, args)
    },
    quotes(root, args, ctx) {
      return Quote.get(ctx, args)
    },
    profile(root, args, ctx) {
      return Quote.profile(ctx, args)
    },
    recommend(root, args, ctx) {
      return Quote.recommend(ctx, args)
    },
    marketStatus(root, args, ctx) {
      return MarketStatus.get(ctx, args)
    },
    quoteData(root, args, ctx) {
      return Quote.data(ctx, args)
    },
  },
}
