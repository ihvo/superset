import { Popover, PopoverContent, PopoverTrigger } from "@superset/ui/popover";
import { toast } from "@superset/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LuLoaderCircle, LuRadioTower, LuX } from "react-icons/lu";
import { useIsV2CloudEnabled } from "renderer/hooks/useIsV2CloudEnabled";
import { useDashboardSidebarPortKill } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarPortsList/hooks/useDashboardSidebarPortKill";
import {
	type DashboardSidebarPortGroup,
	useDashboardSidebarPortsData,
} from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarPortsList/hooks/useDashboardSidebarPortsData";
import { navigateToV2Workspace } from "renderer/routes/_authenticated/_dashboard/utils/workspace-navigation";
import { STROKE_WIDTH } from "renderer/screens/main/components/WorkspaceSidebar/constants";
import { usePortsDisplayMode } from "renderer/stores/inline-workspace-ports";
import { TopBarPortRow } from "./components/TopBarPortRow";

/**
 * Top-bar entry point for the "topbar" ports layout: a compact pill showing
 * the live port count, opening a dropdown that lists every detected port
 * across all visible workspaces and hosts.
 *
 * Also mounted in the v2 workspace tab bar's trailing slot, which replaces
 * the top bar on that route.
 */
export function TopBarPortsDropdown() {
	const isV2CloudEnabled = useIsV2CloudEnabled();
	const portsDisplayMode = usePortsDisplayMode();

	// Only the inner component polls hosts for ports; when another layout owns
	// ports (or v1 is active) this surface stays fully inert.
	if (!isV2CloudEnabled || portsDisplayMode !== "topbar") {
		return null;
	}
	return <TopBarPortsDropdownInner />;
}

function TopBarPortsDropdownInner() {
	const [open, setOpen] = useState(false);
	const { workspacePortGroups, totalPortCount } =
		useDashboardSidebarPortsData();

	if (totalPortCount === 0) {
		return null;
	}

	const workspaceCount = workspacePortGroups.length;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<Tooltip delayDuration={300}>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<button
							type="button"
							aria-label={`Ports — ${totalPortCount} live`}
							className="flex items-center gap-1.5 rounded px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-fill-hover hover:text-foreground data-[state=open]:bg-fill-hover data-[state=open]:text-foreground"
						>
							<LuRadioTower className="size-3.5" strokeWidth={STROKE_WIDTH} />
							<span className="font-medium tabular-nums">{totalPortCount}</span>
						</button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom">
					<p className="text-xs">
						{totalPortCount === 1 ? "1 port" : `${totalPortCount} ports`} across{" "}
						{workspaceCount === 1
							? "1 workspace"
							: `${workspaceCount} workspaces`}
					</p>
				</TooltipContent>
			</Tooltip>
			<PopoverContent align="end" sideOffset={6} className="w-72 p-0">
				<div className="max-h-80 overflow-y-auto p-1">
					{workspacePortGroups.map((group) => (
						<TopBarPortsGroup
							key={group.workspaceId}
							group={group}
							onNavigate={() => setOpen(false)}
						/>
					))}
				</div>
				<TopBarPortsFooter
					groups={workspacePortGroups}
					totalPortCount={totalPortCount}
				/>
			</PopoverContent>
		</Popover>
	);
}

function TopBarPortsGroup({
	group,
	onNavigate,
}: {
	group: DashboardSidebarPortGroup;
	onNavigate: () => void;
}) {
	const navigate = useNavigate();
	const { isPending, killPorts } = useDashboardSidebarPortKill();

	const handleWorkspaceClick = () => {
		void navigateToV2Workspace(group.workspaceId, navigate);
		onNavigate();
	};

	const handleCloseAll = async () => {
		if (isPending) return;
		const results = await killPorts(group.ports);
		const closedCount = results.filter((result) => result.success).length;
		if (closedCount > 0) {
			toast.success(
				closedCount === 1 ? "Closed 1 port" : `Closed ${closedCount} ports`,
			);
		}
	};

	return (
		<div className="pb-1">
			<div className="group/wsheader flex items-center gap-1.5 px-2 pt-1.5 pb-0.5">
				<button
					type="button"
					onClick={handleWorkspaceClick}
					className="truncate font-medium text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
				>
					{group.workspaceName}
				</button>
				{group.hostType !== "local-device" && (
					<span className="shrink-0 font-mono text-[9px] text-muted-foreground/60 uppercase">
						remote
					</span>
				)}
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={() => void handleCloseAll()}
							disabled={isPending}
							aria-busy={isPending}
							aria-label={`Close all ports for ${group.workspaceName}`}
							className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/wsheader:opacity-100 disabled:pointer-events-none disabled:opacity-60"
						>
							{isPending ? (
								<LuLoaderCircle
									className="size-3 animate-spin"
									strokeWidth={STROKE_WIDTH}
								/>
							) : (
								<LuX className="size-3" strokeWidth={STROKE_WIDTH} />
							)}
						</button>
					</TooltipTrigger>
					<TooltipContent side="top">
						<p className="text-xs">Close all ports in this workspace</p>
					</TooltipContent>
				</Tooltip>
			</div>
			{group.ports.map((port) => (
				<TopBarPortRow
					key={`${port.hostId}:${port.terminalId}:${port.port}`}
					port={port}
					onNavigate={onNavigate}
				/>
			))}
		</div>
	);
}

function TopBarPortsFooter({
	groups,
	totalPortCount,
}: {
	groups: DashboardSidebarPortGroup[];
	totalPortCount: number;
}) {
	const { isPending, killPorts } = useDashboardSidebarPortKill();

	const handleCloseAll = async () => {
		if (isPending) return;
		const results = await killPorts(groups.flatMap((group) => group.ports));
		const closedCount = results.filter((result) => result.success).length;
		if (closedCount > 0) {
			toast.success(
				closedCount === 1 ? "Closed 1 port" : `Closed ${closedCount} ports`,
			);
		}
	};

	return (
		<div className="flex items-center justify-between border-border border-t px-3 py-1.5">
			<span className="text-[11px] text-muted-foreground">
				{totalPortCount === 1 ? "1 live port" : `${totalPortCount} live ports`}
			</span>
			<button
				type="button"
				onClick={() => void handleCloseAll()}
				disabled={isPending}
				aria-busy={isPending}
				className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-60"
			>
				{isPending ? (
					<LuLoaderCircle
						className="size-3 animate-spin"
						strokeWidth={STROKE_WIDTH}
					/>
				) : (
					<LuX className="size-3" strokeWidth={STROKE_WIDTH} />
				)}
				Close all
			</button>
		</div>
	);
}
