
// Simple in-memory database for development/testing
class MemoryDB {
	constructor() {
		this.data = {};
		this.idCounter = 1;
	}

	// Create a new record
	create(collection, item) {
		if (!this.data[collection]) this.data[collection] = {};
		const id = this.idCounter++;
		this.data[collection][id] = { id, ...item };
		return this.data[collection][id];
	}

	// Read all records in a collection
	findAll(collection) {
		return Object.values(this.data[collection] || {});
	}

	// Read a single record by id
	findById(collection, id) {
		return (this.data[collection] || {})[id] || null;
	}

	// Update a record by id
	update(collection, id, updates) {
		if (!this.data[collection] || !this.data[collection][id]) return null;
		this.data[collection][id] = { ...this.data[collection][id], ...updates };
		return this.data[collection][id];
	}

	// Delete a record by id
	delete(collection, id) {
		if (!this.data[collection] || !this.data[collection][id]) return false;
		delete this.data[collection][id];
		return true;
	}
}

module.exports = new MemoryDB();
