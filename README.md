# MongoDB Wrapper for alt:V
---

Remember to 🌟 this Github if you 💖 it.


---

**IMPORTANT:**

Make sure you have package.json in your main directory.
You can do this by doing `npm init`


### Installation
Move files / folders accordingly.

```
resources/
└── mongo-v/
    ├── client.mjs
    ├── mongo.mjs
    ├── config.json
    └── resource.cfg
```

Add mongodb to your resource dependencies:
```
deps: [
    mongo-v
]
```

Install mongoose in your main server folder:
```
npm install --save mongoose
```

### Usage
Your import path is very straight forward.

**Importing**
```
import * as mongov from 'mongo-v';
```

**IMPORTANT** When you're trying to overwrite the `._id` of a document; it must be within 12 bytes (No longer than 12 characters)

**General Functions**
```js
import * as mongov from 'mongo-v';

// Recieve a connect event.
alt.on('dbConnect', (msg) => {
	console.log(msg);

	// I only call this function after we know there's a connection to the database.
	doSomeDatabaseStuff();
});

// Recieve a disconnect event.
alt.on('dbDisconnect', (msg) => {
	console.log(msg);
});

// An error in the database.
alt.on('dbError', (err) => {
	throw err;
});

// Just a dummy function.
function doSomeDatabaseStuff() {
	const testData = {
		name: 'stuyk',
		numbers: 123,
		password: 'abc'
	};
	
	// Insert Data
	// Params: objectAsJSONString, CollectionName
	mongov.insertDocuments(JSON.stringify(testData), 'players');

	mongov.getCollection('players', (result) => {
		var docs = JSON.parse(result);

		console.log(docs);
	});
	
	// Get Data
	// Params: fieldName, fieldValue, collectionName, callback
	mongov.getDocuments('name', 'stuyk', 'players', (resultsAsArray) => {
		var docs = JSON.parse(resultsAsArray);
	
		if (docs.length <= 0)
			return new Error('No documents were found.');
	
		console.log(docs[0]._id);
		docs[0].name = 'stuyk1234';
		docs[0].numbers = 1521521;
		docs[0].password = 'abc123';
	
		// Update Data
		// Params: objectAsJSONString, collectionName, callback
		mongov.updateDocuments(JSON.stringify(docs), 'players', (res) => {
			if (!res.success) {
				console.log(res.docs); // Returns a list of un-updated documents.
				return new Error('Failed to update any documents.');
			}
	
			console.log(res.docs); // Returns a list of updated documents.
		});
	});
}
```

