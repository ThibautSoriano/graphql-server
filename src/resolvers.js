import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';

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
const twitts = [{id: 0, title: "titre exemple", text:"contenu du twitt", votesCount: 2},
{id: 1, title: "lentilles", text:"se vendent à l'unité", votesCount: 1}];
let nextIdForTwitts = 2;

export const resolvers = {
  Query: {
    channels: () => {
      return channels;
    },
    channel: (root, { id }) => {
      return channels.find(channel => channel.id === id);
    },
    twitts: () => {
      console.log("query get list");
      return twitts;
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
    addTwitt: (root, args) => {
      console.log("call with ", args.title, args.text);
      const newTwitt = { id: String(nextIdForTwitts++), title: args.title, text: args.text, votesCount: 0 };
      twitts.push(newTwitt);
      console.log("global list : ", twitts);
      pubsub.publish('twittAdded', { twittAdded: newTwitt });
      return "success";
    },
    voteForTwitt: (root, args) => {
      console.log("vote for twitt ", args.id);
      twitts.forEach((currentTwitt) => {
        if (currentTwitt.id == args.id) {
          
          currentTwitt.votesCount++;
          console.log("current twitt votes: ", twitts);
          pubsub.publish('votesCountChanged', { votesCountChanged: currentTwitt });
        }
      });
      
      
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
