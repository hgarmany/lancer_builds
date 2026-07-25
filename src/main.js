// main.js

import {
    importCoreData
} from './data/loader.js';

import {
    createRoadmap
} from './data/roadmap.js';

import {
    initializeCatalog
} from './data/cumulativeCatalog.js';

import {
    wireHeader
} from './wires.js';

import {
    initializeRenderPipeline
} from './render/renderer.js';

// grab official massif press data
importCoreData();

// configure a blank roadmap
createRoadmap();

// initialize roadmap planner
wireHeader();
initializeCatalog();
initializeRenderPipeline();