import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import {MongoClient, ObjectId} from 'mongodb'

const pubsub = new PubSub();

const prepare = (o) => {
  o._id = o._id.toString()
  return o
};

let Sessions;
let Users;

export const loadDb = async () => {
  try {
    const MONGO_URL = 'mongodb://administrator:administrator1@ds159509.mlab.com:59509/retro-twitts';
    const db = await MongoClient.connect(MONGO_URL);
    Sessions = db.collection('sessions');
    Users = db.collection('users');

  } catch (e) {
    console.log(e)
  }
};

var mongoObjectId = function () {
  var timestamp = (new Date().getTime() / 1000 | 0).toString(16);
  return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
      return (Math.random() * 16 | 0).toString(16);
  }).toLowerCase();
};

var rand = function() {
  return Math.random().toString(36).substr(2); // remove `0.`
};

var token = function() {
  return rand() + rand(); // to make it longer
};

export const resolvers = {
  Query: {
    meurguez: (root, { zhengqin }) => {
      console.log(zhengqin);
    },
    sessions: async () => {
      console.log("query get sessions list");
      return (await Sessions.find({}).toArray()).map(prepare);
    },
    sessionById: async (root, { sessionId, userToken }) => {
      console.log("query get sessions BY ID", userToken);
      const session = prepare(await Sessions.findOne({_id: ObjectId(sessionId)}));
      let sessionToReturn = null;
      let user = null;
      // if token is not set on purpose, don't fetch user
      if (userToken === 'notSet') {
        sessionToReturn = {session: session, votesLeft: 999};
      } else {
        // find user by token
        user = prepare(await Users.findOne({token: userToken}));

        if (session === undefined || userToken === undefined || user === undefined) {
          return "";
        }
        // now look for user
        
        session.usersVotes.forEach(element => {
          if (element.user_id === user._id) {
            sessionToReturn = {session: session, votesLeft: element.votesLeft};
          }
        });
      }
      

      if (sessionToReturn !== null) {
        return sessionToReturn;
      }
      // create user in session if he doesn't exist
      const newUserVote = { user_id: user._id, votesLeft: 3 };
      const newUsersVotesArray = session.usersVotes;
      newUsersVotesArray.push(newUserVote);
      console.log(newUsersVotesArray);
      Sessions.updateOne(
        {_id: ObjectId(session._id) },
        { $set : { usersVotes: newUsersVotesArray}});

      return {session: prepare(await Sessions.findOne({_id: ObjectId(sessionId)})), votesLeft: 3};
    },
  },
  Mutation: {
    createUser: async (root, args) => {
      console.log("create user ", args);
      var userToken = token();
      const newUser = { name: args.name, token: userToken };
      const res = await Users.insert(newUser);
      
      return newUser;
    },
    updateUserName: async (root, args) => {
      console.log("update name for user ", args);
      const user = prepare(await Users.findOne({token: ObjectId(args.token)}));

      Sessions.updateOne(
        {_id: ObjectId(user._id) },
        { $set : { name: args.name}});
      
      return args.name;
    },
    addSession: async (root, args) => {
      console.log("add session ", args);
      const newSession = { name: args.name, twitts: [], usersVotes: [] };
      const res = await Sessions.insert(newSession);
      
      pubsub.publish('sessionAdded', { sessionAdded: newSession });
      return "success";
    },
    addTwitt: async (root, args) => {
      console.log("add twitt ", args);
      // find user by token
      const user = prepare(await Users.findOne({token: args.token}));
      const sessionToAddTwitt = prepare(await Sessions.findOne({_id: ObjectId(args.sessionId)}));
      if (sessionToAddTwitt === undefined || args.token === undefined || user === undefined) {
        return "";
      }

      
      const newArray = sessionToAddTwitt.twitts;
      const newTwitt = { _id: mongoObjectId(), title: args.title, text: args.text, votesCount: 0, postedBy: user.name };
      
      newArray.push(newTwitt);
      Sessions.updateOne(
        {_id: ObjectId(args.sessionId) },
        { $set : { twitts: newArray}});
      
      pubsub.publish('twittAdded', { twittAdded: newTwitt, sessionId: args.sessionId });
      return "success";
    },
    voteForTwitt: async (root, args) => {
      console.log("vote for twitt ", args.id, args.userToken);
      const sessionOfTwittToIncrement = prepare(await Sessions.findOne({_id: ObjectId(args.id)}));
      const user = prepare(await Users.findOne({token: userToken}));

      // look for the user
      for (let i = 0; i < sessionOfTwittToIncrement.usersVotes.length; i++) {
        if (sessionOfTwittToIncrement.usersVotes[i].user_id === user._id) {
          sessionOfTwittToIncrement.usersVotes[i].votesLeft--;

            for (let j = 0; j < sessionOfTwittToIncrement.twitts.length; j++) {
              if (sessionOfTwittToIncrement.twitts[j]._id === args.id) {
                sessionOfTwittToIncrement.twitts[j].votesCount++;
              }
            }
            
  
            Sessions.updateOne(
              {_id: ObjectId(args.sessionId) },
              { $set : { twitts: sessionOfTwittToIncrement.twitts, usersVotes: sessionOfTwittToIncrement.usersVotes}});

            pubsub.publish('votesCountChanged', { votesCountChanged: sessionOfTwittToIncrement });
            return "success";
        }
      }
      return "error";
      // sessionOfTwittToIncrement.votesCount++;
      // let newCount = sessionOfTwittToIncrement.votesCount;
      // Sessions.updateOne(
      //   {_id: ObjectId(args.id) },
      //   { $set : { votesCount: newCount}});

      
    },
  },
  Subscription: {
    twittAdded: {
      subscribe: withFilter(() => pubsub.asyncIterator('twittAdded'), (payload, variables) => {
        console.log(payload.sessionId === variables.sessionId);
        return payload.sessionId === variables.sessionId;
      }),
    },
    sessionAdded: {
      subscribe: withFilter(() => pubsub.asyncIterator('sessionAdded'), (payload, variables) => {
        return true;
      }),
    },
    votesCountChanged: {
      subscribe: withFilter(() => pubsub.asyncIterator('votesCountChanged'), (payload, variables) => {
        return true;
      }),
    }
  },
};
