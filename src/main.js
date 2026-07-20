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

// grab official massif press data
importCoreData();

// configure a blank roadmap
const roadmap = createRoadmap({ maxLevel: 12 });

// initialize roadmap planner
wireRoadmapHeader(roadmap);
initializeRoadmapCatalog(roadmap);
initializeRoadmapView(roadmap);