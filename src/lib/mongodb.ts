import mongoose from 'mongoose';

const MONGODB_URI = process.env.DATABASE_URL as string;

if (!MONGODB_URI) {
  throw new Error('Please define the DATABASE_URL environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Define Mongoose schemas and models

// User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  emailVerified: Date,
  phoneVerified: Date,
  image: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // Account abstraction related fields
  solanaAddress: { type: String, unique: true, sparse: true },
  encryptedKeypair: String,
  hasPasscode: { type: Boolean, default: false },
  passcodeSetAt: Date,
});

// Account Schema
const AccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  provider: String,
  providerAccountId: String,
  refresh_token: String,
  access_token: String,
  expires_at: Number,
  token_type: String,
  scope: String,
  id_token: String,
  session_state: String,
});

// Create a compound unique index
AccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

// Session Schema
const SessionSchema = new mongoose.Schema({
  sessionToken: { type: String, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expires: Date,
});

// Verification Token Schema
const VerificationTokenSchema = new mongoose.Schema({
  identifier: String,
  token: String,
  expires: Date,
});

// Create a compound unique index
VerificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true });

// Transaction Schema
const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  txData: String, // JSON stringified transaction data
  status: String, // pending, approved, rejected, executed
  signature: String, // Transaction signature when executed
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  executedAt: Date,
});

// PaymasterInfo Schema
const PaymasterInfoSchema = new mongoose.Schema({
  networkName: String,
  gasSponsored: { type: Number, default: 0 },
  lastSponsoredAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create models (only if they don't already exist)
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Account = mongoose.models.Account || mongoose.model('Account', AccountSchema);
export const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);
export const VerificationToken = mongoose.models.VerificationToken || mongoose.model('VerificationToken', VerificationTokenSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const PaymasterInfo = mongoose.models.PaymasterInfo || mongoose.model('PaymasterInfo', PaymasterInfoSchema);
