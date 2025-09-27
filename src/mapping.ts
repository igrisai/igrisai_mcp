import type { Mapping } from '@graphprotocol/hypergraph/mapping';
import { Id } from '@graphprotocol/hypergraph';

export const mapping: Mapping = {
  TwitterActivity: {
    typeIds: [Id("6a00615b-22be-4ea2-a9f7-3554de51ee5f")],
    properties: {
      userAddress: Id("e89c3f5e-c542-4d3a-8622-3c36a2bd8e06"),
      activityType: Id("a4d517d6-a513-4d0e-9d63-838cf1d69a66"),
      timestamp: Id("384a9e0c-3560-4498-b285-97f44ed15669"),
      content: Id("61d9cb55-126f-4391-b686-1bb585eccf15"),
      tweetId: Id("59d2fb4c-1b01-4c11-ae5f-b78f4c18f764"),
      authorId: Id("af2d456b-6c98-4f7b-846d-010b220999bd"),
      retweetCount: Id("d8875ade-732b-483f-a43e-1eb6766f2e58"),
      likeCount: Id("319fff4e-c889-430d-923e-a24cdef1fbfa")
    },
  },
  DeadHandConfig: {
    typeIds: [Id("0fc413b5-4a26-49f1-a0d4-9aa44e84ddf2")],
    properties: {
      userAddress: Id("193ef709-30c4-4240-b0b2-c8e98911b367"),
      smartAccount: Id("af778fbf-b9e5-4f85-a0e5-ff5b31588113"),
      timeoutSeconds: Id("5ad85532-bdd7-4e62-a19e-9b67d64fa05d"),
      isActive: Id("22bdf7a5-a463-4334-acfe-37cbd4d8f436"),
      createdAt: Id("3c3f664b-eb5e-4c7c-82a3-9997288c30d6"),
      updatedAt: Id("31cbb19d-a22b-4346-9b34-53a0aadb192e")
    },
  },
}