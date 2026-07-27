import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

/**
 * EXPERIMENT: where workspace ports render.
 *
 * This store is the single source of truth for the ports-layout experiment —
 * read it everywhere via {@link usePortsDisplayMode} (or the narrower
 * {@link useInlineWorkspacePortsEnabled}).
 *
 * - "inline": ports render as a chip under each workspace item.
 * - "panel": ports render in the consolidated panel at the bottom of the
 *   sidebar.
 * - "topbar": ports render as a dropdown from the top bar (and the workspace
 *   tab bar, which replaces the top bar on the v2 workspace route); the
 *   sidebar shows no ports at all.
 *
 * To conclude the experiment, pick the winning layout and remove the others:
 *   1. This store + `usePortsDisplayMode` + `useInlineWorkspacePortsEnabled`.
 *   2. The mode select in `ExperimentalSettings` and its `settings-search`
 *      entry (`EXPERIMENTAL_INLINE_WORKSPACE_PORTS`).
 *   3. The mode branches in `DashboardSidebar` (bottom
 *      `DashboardSidebarPortsList` + ports-provider gating),
 *      `DashboardSidebarWorkspaceChips` (the inline ports chip), `TopBar`,
 *      and the v2 workspace page's tab-bar trailing slot
 *      (`TopBarPortsDropdown`).
 *   4. The components belonging to the losing layouts:
 *      - bottom: `DashboardSidebarPortsList` (keep its `hooks/` +
 *        `DashboardSidebarPortBadge`).
 *      - inline: `DashboardSidebarPortsChip` (under
 *        `DashboardSidebarWorkspaceChips`).
 *      - topbar: `TopBarPortsDropdown` (under `TopBar/components`).
 *
 * The inline and panel layouts read port data from
 * `DashboardSidebarPortsProvider`; the topbar layout reads
 * `useDashboardSidebarPortsData` directly (the sidebar provider is disabled
 * in that mode so polling isn't duplicated).
 */
export type PortsDisplayMode = "inline" | "panel" | "topbar";

interface InlineWorkspacePortsState {
	mode: PortsDisplayMode;
	setMode: (mode: PortsDisplayMode) => void;
}

export const useInlineWorkspacePortsStore = create<InlineWorkspacePortsState>()(
	devtools(
		persist(
			(set) => ({
				mode: "inline",
				setMode: (mode) => set({ mode }),
			}),
			{
				name: "inline-workspace-ports",
				version: 1,
				// v0 persisted `{ enabled: boolean }` for the inline-vs-panel A/B.
				migrate: (persisted, version) => {
					if (version === 0 && persisted && typeof persisted === "object") {
						const { enabled } = persisted as { enabled?: boolean };
						return { mode: enabled === false ? "panel" : "inline" };
					}
					return persisted as InlineWorkspacePortsState;
				},
			},
		),
		{ name: "InlineWorkspacePortsStore" },
	),
);

/** Single read path for the ports-layout experiment. */
export function usePortsDisplayMode(): PortsDisplayMode {
	return useInlineWorkspacePortsStore((state) => state.mode);
}

/** True when ports render inline under each workspace item. */
export function useInlineWorkspacePortsEnabled(): boolean {
	return useInlineWorkspacePortsStore((state) => state.mode === "inline");
}
