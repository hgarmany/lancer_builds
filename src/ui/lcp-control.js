import { parseLcpArchive } from '../data/lcp.js';
import {
	deleteStoredLcpArchive,
	loadStoredLcpArchives,
	saveLcpArchive
} from '../data/lcp-storage.js';
import {
	getInstalledLcpPackages,
	installLcpPackage,
	removeLcpPackage
} from '../data/loader.js';

export async function restoreStoredLcpPackages() {
	const errors = [];

	try {
		for (const storedPackage of await loadStoredLcpArchives()) {
			try {
				const lcpPackage = parseLcpArchive(
					storedPackage.archive
				);
				installLcpPackage(lcpPackage, { replace: true });
			}
			catch (error) {
				errors.push(
					`${storedPackage.id}: ${error.message}`
				);
			}
		}
	}
	catch (error) {
		errors.push(`Stored LCPs could not be loaded: ${error.message}`);
	}

	return errors;
}

export function initializeLcpControl({
	onDataChanged,
	initialErrors = []
} = {}) {
	const manager = document.getElementById('lcp-manager');
	const installButton = document.getElementById('lcp-install');
	const fileInput = document.getElementById('lcp-file');
	const packageList = document.getElementById('lcp-packages');
	const packageCount = document.getElementById('lcp-count');
	const status = document.getElementById('lcp-status');

	if (
		!manager ||
		!installButton ||
		!fileInput ||
		!packageList
	) {
		return;
	}

	renderInstalledPackages(packageList, packageCount);

	if (initialErrors.length > 0) {
		setStatus(status, initialErrors.join('\n'), {
			invalid: true
		});
	}

	installButton.addEventListener(
		'click',
		() => fileInput.click()
	);
	fileInput.addEventListener('change', async () => {
		const [file] = fileInput.files;
		fileInput.value = '';

		if (!file)
			return;

		setStatus(status, `Reading ${file.name}…`);

		try {
			const archive = await file.arrayBuffer();
			const lcpPackage = parseLcpArchive(archive);
			const existing = getInstalledLcpPackages().some(
				entry => entry.id === lcpPackage.id
			);

			installLcpPackage(lcpPackage, { replace: true });
			onDataChanged?.();
			renderInstalledPackages(packageList, packageCount);

			try {
				await saveLcpArchive(lcpPackage.id, archive);
				setStatus(
					status,
					`${existing ? 'Updated' : 'Installed'} ` +
						`${lcpPackage.manifest.name} ` +
						`${lcpPackage.manifest.version}.`
				);
			}
			catch (storageError) {
				console.error(storageError);
				setStatus(
					status,
					`${lcpPackage.manifest.name} is active for this ` +
						'session, but could not be saved.',
					{ invalid: true }
				);
			}
		}
		catch (error) {
			console.error(error);
			setStatus(status, error.message || 'LCP import failed.', {
				invalid: true
			});
		}
	});

	packageList.addEventListener('click', async event => {
		const removeButton = event.target.closest(
			'button[data-package-id]'
		);
		if (!removeButton)
			return;

		const packageId = removeButton.dataset.packageId;
		const installed = getInstalledLcpPackages().find(
			entry => entry.id === packageId
		);

		removeButton.disabled = true;

		try {
			removeLcpPackage(packageId);
			onDataChanged?.();
			renderInstalledPackages(packageList, packageCount);

			try {
				await deleteStoredLcpArchive(packageId);
				setStatus(
					status,
					`Removed ${installed?.name ?? packageId}.`
				);
			}
			catch (storageError) {
				console.error(storageError);
				setStatus(
					status,
					`${installed?.name ?? packageId} was removed ` +
						'for this session, but its saved copy could ' +
						'not be deleted.',
					{ invalid: true }
				);
			}
		}
		catch (error) {
			removeButton.disabled = false;
			console.error(error);
			setStatus(status, error.message || 'Removal failed.', {
				invalid: true
			});
		}
	});
}

function renderInstalledPackages(packageList, packageCount) {
	const installedPackages = getInstalledLcpPackages();

	packageList.replaceChildren(
		...installedPackages.map(lcpPackage => {
			const item = document.createElement('li');
			const identity = document.createElement('span');
			const removeButton = document.createElement('button');

			identity.textContent =
				`${lcpPackage.name} ${lcpPackage.version}`;
			identity.title = lcpPackage.author;
			removeButton.type = 'button';
			removeButton.dataset.packageId = lcpPackage.id;
			removeButton.textContent = 'Remove';
			removeButton.setAttribute(
				'aria-label',
				`Remove ${lcpPackage.name}`
			);
			item.append(identity, removeButton);
			return item;
		})
	);

	if (installedPackages.length === 0) {
		const emptyItem = document.createElement('li');
		emptyItem.className = 'empty';
		emptyItem.textContent = 'No supplemental packages installed.';
		packageList.append(emptyItem);
	}

	if (packageCount)
		packageCount.textContent = String(installedPackages.length);
}

function setStatus(status, message, { invalid = false } = {}) {
	if (!status)
		return;

	status.textContent = message;
	status.title = message;
	status.classList.toggle('invalid', invalid);
}
