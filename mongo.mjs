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
// Returns an array of documents in JSON string format.
export function getDocuments(fieldName, fieldValue, collectionName, callback) {
	if (typeof(callback) !== 'function')
		throw new Error('The callback parameter must be a function.');
	
	const collection = db.collection(collectionName);

	// Check if any documents exist outright.
	collection.countDocuments({}, (err, result) => {
		if (err || result <= 0) {
			callback(JSON.stringify([]));
			return;
		}
	});

	// Query the database by fieldName and fieldValue.
	const query = collection.find({ [fieldName]: fieldValue }).toArray();

	// Return the result through the callback.
	query.then(
		(docs) => {
			callback(JSON.stringify(docs));
			return;
		},
		() => {
			callback(JSON.stringify([]));
			return;
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
		
		var updateValues = function(documentID) {
			docs[documentID]._id = mongoose.Types.ObjectId(docs[documentID]._id);
			collection.updateOne({ _id: docs[documentID]._id }, { $set: docs[documentID] }, (err) => {
				if (err)
					return callback({success: false, docs: docs });
			});
			completed.push(docs.pop()._id.toString());
		};
		
		for (var i = docs.length - 1; i >= 0; i--) {
			updateValues(i);
			continue;
		}
		
		return callback({success: true, docs: completed });
	}
}