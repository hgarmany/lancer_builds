// src/main.js

import { importCoreData } from './data/loader.js';
import {
	createRoadmap,
	initializeRoadmapCatalog
} from './model/roadmap.js';
import {
	wireRoadmapHeader,
	initializeRoadmapView
} from './ui/roadmap-view.js';
import { initializeThemeControl } from './ui/theme-control.js';
import {
	initializeLcpControl,
	restoreStoredLcpPackages
} from './ui/lcp-control.js';

initializeThemeControl();

// grab official massif press data
importCoreData();
const lcpRestoreErrors = await restoreStoredLcpPackages();

// configure a blank roadmap
const roadmap = createRoadmap({ maxLevel: 12 });

// initialize roadmap planner
wireRoadmapHeader(roadmap);
initializeRoadmapCatalog(roadmap);
initializeRoadmapView(roadmap, {
	catalogIsInitialized: true
});
initializeLcpControl({
	initialErrors: lcpRestoreErrors,
	onDataChanged() {
		initializeRoadmapCatalog(roadmap);
		initializeRoadmapView(roadmap, {
			catalogIsInitialized: true
		});
	}
});
