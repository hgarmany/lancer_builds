// render/renderer.js

import {
    roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	srcData
} from '../data/loader.js';

import {
    tableBody
} from './wires.js';

function renderLevelUpCell(level) {
    const cell = document.createElement('td');
    const cellContent = document.createElement('div');

    cell.append(cellContent);
    return cell;
}

function renderFrameCell(level) {
    const cell = document.createElement('td');
    const cellContent = document.createElement('div');

    const activeFrame = cumulativeCatalog.activeFrame[level];
    const icon = document.createElement('img');
    icon.src = srcData.frames[activeFrame]?.image_url ?? '';

    cellContent.append(icon);
    cell.append(cellContent);
    return cell;
}

function renderStatsCell(level) {
    const cell = document.createElement('td');
    const cellContent = document.createElement('div');

    cell.append(cellContent);
    return cell;
}

function renderWeaponsCell(level) {
    const cell = document.createElement('td');
    const cellContent = document.createElement('div');

    cell.append(cellContent);
    return cell;
}

function renderSystemsCell(level) {
    const cell = document.createElement('td');
    const cellContent = document.createElement('div');

    cell.append(cellContent);
    return cell;
}

function renderLevelRow(level) {
    const row = document.createElement('tr');

    row.append(
        renderLevelUpCell(level),
        renderFrameCell(level),
        renderStatsCell(level),
        renderWeaponsCell(level),
        renderSystemsCell(level)
    );

    return row;
}

export function initializeRenderPipeline() {
    tableBody.append(
        ...Array.from(
            { length: roadmap.maxLevel },
            (_, index) => renderLevelRow(index)
        )
    );
}