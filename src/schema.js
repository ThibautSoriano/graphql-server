import {
  makeExecutableSchema,
  addMockFunctionsToSchema,
} from 'graphql-tools';

import { resolvers } from './resolvers';

const typeDefs = `
type User {
  _id: String!
  name: String
  token: String
  sessions: [String]
}

type UserVote {
  user_id: String!
  votesLeft: Int
}

type Session {
  _id: String!
  name: String
  twitts: [Twitt]
  maxVotesAllowed: Int
  usersVotes: [UserVote]
}

type Twitt {
  _id: String!
  title: String
  text: String
  votesCount: Int
  postedBy: String
}

type SessionWithVotes {
  session: Session
  votesLeft: Int
}
# This type specifies the entry points into our API
type Query {
  sessions: [Session]
  sessionById(sessionId: String!, userToken: String!): SessionWithVotes
  meurguez(zhengqin: String): String
}

# The mutation root type, used to define all mutations
type Mutation {
  addSession(name: String): String
  addTwitt(sessionId: String!, title: String!, text: String!, token: String!): String
  voteForTwitt(id: String!): String
  createUser(name: String): User
  updateUserName(newName: String!, token: String!): String
}

# The subscription root type, specifying what we can subscribe to
type Subscription {
  twittAdded(sessionId: String!): Twitt
  votesCountChanged(s: String): Twitt
  sessionAdded(s: String): Session
}
`;

const schema = makeExecutableSchema({ typeDefs, resolvers });
export { schema };
