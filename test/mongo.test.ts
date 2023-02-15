import { MongoClient, Db, Collection } from 'mongodb';
import { bettySnyder, emmaGoldman } from './fixtures';

const uri = `mongodb://localhost:27017`;

describe('MongoDb', () => {
  const client = new MongoClient(uri);
  let db: Db | null = null;
  let collection: Collection | null = null;
  beforeAll(async () => {
    await client.connect();
    db = client.db('tokinanpa-test');
    collection = db.collection('rooms');
  });
  afterAll(async () => {
    await collection?.deleteMany({});
    await client.close();
  });
  it('can delete all the documents in a collection', async () => {
    await collection?.insertOne({ id: 'hello' });
    await collection?.deleteMany({});
    const count = await collection?.estimatedDocumentCount();
    expect(count).toEqual(0);
  });
  it('can add and remove users in room', async () => {
    const roomData = { id: 'hello', users: [] };
    await collection?.insertOne(roomData);
    await collection?.updateOne(
      { id: roomData.id },
      { $push: { users: { $each: [bettySnyder, emmaGoldman] } } }
    );
    let savedRoom = await collection?.findOne({ id: roomData.id });
    expect(savedRoom?.users).toEqual([bettySnyder, emmaGoldman]);
    await collection?.updateOne({ id: roomData.id }, { $pull: { users: bettySnyder } });
    savedRoom = await collection?.findOne({ id: roomData.id });
    expect(savedRoom?.users).toEqual([emmaGoldman]);
  });
});
