import { Entity, Type } from '@graphprotocol/hypergraph';

export class TwitterActivity extends Entity.Class<TwitterActivity>('TwitterActivity')({
  userAddress: Type.String,
  activityType: Type.String,
  timestamp: Type.Date,
  content: Type.String,
  tweetId: Type.String,
  authorId: Type.String,
  retweetCount: Type.Number,
  likeCount: Type.Number
}) {}

export class DeadHandConfig extends Entity.Class<DeadHandConfig>('DeadHandConfig')({
  userAddress: Type.String,
  smartAccount: Type.String,
  timeoutSeconds: Type.Number,
  isActive: Type.Boolean,
  createdAt: Type.Date,
  updatedAt: Type.Date
}) {}