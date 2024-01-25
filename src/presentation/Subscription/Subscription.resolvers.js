import { v4 as uuidv4 } from 'uuid'
import Quote from '../../business/quote.js'

const withCancel = (asyncIterator, onCancel) => {
  const asyncReturn = asyncIterator.return

  asyncIterator.return = () => {
    onCancel()
    return asyncReturn
      ? asyncReturn.call(asyncIterator)
      : Promise.resolve({ value: undefined, done: true })
  }

  return asyncIterator
}

export default {
  Subscription: {
    quoteUpdate: {
      subscribe: async (root, args, ctx) => {
        const tickerId = `ticker_${uuidv4()}`
        console.log(`starting stream ${tickerId}`, args)
        const unsubscribe = await Quote.ticker(ctx, { ...args, tickerId })
        return withCancel(ctx.pubsub.asyncIterator(tickerId), () => {
          console.log(`closing stream ${tickerId}`)
          unsubscribe()
        })
      },
      resolve: (payload) => payload,
    },
  },
}
