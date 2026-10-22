const fs = require("fs");
const path = require("path");
const { dataDir } = require("../config/database");

class LocalStore {
  constructor(collectionName) {
    this.filePath = path.join(dataDir, `${collectionName}.json`);
    this._init();
  }

  _init() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]), "utf-8");
    }
  }

  _read() {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(data || "[]");
    } catch {
      return [];
    }
  }

  _write(items) {
    fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), "utf-8");
  }

  _matches(item, query = {}) {
    for (const [key, value] of Object.entries(query)) {
      if (key === "$or" && Array.isArray(value)) {
        const anyMatch = value.some((subQuery) => this._matches(item, subQuery));
        if (!anyMatch) return false;
      } else if (item[key] !== value) {
        return false;
      }
    }
    return true;
  }

  async find(query = {}) {
    const items = this._read();
    return items.filter((item) => this._matches(item, query));
  }

  async findOne(query = {}) {
    const items = this._read();
    return items.find((item) => this._matches(item, query)) || null;
  }

  async findById(id) {
    const items = this._read();
    return items.find((item) => item._id === id || item.id === id) || null;
  }

  async create(doc) {
    const items = this._read();
    const _id = doc._id || "doc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const newDoc = {
      ...doc,
      _id,
      id: _id,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.push(newDoc);
    this._write(items);
    return newDoc;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const items = this._read();
    const idx = items.findIndex((item) => item._id === id || item.id === id);
    if (idx === -1) return null;
    
    const updated = {
      ...items[idx],
      ...update,
      updatedAt: new Date().toISOString(),
    };
    items[idx] = updated;
    this._write(items);
    return updated;
  }

  async findOneAndUpdate(query, update, options = {}) {
    const items = this._read();
    const idx = items.findIndex((item) => this._matches(item, query));
    if (idx === -1) return null;

    const updated = {
      ...items[idx],
      ...update,
      updatedAt: new Date().toISOString(),
    };
    items[idx] = updated;
    this._write(items);
    return updated;
  }

  async findByIdAndDelete(id) {
    const items = this._read();
    const idx = items.findIndex((item) => item._id === id || item.id === id);
    if (idx === -1) return null;
    const removed = items.splice(idx, 1)[0];
    this._write(items);
    return removed;
  }

  async deleteMany(query = {}) {
    const items = this._read();
    const filtered = items.filter((item) => !this._matches(item, query));
    this._write(filtered);
    return { deletedCount: items.length - filtered.length };
  }
}

module.exports = { LocalStore };
