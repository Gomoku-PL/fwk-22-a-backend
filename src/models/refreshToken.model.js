import mongoose from "mongoose";

const storageType = process.env.STORAGE_TYPE || "memory";

// In-memory fallback store
const memory = [];

let RefreshTokenModel;

if (storageType === "mongodb") {
  const schema = new mongoose.Schema(
    {
      userId: { type: String, required: true, index: true },
      token: { type: String, required: true, unique: true }, // store a hash in production
      revoked: { type: Boolean, default: false, index: true },
      createdAt: { type: Date, default: Date.now },
      revokedAt: { type: Date },
    },
    { collection: "refresh_tokens" }
  );

  RefreshTokenModel =
    mongoose.models.RefreshToken || mongoose.model("RefreshToken", schema);
} else {
  // Minimal in-memory lookalike with mongoose-like API
  class RefreshTokenMemoryModel {
    constructor(doc) {
      Object.assign(this, doc);
      if (!this.createdAt) this.createdAt = new Date();
      if (typeof this.revoked !== "boolean") this.revoked = false;
    }
    async save() {
      const existing = memory.find((m) => m.token === this.token);
      if (existing) Object.assign(existing, this);
      else memory.push(this);
      return this;
    }
    static async findOne(query) {
      return (
        memory.find((m) =>
          Object.entries(query).every(([k, v]) => m[k] === v)
        ) || null
      );
    }
    static async updateOne(filter, update) {
      const doc = await this.findOne(filter);
      if (!doc) return { matchedCount: 0, modifiedCount: 0 };
      if (update.$set) Object.assign(doc, update.$set);
      return { matchedCount: 1, modifiedCount: 1 };
    }
    static async updateMany(filter, update) {
      let count = 0;
      for (const doc of memory) {
        const match = Object.entries(filter).every(([k, v]) => doc[k] === v);
        if (match) {
          if (update.$set) Object.assign(doc, update.$set);
          count++;
        }
      }
      return { modifiedCount: count };
    }
  }
  RefreshTokenModel = RefreshTokenMemoryModel;
}

export default RefreshTokenModel;