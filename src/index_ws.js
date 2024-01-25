import { WebSocketServer } from 'ws' // yarn add ws
// import ws from 'ws'; yarn add ws@7
// const WebSocketServer = ws.Server;
import { useServer } from 'graphql-ws/lib/use/ws'
import { schema } from './presentation/schema'
import { PubSub } from 'graphql-subscriptions'

const pubsub = new PubSub()

const server = new WebSocketServer({
  port: 4000,
  path: '/',
})

useServer({ context: { pubsub }, schema }, server)

console.log('Listening to port 4000')
