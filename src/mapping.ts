import type { Mapping } from '@graphprotocol/hypergraph/mapping';
import { Id } from '@graphprotocol/hypergraph';

export const mapping: Mapping = {
  TwitterActivity: {
    typeIds: [Id("8db974d2-bfc3-4dac-9708-620b7a738ffa")],
    properties: {
      id: Id("1da0a3ab-62f0-4768-a0ab-eeb6d51f6e83"),
      userAddress: Id("26fcae73-4922-4ba4-9684-9fdffe48ffdf"),
      activityType: Id("cd5eaf86-8e44-47a8-b94f-a8750bfc245f"),
      timestamp: Id("95101d17-a284-41b9-b71c-b6cc6bde0353"),
      content: Id("e4e3587f-aabb-4673-9ce2-6260446b79b6"),
      tweetId: Id("d1a3c4f6-9977-470c-9a5d-e9fc1a01cd63"),
      authorId: Id("a3cbc5b0-22d2-4cb0-94fb-c34365b6dcf5"),
      retweetCount: Id("2cee44ae-0391-47f6-8dfb-1ee3ab7d4225"),
      likeCount: Id("4f5956b2-f08b-4bb6-bc3f-083be809796c")
    },
  },
  DeadHandConfig: {
    typeIds: [Id("554d5911-32e5-4348-80f5-0480ae0556bc")],
    properties: {
      userAddress: Id("5be08394-6402-4bab-b3e0-65a5b5da368c"),
      smartAccount: Id("36b8fe49-c6f1-4408-a1af-737d0b5d2e07"),
      timeoutSeconds: Id("1be473ee-5771-43df-9407-4ed986307256"),
      isActive: Id("7799789a-6432-482b-b529-0dd57b179403"),
      createdAt: Id("8b23b601-97ef-49c2-9d64-08d289fe0ee1"),
      updatedAt: Id("8b89edcc-39d0-49e1-8c26-53e26b1b049c")
    },
  },
}