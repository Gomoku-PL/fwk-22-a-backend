class MemoryDB {
  constructor() {
    this.data = {};
    this.idCounter = 1;
  }
  create(collection, item) {
    if (!this.data[collection]) this.data[collection] = {};
    const id = this.idCounter++;
    this.data[collection][id] = { id, ...item };
    return this.data[collection][id];
  }
  findAll(collection) {
    return Object.values(this.data[collection] || {});
  }
  findById(collection, id) {
    return (this.data[collection] || {})[id] || null;
  }
  update(collection, id, updates) {
    if (!this.data[collection] || !this.data[collection][id]) return null;
    this.data[collection][id] = { ...this.data[collection][id], ...updates };
    return this.data[collection][id];
  }
  delete(collection, id) {
    if (!this.data[collection] || !this.data[collection][id]) return false;
    delete this.data[collection][id];
    return true;
  }
}

const memorydb = new MemoryDB();
export default memorydb;
