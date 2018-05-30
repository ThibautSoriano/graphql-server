
import express from 'express';
import {
  graphqlExpress,
  graphiqlExpress,
} from 'graphql-server-express';
import bodyParser from 'body-parser';
import cors from 'cors';

import { schema } from './src/schema';

import { execute, subscribe } from 'graphql';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';

const PORT = process.env.PORT;
const server = express();
// const path = require("path");

// server.use('*', cors({ origin: 'https://thibaut-client.herokuapp.com/' }));
server.use(cors());

server.use('/graphql', bodyParser.json(), graphqlExpress({
  schema
}));

server.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
  subscriptionsEndpoint: `wss://localhost/subscriptions`
}));

// var distDir = __dirname + "/build/";
// server.use(express.static(distDir));

// server.get('*', function (request, response){
//   response.sendFile(path.resolve(__dirname, 'build', 'index.html'))
// })

// We wrap the express server so that we can attach the WebSocket for subscriptions
const ws = createServer(server);

ws.listen(PORT, () => {
  console.log(`GraphQL Server is now running on http://localhost:${PORT}`);

  // Set up the WebSocket for handling GraphQL subscriptions
  new SubscriptionServer({
    execute,
    subscribe,
    schema
  }, {
    server: ws,
    path: '/subscriptions',
  });
});
