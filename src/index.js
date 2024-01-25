import { createServer } from 'http'
import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { ApolloServer } from 'apollo-server-express'
import express from 'express'
import { PubSub } from 'graphql-subscriptions'
import schema from './presentation/schema.js'

const PORT = 4000
const GRAPHQL_PATH = '/'

async function startApolloServer() {
  // Required logic for integrating with Express
  const app = express()
  const httpServer = createServer(app)

  const pubsub = new PubSub()

  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: (_cp, _ws, context) => {
        return {
          context,
          pubsub,
        }
      },
    },
    {
      server: httpServer,
      path: GRAPHQL_PATH,
    },
  )

  // Same ApolloServer initialization as before, plus the drain plugin.
  const server = new ApolloServer({
    schema,
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close()
            },
          }
        },
      },
    ],
  })

  // More required logic for integrating with Express
  await server.start()
  server.applyMiddleware({
    app,

    // By default, apollo-server hosts its GraphQL endpoint at the
    // server root. However, *other* Apollo Server packages host it at
    // /graphql. Optionally provide this to match apollo-server.
    path: GRAPHQL_PATH,
  })

  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`,
    )
  })
}

startApolloServer()
