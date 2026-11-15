// Storage for accounts, login tokens and cloud saves. Two backends with the same async API:
//   - MongoDB API when MONGO_URI is set (production: Azure Cosmos DB for MongoDB; database MONGO_DB, default "visahunter")
//   - JSON files in DATA_DIR otherwise (local development, tests)
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Login tokens stay valid this long (renewed by logging in again). */
export const TOKEN_DAYS = 180

/**
 * @typedef {{ name: string, salt: string, hash: string, created: number }} User
 * @typedef {{
 *   kind: string,
 *   getUser(key: string): Promise<User | null>,
 *   createUser(key: string, user: User): Promise<boolean>,
 *   createToken(token: string, user: string): Promise<void>,
 *   tokenUser(token: string): Promise<string | null>,
 *   deleteToken(token: string): Promise<void>,
 *   getSave(user: string): Promise<{ save: object, savedAt: number } | null>,
 *   putSave(user: string, save: object, savedAt: number): Promise<void>,
 *   close(): Promise<void>,
 * }} Store
 */

const expired = (at) => Date.now() - at > TOKEN_DAYS * 86_400_000

/** @returns {Promise<Store>} */
export async function openStore({ mongoUri, mongoDb, dataDir }) {
  return mongoUri ? openMongo(mongoUri, mongoDb) : openFiles(dataDir)
}

// --- MongoDB API (Cosmos DB for MongoDB, DocumentDB, plain MongoDB) ----------------------
async function openMongo(uri, dbName) {
  const { MongoClient } = await import('mongodb')
  const client = new MongoClient(uri, { appName: 'visa-hunter', serverSelectionTimeoutMS: 15_000 })
  await client.connect()
  const db = client.db(dbName)
  const users = db.collection('users')
  const tokens = db.collection('tokens')
  const saves = db.collection('saves')
  // Old tokens disappear by themselves (TTL index on the creation date).
  await tokens.createIndex({ at: 1 }, { expireAfterSeconds: TOKEN_DAYS * 86_400 }).catch(() => {})
  return {
    kind: `mongodb (${dbName})`,
    async getUser(key) {
      const doc = await users.findOne({ _id: key })
      return doc ? { name: doc.name, salt: doc.salt, hash: doc.hash, created: doc.created } : null
    },
    async createUser(key, user) {
      try {
        await users.insertOne({ _id: key, ...user })
        return true
      } catch (e) {
        if (e?.code === 11000) return false // duplicate name
        throw e
      }
    },
    async createToken(token, user) {
      await tokens.insertOne({ _id: token, user, at: new Date() })
    },
    async tokenUser(token) {
      const doc = await tokens.findOne({ _id: token })
      return doc && !expired(doc.at.getTime()) ? doc.user : null
    },
    async deleteToken(token) {
      await tokens.deleteOne({ _id: token })
    },
    // Saves are stored as a JSON string: flag names contain dots ("quest.start"), which
    // field names in document databases don't handle well.
    async getSave(user) {
      const doc = await saves.findOne({ _id: user })
      return doc ? { save: JSON.parse(doc.data), savedAt: doc.savedAt } : null
    },
    async putSave(user, save, savedAt) {
      await saves.replaceOne({ _id: user }, { data: JSON.stringify(save), savedAt, updated: new Date() }, { upsert: true })
    },
    close: () => client.close(),
  }
}

// --- JSON files ---------------------------------------------------------------------------
function openFiles(dir) {
  mkdirSync(join(dir, 'saves'), { recursive: true })
  const ACCOUNTS = join(dir, 'accounts.json')
  /** @type {{ users: Record<string, User>, tokens: Record<string, { user: string, at: number }> }} */
  const db = existsSync(ACCOUNTS) ? JSON.parse(readFileSync(ACCOUNTS, 'utf8')) : { users: {}, tokens: {} }
  const writeAtomic = (file, text) => {
    const tmp = `${file}.${process.pid}.tmp`
    writeFileSync(tmp, text)
    renameSync(tmp, file)
  }
  let timer = null
  const persist = () => {
    clearTimeout(timer)
    timer = setTimeout(() => writeAtomic(ACCOUNTS, JSON.stringify(db)), 200)
  }
  const saveFile = (user) => join(dir, 'saves', `${Buffer.from(user).toString('hex')}.json`)
  return {
    kind: `files (${dir})`,
    async getUser(key) {
      return db.users[key] ?? null
    },
    async createUser(key, user) {
      if (db.users[key]) return false
      db.users[key] = user
      persist()
      return true
    },
    async createToken(token, user) {
      db.tokens[token] = { user, at: Date.now() }
      persist()
    },
    async tokenUser(token) {
      const t = db.tokens[token]
      return t && !expired(t.at) && db.users[t.user] ? t.user : null
    },
    async deleteToken(token) {
      delete db.tokens[token]
      persist()
    },
    async getSave(user) {
      const file = saveFile(user)
      if (!existsSync(file)) return null
      const save = JSON.parse(readFileSync(file, 'utf8'))
      return { save, savedAt: save.savedAt }
    },
    async putSave(user, save) {
      writeAtomic(saveFile(user), JSON.stringify(save))
    },
    async close() {
      clearTimeout(timer)
      writeAtomic(ACCOUNTS, JSON.stringify(db))
    },
  }
}
