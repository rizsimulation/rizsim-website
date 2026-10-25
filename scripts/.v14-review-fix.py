from pathlib import Path
def append(path,text):
 p=Path(path);p.write_text(p.read_text()+text)
# Constrain decorative artwork to the layout viewport; no page-level overflow hiding.
rule='\n@media(max-width:550px){body[data-rz-surface=portal] .nav-glow{max-width:100%;box-sizing:border-box}}\n'
append('rizsim-analytics-v1.css',rule)
append('rizsim-student-classroom-v155.css',rule)
append('rizsim-analytics-v1.css','''
/* The generic reload heading is a sibling of the native result anchor. Keep it below the report. */
body[data-rz-surface=portal] #rzLiveV13Workspace #rzV13InsightsContent:has(.rz-a-dashboard)>.rz-v5-results-heading{order:2;margin:8px 0 0}
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-dashboard>.rz-a-panel:first-child{padding:10px 12px}
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-dashboard>.rz-a-panel:first-child>.rz-a-note{display:none}
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-dashboard>.rz-a-panel:first-child .rz-a-metric{padding:7px 10px}
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-dashboard>.rz-a-panel:first-child .rz-a-metric strong{font-size:23px!important;line-height:1.15}
@media(min-width:1050px){
body[data-rz-surface=portal] #view-classroom:has(.rz-v13-pane:not([hidden]) .rz-a-dashboard)>.content-shell{padding-top:14px!important}
body[data-rz-surface=portal] #view-classroom:has(.rz-v13-pane:not([hidden]) .rz-a-dashboard) .rz-live-heading{float:left;margin-right:18px!important;margin-bottom:0!important}
body[data-rz-surface=portal] #view-classroom:has(.rz-v13-pane:not([hidden]) .rz-a-dashboard) .rz-live-breadcrumb{min-height:24px;margin-bottom:6px!important;align-items:center}
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-priority .rz-a-panel{padding:10px 12px}
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-priority .rz-a-caution{padding:5px 7px;margin-top:5px;font-size:11px!important;line-height:1.4}
}
''')
