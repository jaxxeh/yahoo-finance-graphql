import QueryResolvers from './Query/Query.resolvers.js'
import SubscriptionResolvers from './Subscription/Subscription.resolvers.js'

export default {
  ...QueryResolvers,
  ...SubscriptionResolvers,
}
