import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { ObjectId } from 'mongodb';
import { User, Account, Session, VerificationToken } from './mongodb';
import { connectToDatabase } from './mongodb';
import type { Adapter } from '@auth/core/adapters';

// Helper function to convert MongoDB documents to plain objects
function docToObject(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };

  // Convert _id to id
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }

  return obj;
}

// Create a custom MongoDB adapter for NextAuth
export function MongooseAdapter(): Adapter {
  return {
    async createUser(data) {
      await connectToDatabase();
      const user = await User.create(data);
      return docToObject(user);
    },

    async getUser(id) {
      await connectToDatabase();
      const user = await User.findById(id);
      return docToObject(user);
    },

    async getUserByEmail(email) {
      await connectToDatabase();
      const user = await User.findOne({ email });
      return docToObject(user);
    },

    async getUserByAccount({ provider, providerAccountId }) {
      await connectToDatabase();
      const account = await Account.findOne({ provider, providerAccountId });
      if (!account) return null;

      const user = await User.findById(account.userId);
      return docToObject(user);
    },

    async updateUser(data) {
      await connectToDatabase();
      const { id, ...userData } = data;
      const user = await User.findByIdAndUpdate(id, { ...userData, updatedAt: new Date() }, { new: true });
      return docToObject(user);
    },

    async deleteUser(userId) {
      await connectToDatabase();
      await Promise.all([
        User.findByIdAndDelete(userId),
        Account.deleteMany({ userId: new ObjectId(userId) }),
        Session.deleteMany({ userId: new ObjectId(userId) }),
      ]);
      return null;
    },

    async linkAccount(data) {
      await connectToDatabase();
      const account = await Account.create(data);
      return docToObject(account);
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await connectToDatabase();
      await Account.findOneAndDelete({ provider, providerAccountId });
      return null;
    },

    async createSession(data) {
      await connectToDatabase();
      const session = await Session.create(data);
      return docToObject(session);
    },

    async getSessionAndUser(sessionToken) {
      await connectToDatabase();
      const session = await Session.findOne({ sessionToken });
      if (!session) return null;

      const user = await User.findById(session.userId);
      if (!user) return null;

      return {
        session: docToObject(session),
        user: docToObject(user),
      };
    },

    async updateSession(data) {
      await connectToDatabase();
      const { sessionToken, ...sessionData } = data;
      const session = await Session.findOneAndUpdate(
        { sessionToken },
        sessionData,
        { new: true }
      );
      return docToObject(session);
    },

    async deleteSession(sessionToken) {
      await connectToDatabase();
      await Session.findOneAndDelete({ sessionToken });
      return null;
    },

    async createVerificationToken(data) {
      await connectToDatabase();
      const verificationToken = await VerificationToken.create(data);
      return docToObject(verificationToken);
    },

    async useVerificationToken({ identifier, token }) {
      await connectToDatabase();
      const verificationToken = await VerificationToken.findOneAndDelete({
        identifier,
        token,
      });
      return docToObject(verificationToken);
    },
  };
}
