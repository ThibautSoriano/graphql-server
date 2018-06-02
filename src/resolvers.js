import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import {MongoClient, ObjectId} from 'mongodb'

const channels = [{
  id: '1',
  name: 'soccer',
  messages: [{
    id: '1',
    text: 'soccer is football',
  }, {
    id: '2',
    text: 'hello soccer world cup',
  }]
}, {
  id: '2',
  name: 'baseball',
  messages: [{
    id: '3',
    text: 'baseball is life',
  }, {
    id: '4',
    text: 'hello baseball world series',
  }]
}];
let nextId = 3;
let nextMessageId = 5;

const pubsub = new PubSub();
// const twitts = [{id: 0, title: "titre exemple", text:"contenu du twitt", votesCount: 2},
// {id: 1, title: "lentilles", text:"se vendent à l'unité", votesCount: 1}];
let nextIdForTwitts = 0;

const prepare = (o) => {
  o._id = o._id.toString()
  return o
};

let Twitts;

export const loadDb = async () => {
  try {
    const MONGO_URL = 'mongodb://administrator:administrator1@ds159509.mlab.com:59509/retro-twitts';
    const db = await MongoClient.connect(MONGO_URL);
    Twitts = db.collection('twitts');

  } catch (e) {
    console.log(e)
  }
};

export const resolvers = {
  Query: {
    channels: () => {
      return channels;
    },
    channel: (root, { id }) => {
      return channels.find(channel => channel.id === id);
    },
    twitts: async () => {
      console.log("query get list");
    //   const MONGO_URL = 'mongodb://administrator:administrator1@ds159509.mlab.com:59509/retro-twitts';
    // const db = await MongoClient.connect(MONGO_URL);
    // const Twitts = db.collection('twitts');
      return (await Twitts.find({}).toArray()).map(prepare);
      // return twitts;
    },
  },
  Mutation: {
    addChannel: (root, args) => {
      const newChannel = { id: String(nextId++), messages: [], name: args.name };
      channels.push(newChannel);
      return newChannel;
    },
    addMessage: (root, { message }) => {
      const channel = channels.find(channel => channel.id === message.channelId);
      if(!channel)
        throw new Error("Channel does not exist");

      const newMessage = { id: String(nextMessageId++), text: message.text };
      channel.messages.push(newMessage);

      pubsub.publish('messageAdded', { messageAdded: newMessage, channelId: message.channelId });

      return newMessage;
    },
    addTwitt: async (root, args) => {
      // console.log("new id ", newId.id);
      const newTwitt = { title: args.title, text: args.text, votesCount: 0 };
        const res = await Twitts.insert(newTwitt);
        // return "success";
      console.log("call with ", args.title, args.text);
      
      // twitts.push(newTwitt);
      // console.log("global list : ", (await Twitts.find({}).toArray()).map(prepare));
      // console.log("global list : ", twitts);
      pubsub.publish('twittAdded', { twittAdded: newTwitt });
      return "success";
    },
    voteForTwitt: async (root, args) => {
      console.log("vote for twitt ", args.id);
      const twittToIncrement = prepare(await Twitts.findOne({_id: ObjectId(args.id)}));
      
      twittToIncrement.votesCount++;
      let newCount = twittToIncrement.votesCount;
      console.log("new count", newCount);
      Twitts.updateOne(
        {_id: ObjectId(args.id) }, //find criteria
        // this row contains fix with $set oper
        { $set : { votesCount: newCount}});

        pubsub.publish('votesCountChanged', { votesCountChanged: twittToIncrement });
      // twitts.forEach((currentTwitt) => {
      //   if (currentTwitt.id == args.id) {
          
      //     currentTwitt.votesCount++;
      //     console.log("current twitt votes: ", twitts);
          
      //   }
      // });
      
      
      return "success";
    },
  },
  Subscription: {
    messageAdded: {
      subscribe: withFilter(() => pubsub.asyncIterator('messageAdded'), (payload, variables) => {
        // The `messageAdded` channel includes events for all channels, so we filter to only
        // pass through events for the channel specified in the query
        return payload.channelId === variables.channelId;
      }),
    },
    twittAdded: {
      subscribe: withFilter(() => pubsub.asyncIterator('twittAdded'), (payload, variables) => {
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
