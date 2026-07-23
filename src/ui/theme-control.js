// src/ui/theme-control.js

const STORAGE_KEY = "lancer-roadmap-theme";
const LIGHT_THEME = "gms-light";
const DARK_THEME = "gms-dark";

function updateThemeControl(button, theme) {
	const isDark = theme === DARK_THEME;
	const activeLabel = isDark ? "GMS Dark" : "GMS Light";
	const nextLabel = isDark ? "GMS Light" : "GMS Dark";

	button.setAttribute("aria-pressed", String(isDark));
	button.setAttribute(
		"aria-label",
		`Theme: ${activeLabel}. Switch to ${nextLabel}.`
	);
	button.querySelector("strong").textContent = activeLabel;
}

function setTheme(button, theme, { persist = false } = {}) {
	document.documentElement.dataset.theme = theme;
	updateThemeControl(button, theme);

	if (persist) {
		localStorage.setItem(STORAGE_KEY, theme);
	}
}

export function initializeThemeControl() {
	const button = document.querySelector("#theme-toggle");
	if (!button) return;

	const initialTheme =
		document.documentElement.dataset.theme === DARK_THEME
			? DARK_THEME
			: LIGHT_THEME;

	setTheme(button, initialTheme);
	button.addEventListener("click", () => {
		const nextTheme =
			document.documentElement.dataset.theme === DARK_THEME
				? LIGHT_THEME
				: DARK_THEME;

		setTheme(button, nextTheme, { persist: true });
	});
}
