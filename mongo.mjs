import * as alt from 'alt';
import mongoose from 'mongoose';
import * as fs from 'fs';

// Stuyk
// Basic MongoDB setup for cross resource usage.
// Read the configuration file; and connect to the database.
const config = JSON.parse(fs.readFileSync('./resources/mongo-v/config.json'));
const db = mongoose.createConnection(config.url, {useNewUrlParser: true, poolSize: config.poolSize});

// Relayed events from Mongoose.
db.on('connected', () => { alt.emit('dbConnect', config.connectMessage); });
db.on('error', (err) => { alt.emit('dbError', err); });
db.on('disconnected', () => { alt.emit('dbDisconnect', config.disconnectMessage); });

// Read data from database.
// Returns undefined if no documents are found / in collection.
// Returns an array of documents in JSON string format.
export function getDocuments(fieldName, fieldValue, collectionName, callback) {
	if (typeof(callback) !== 'function')
		throw new Error('The callback parameter must be a function.');
	
	const collection = db.collection(collectionName);

	// Check if any documents exist outright.
	collection.countDocuments({}, (err, result) => {
		if (err || result <= 0) {
			return callback(undefined);
		}
	});

	// Query the database by fieldName and fieldValue.
	const query = collection.find({ [fieldName]: fieldValue }).toArray();

	// Return the result through the callback.
	query.then(
		(docs) => {
			if (docs.length <= 0)
				return callback(undefined);
			console.log(docs);
			return callback(JSON.stringify(docs));
		},
		() => {
			return callback(undefined);
		}
	);
}

// Insert documents into a database.
// Returns nothing.
export function insertDocuments(jsonString, collectionName) {
	const collection = db.collection(collectionName);
	var docs;

	try {
		docs = JSON.parse(jsonString);
	} catch(err) {
		return new Error('Failed to parse JSON data.', err);
	}

	if (!docs)
		return new Error('Documents are undefined.');

	if (Array.isArray(docs)) {
		collection.insertMany(docs, {}, (err) => {
			if (err)
				throw err;
			return;
		});
	}

	collection.insertOne(docs, {}, (err) => {
		if (err)
			throw err;
		return;
	});
}

// Update documents in a database.
// Returns {success: true/false, docs: array of completed/incomplete documents} dependent on success.
export function updateDocuments(jsonString, collectionName, callback) {
	if (typeof(callback) !== 'function')
		throw new Error('The callback parameter must be a function.');
	
	var collection = db.collection(collectionName);
	var docs;

	try {
		docs = JSON.parse(jsonString);
	} catch(err) {
		return new Error('Documents are undefined.');
	}

	if (!docs)
		return new Error('Documents are undefined.');

	if(!Array.isArray(docs)) {
		docs._id = mongoose.Types.ObjectId(docs._id);

		collection.updateOne({ _id: docs._id }, { $set: docs }, (err) => {
			if (err)
				return callback({success: false, docs: docs});
			return callback({success: true, docs: [docs._id.toString()]});
		});
	} else {
		var completed = [];
		for (var i = docs.length - 1; i >= 0; i--) {
			docs[i]._id = mongoose.Types.ObjectId(docs[i]._id);
			collection.updateOne({ _id: docs[i]._id }, { $set: docs[i] }, (err) => {
				if (err)
					return callback({success: false, docs: docs });
			});
			completed.push(docs.pop()._id.toString());
			continue;
		}
		return callback({success: true, docs: completed });
	}
}