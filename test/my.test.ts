import { MongoClient, Db, Collection } from 'mongodb';
import { Brand } from '../src/lib/Brand';

const uri = `mongodb://localhost:27017`;

const aRoom = (): Room => ({
  id: '12345' as RoomId,
  name: 'My-Test-Room' as RoomName,
  users: [],
  history: []
});

const thomas = 'Thomas' as User;
const hadrien = 'Hadrien' as User;
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
    await collection?.insertOne({ ...aRoom(), name: '' });
    await collection?.deleteMany({});
    const count = await collection?.estimatedDocumentCount();
    expect(count).toEqual(0);
  });
  it('can add and remove users in room', async () => {
    const room = aRoom();
    await collection?.insertOne(room);
    await collection?.updateOne(
      { id: room.id },
      { $push: { users: { $each: [hadrien, thomas] } } }
    );
    let savedRoom = await collection?.findOne({ id: room.id });
    expect(savedRoom?.users).toEqual([hadrien, thomas]);
    await collection?.updateOne({ id: room.id }, { $pull: { users: hadrien } });
    savedRoom = await collection?.findOne({ id: room.id });
    expect(savedRoom?.users).toEqual([thomas]);
  });
});

type RoomId = Brand<string, 'RoomId'>;
type RoomName = Brand<string, 'RoomName'>;
type User = Brand<string, 'User'>;

type Room = {
  id: RoomId;
  name: RoomName;
  users: User[];
  history: unknown[];
};
