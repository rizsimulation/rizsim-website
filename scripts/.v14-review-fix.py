from pathlib import Path
p=Path('rizsim-analytics-v1.css');p.write_text(p.read_text()+'''
/* Price comparisons use a compact median/plot layout, not an oversized full-width SVG. */
@media(min-width:1050px){
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-dashboard[data-simulation=hotel]>.rz-a-panel:nth-child(2){display:grid;grid-template-columns:minmax(180px,.65fr) minmax(0,2fr);column-gap:16px;align-items:start}
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-dashboard[data-simulation=hotel]>.rz-a-panel:nth-child(2)>:is(h3,p,details){grid-column:1/-1}
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-dashboard[data-simulation=hotel]>.rz-a-panel:nth-child(2)>.rz-a-stats{grid-column:1;grid-row:3;grid-template-columns:1fr;margin:6px 0}
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-dashboard[data-simulation=hotel]>.rz-a-panel:nth-child(2)>.rz-a-chart{grid-column:2;grid-row:3;max-height:220px;margin:6px 0}
}
''')
p=Path('scripts/test_design_code_v14.py');s=p.read_text();old="   check(label+' released real-data price chart',p.locator(dash+' svg').count()==1)";new=old+"\n   if size[0]>=1050:\n    b=p.locator(dash+' svg').bounding_box();check(label+' complete priority price plot fits first screen',b['y']>=0 and b['y']+b['height']<=size[1]+2,b)";assert s.count(old)==1;p.write_text(s.replace(old,new))
