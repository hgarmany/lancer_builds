const DATABASE_NAME = 'lancer-roadmap';
const DATABASE_VERSION = 1;
const STORE_NAME = 'lcp-packages';

export async function loadStoredLcpArchives() {
	const database = await openDatabase();
	const records = await requestAsPromise(
		database
			.transaction(STORE_NAME, 'readonly')
			.objectStore(STORE_NAME)
			.getAll()
	);

	database.close();
	return records.sort(
		(left, right) => left.installedAt - right.installedAt
	);
}

export async function saveLcpArchive(packageId, archive) {
	const database = await openDatabase();
	const transaction = database.transaction(
		STORE_NAME,
		'readwrite'
	);

	transaction.objectStore(STORE_NAME).put({
		id: packageId,
		archive,
		installedAt: Date.now()
	});
	await transactionAsPromise(transaction);
	database.close();
}

export async function deleteStoredLcpArchive(packageId) {
	const database = await openDatabase();
	const transaction = database.transaction(
		STORE_NAME,
		'readwrite'
	);

	transaction.objectStore(STORE_NAME).delete(packageId);
	await transactionAsPromise(transaction);
	database.close();
}

function openDatabase() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(
			DATABASE_NAME,
			DATABASE_VERSION
		);

		request.addEventListener('upgradeneeded', () => {
			const database = request.result;

			if (!database.objectStoreNames.contains(STORE_NAME)) {
				database.createObjectStore(STORE_NAME, {
					keyPath: 'id'
				});
			}
		});
		request.addEventListener(
			'success',
			() => resolve(request.result)
		);
		request.addEventListener(
			'error',
			() => reject(request.error)
		);
	});
}

function requestAsPromise(request) {
	return new Promise((resolve, reject) => {
		request.addEventListener(
			'success',
			() => resolve(request.result)
		);
		request.addEventListener(
			'error',
			() => reject(request.error)
		);
	});
}

function transactionAsPromise(transaction) {
	return new Promise((resolve, reject) => {
		transaction.addEventListener('complete', resolve);
		transaction.addEventListener(
			'error',
			() => reject(transaction.error)
		);
		transaction.addEventListener(
			'abort',
			() => reject(transaction.error)
		);
	});
}
