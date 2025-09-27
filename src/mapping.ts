import type { Mapping } from '@graphprotocol/hypergraph/mapping';
import { Id } from '@graphprotocol/hypergraph';

export const mapping: Mapping = {
  TwitterActivity: {
    typeIds: [Id("ad1af1e8-4545-4df4-bfaf-9dc63c7f5265")],
    properties: {
      id: Id("78d66d05-0921-4ed1-a21b-17994333a75e"),
      userAddress: Id("930f55a8-3818-4e45-9288-23c90ef44c97"),
      activityType: Id("1ddb2260-32db-444d-bd70-f5bf26fa9ea2"),
      timestamp: Id("152ba0db-e295-48df-9813-2b198fd5fd17"),
      content: Id("e68d7d0a-bfa4-48a9-9a2f-63baa691d80d"),
      tweetId: Id("f9cbfe3c-64a2-41ba-b99e-0c95fc6daf9e"),
      authorId: Id("a07c4df9-d087-4c1e-becf-ed066c8c21d4"),
      retweetCount: Id("006db4d8-fc12-4813-88a9-4b357a55abad"),
      likeCount: Id("0afd19a7-82df-4258-a8ee-c98a01c09a41")
    },
  },
}