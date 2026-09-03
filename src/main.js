// main.js

import {
	loadSourceData,
	configureLcpManager
} from './data/loader.js';

import {
	createDefaultRoadmap
} from './data/roadmap.js';

import {
	initializeCatalog
} from './data/cumulativeCatalog.js';

import {
	configureHeader,
	initializeRenderPipeline
} from './ui/renderer.js';

loadSourceData();
createDefaultRoadmap();

// initialize roadmap planner
configureHeader();
initializeCatalog();
initializeRenderPipeline();
configureLcpManager();