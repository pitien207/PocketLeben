// Storage for accounts, login tokens and cloud saves. Two backends with the same async API:
//   - MongoDB API when MONGO_URI is set (production: Azure Cosmos DB for MongoDB; database MONGO_DB, default "visahunter")
//   - JSON files in DATA_DIR otherwise (local development, tests)
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Messages kept per conversation (older ones drop off). */
export const DM_KEEP = 100
export const emptySocial = () => ({ friends: [], incoming: [], outgoing: [], blocked: [] })
/** Conversation id of two accounts (order-independent). */
export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** A login token stays valid this long after its last use ("remember me": using the game renews it). */
export const TOKEN_DAYS = 365
/** Renew a token's date at most this often (saves writes). */
const TOUCH_MS = 86_400_000

/**
 * @typedef {{ name: string, salt: string | null, hash: string | null, created: number }} User
 * @typedef {{ friends: string[], incoming: string[], outgoing: string[], blocked: string[] }} Social
 * @typedef {{ from: string, text: string, at: number }} Dm
 *   (salt/hash null = an account created with Google, no password)
 * @typedef {{
 *   kind: string,
 *   getUser(key: string): Promise<User | null>,
 *   createUser(key: string, user: User): Promise<boolean>,
 *   createToken(token: string, user: string): Promise<void>,
 *   tokenUser(token: string): Promise<string | null>,
 *   deleteToken(token: string): Promise<void>,
 *   googleUser(sub: string): Promise<string | null>,
 *   googleOf(user: string): Promise<string | null>,
 *   getSocial(user: string): Promise<Social>,
 *   setSocial(user: string, social: Social): Promise<void>,
 *   getDms(pair: string): Promise<Dm[]>,
 *   addDm(pair: string, dm: Dm): Promise<void>,
 *   linkGoogle(sub: string, user: string, email: string | null): Promise<boolean>,
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
  const google = db.collection('google')
  const social = db.collection('social')
  const dms = db.collection('dms')
  // Old tokens disappear by themselves (TTL index on the creation date).
  // (Cosmos DB's MongoDB API only allows TTL on _ts: then expiry is just checked in code.)
  await tokens.createIndex({ at: 1 }, { expireAfterSeconds: TOKEN_DAYS * 86_400 }).catch(() => {})
  await google.createIndex({ user: 1 }).catch(() => {})
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
      if (!doc || expired(doc.at.getTime())) return null
      if (Date.now() - doc.at.getTime() > TOUCH_MS) await tokens.updateOne({ _id: token }, { $set: { at: new Date() } }).catch(() => {})
      return doc.user
    },
    async deleteToken(token) {
      await tokens.deleteOne({ _id: token })
    },
    async googleUser(sub) {
      return (await google.findOne({ _id: sub }))?.user ?? null
    },
    async googleOf(user) {
      const doc = await google.findOne({ user })
      return doc ? (doc.email ?? '') : null
    },
    async linkGoogle(sub, user, email) {
      try {
        await google.insertOne({ _id: sub, user, email, at: new Date() })
        return true
      } catch (e) {
        if (e?.code === 11000) return false
        throw e
      }
    },
    // Saves are stored as a JSON string: flag names contain dots ("quest.start"), which
    // field names in document databases don't handle well.
    async getSave(user) {
      const doc = await saves.findOne({ _id: user })
      return doc ? { save: JSON.parse(doc.data), savedAt: doc.savedAt } : null
    },
    async getSocial(user) {
      const doc = await social.findOne({ _id: user })
      return doc ? { ...emptySocial(), friends: doc.friends ?? [], incoming: doc.incoming ?? [], outgoing: doc.outgoing ?? [], blocked: doc.blocked ?? [] } : emptySocial()
    },
    async setSocial(user, data) {
      await social.replaceOne({ _id: user }, { friends: data.friends, incoming: data.incoming, outgoing: data.outgoing, blocked: data.blocked }, { upsert: true })
    },
    async getDms(pair) {
      return (await dms.findOne({ _id: pair }))?.msgs ?? []
    },
    // Read-modify-write keeps it portable (Cosmos DB's MongoDB API and plain MongoDB).
    async addDm(pair, dm) {
      const msgs = [...((await dms.findOne({ _id: pair }))?.msgs ?? []), dm].slice(-DM_KEEP)
      await dms.replaceOne({ _id: pair }, { msgs, at: new Date() }, { upsert: true })
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
  /** @type {{ users: Record<string, User>, tokens: Record<string, { user: string, at: number }>, google: Record<string, { user: string, email: string | null }> }} */
  const db = { users: {}, tokens: {}, google: {}, social: {}, dms: {}, ...(existsSync(ACCOUNTS) ? JSON.parse(readFileSync(ACCOUNTS, 'utf8')) : {}) }
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
      if (!t || expired(t.at) || !db.users[t.user]) return null
      if (Date.now() - t.at > TOUCH_MS) {
        t.at = Date.now()
        persist()
      }
      return t.user
    },
    async googleUser(sub) {
      return db.google[sub]?.user ?? null
    },
    async googleOf(user) {
      const link = Object.values(db.google).find((g) => g.user === user)
      return link ? (link.email ?? '') : null
    },
    async linkGoogle(sub, user, email) {
      if (db.google[sub]) return false
      db.google[sub] = { user, email }
      persist()
      return true
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
    async getSocial(user) {
      return { ...emptySocial(), ...(db.social[user] ?? {}) }
    },
    async setSocial(user, data) {
      db.social[user] = data
      persist()
    },
    async getDms(pair) {
      return db.dms[pair] ?? []
    },
    async addDm(pair, dm) {
      db.dms[pair] = [...(db.dms[pair] ?? []), dm].slice(-DM_KEEP)
      persist()
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
