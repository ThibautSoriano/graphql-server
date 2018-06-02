import {
  makeExecutableSchema,
  addMockFunctionsToSchema,
} from 'graphql-tools';

import { resolvers } from './resolvers';

const typeDefs = `
type Channel {
  id: ID!                # "!" denotes a required field
  name: String
  messages: [Message]!
}

input MessageInput{
  channelId: ID!
  text: String
}

type Message {
  id: ID!
  text: String
}

type Twitt {
  _id: String!
  title: String
  text: String
  votesCount: Int
}

# This type specifies the entry points into our API
type Query {
  channels: [Channel]    # "[]" means this is a list of channels
  channel(id: ID!): Channel
  twitts: [Twitt]
}

# The mutation root type, used to define all mutations
type Mutation {
  addChannel(name: String!): Channel
  addMessage(message: MessageInput!): Message
  addTwitt(title: String!, text: String!): String
  voteForTwitt(id: String!): String
}

# The subscription root type, specifying what we can subscribe to
type Subscription {
  messageAdded(channelId: ID!): Message
  twittAdded(s: String): Twitt
  votesCountChanged(s: String): Twitt
}
`;

const schema = makeExecutableSchema({ typeDefs, resolvers });
export { schema };
