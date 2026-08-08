// ui/renderModules.js

import {
	srcData
} from '../data/loader.js';

export const roadmapName = document.getElementById('roadmap-name');
export const maxLevelInput = document.getElementById('roadmap-max-level');
const levelRail = document.querySelector(".level-rail");
const levelTabs = document.getElementById("level-tabs");

const roadmapShell = document.getElementById("roadmap-shell");
const roadmapContainer = document.querySelector(".roadmap-container");
export const tableBody = document.getElementById("roadmap-body");
const tableHead = document.querySelector("#roadmap-table thead");

export function getFrameImageSrc(frameId) {
	return srcData.frames.get(frameId)?.image_url;
}