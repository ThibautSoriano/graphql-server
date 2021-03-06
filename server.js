
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

// import {MongoClient, ObjectId} from 'mongodb';
import {loadDb} from './src/resolvers';


// const start = async () => {
//   try {
//     const MONGO_URL = 'mongodb://administrator:administrator1@ds159509.mlab.com:59509/retro-twitts';
//     const db = await MongoClient.connect(MONGO_URL);
//     const Twitts = db.collection('twitts');

loadDb();

    const PORT = 4000;
  // const PORT = process.env.PORT;
  const server = express();

  // server.use('*', cors({ origin: 'https://thibaut-client.herokuapp.com/' }));
  server.use(cors());

  server.use('/graphql', bodyParser.json(), graphqlExpress({
    schema
  }));

  // deploy to heroku : put wss instead of ws and remove :4000 for the port
  server.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    subscriptionsEndpoint: `ws://localhost:4000/subscriptions`
  }));

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
  

//   } catch (e) {
//     console.log(e)
//   }

// };

// start();
