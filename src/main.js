// main.js

import {
    importCoreData
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

// grab official massif press data
importCoreData();

// configure a blank roadmap
createDefaultRoadmap();

// initialize roadmap planner
configureHeader();
initializeCatalog();
initializeRenderPipeline();