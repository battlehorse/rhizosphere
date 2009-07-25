rhizo={};rhizo.log=function(e,c){var b=c||"info";var h="#888";switch(b){case"error":h="#ff0000";break;
case"warning":h="#ffff00";break}var g=new Date();var a=g.getHours()+":"+g.getMinutes()+":"+g.getSeconds()+" ";
var f=$("<p class='rhizo-log-"+b+"'>"+a+e+"</p>");$("#rhizo-console-contents").prepend(f);if(c){f.effect("highlight",{color:h},1000)
}if(!$("#rhizo-console-contents").is(":visible")&&c){$("#rhizo-console-header").effect("highlight",{color:h},1000)
}};rhizo.error=function(a){rhizo.log(a,"error")};rhizo.warning=function(a){rhizo.log(a,"warning")};$p=null;
rhizo.Project=function(c,b,a){this.models_=[];this.metaModel_=c;this.renderer_=b;this.modelsMap_={};this.selectionMap_={};
this.layoutName_="flow";this.layouEngine_=null;this.numShownModels_=this.models_.length;this.options_={selectfilter:":visible"};
if(a){$.extend(this.options_,a)}$p=this};rhizo.Project.prototype.deploy=function(a){$(document).ready(function(){$p.initUI_();
if(a){$p.addModels(a)}})};rhizo.Project.prototype.initUI_=function(){rhizo.ui.init(this.options_);this.initSelectionSupport_();
this.performanceTuning_();this.renderFilters_();rhizo.log("*** Ready!")};rhizo.Project.prototype.addModels=function(a){this.models_=jQuery.map(a,function(b){return new rhizo.model.SuperModel(b)
});this.numShownModels_=this.models_length;if(!this.checkModels_()){return}this.buildModelsMap_();this.models_.forEach(this.initializeModel_,this);
this.numShownModels_=10000;this.layout(this.layoutName_);this.alignVisibility(true)};rhizo.Project.prototype.countShownModels=function(){return this.numShownModels_
};rhizo.Project.prototype.model=function(a){return this.modelsMap_[a]};rhizo.Project.prototype.metaModel=function(){return this.metaModel_
};rhizo.Project.prototype.renderer=function(){return this.renderer_};rhizo.Project.prototype.resetAllFilter=function(a){this.models_.forEach(function(b){b.resetFilter(a)
})};rhizo.Project.prototype.select=function(b){var a=this.model(b);this.selectionMap_[b]=a;a.selected=true;
$("#"+b).addClass("ui-selected");rhizo.log("Selected "+a)};rhizo.Project.prototype.unselect=function(b){var a=this.model(b);
this.selectionMap_[b]=null;delete this.selectionMap_[b];a.selected=false;$("#"+b).removeClass("ui-selected");
rhizo.log("Unselected "+a)};rhizo.Project.prototype.unselectAll=function(){for(id in this.selectionMap_){this.unselect(id)
}};rhizo.Project.prototype.isSelected=function(a){return this.selectionMap_[a]};rhizo.Project.prototype.allSelected=function(){return this.selectionMap_
};rhizo.Project.prototype.allUnselected=function(){return $.grep(this.models_,function(a){return !$p.selectionMap_[a.id]
})};rhizo.Project.prototype.initSelectionSupport_=function(){$("#rhizo-viewport").selectable({selected:function(a,b){if(b.selected.id){$p.select(b.selected.id)
}},unselected:function(a,b){if(b.unselected.id){$p.unselect(b.unselected.id)}},filter:$p.options_.selectfilter});
$("#rhizo-viewport").mouseup(function(a,b){if(a.originalTarget==this){$p.unselectAll()}})};rhizo.Project.prototype.performanceTuning_=function(){rhizo.ui.performanceTuning(this.options_.noAnims)
};rhizo.Project.prototype.renderFilters_=function(){var a=$("#rhizo-filter-container");var c=true;for(key in this.metaModel_){var b=this.metaModel_[key].kind.renderFilter(this.metaModel_[key],key);
if(this.options_.miniRender){if(c){c=false}else{b.css("display","none")}}a.append(b)}};rhizo.Project.prototype.checkModels_=function(){rhizo.log("Checking models...");
var a=true;this.models_.forEach(function(b){if(!b.id){modelsAreCorret=false;rhizo.error("Verify your models: missing ids.")
}});return a};rhizo.Project.prototype.buildModelsMap_=function(){rhizo.log("Building models map...");
this.models_.forEach(function(a){this.modelsMap_[a.id]=a},this)};rhizo.Project.prototype.initializeModel_=function(b){var a=rhizo.model.kickstart(b,this.renderer_,$("#rhizo-universe"),this.options_);
$(a).css("position","absolute").css("top",0).css("left",0).css("display","none");$("#rhizo-universe").append(a)
};rhizo.Project.prototype.layout=function(d,c){var b=d?d:this.layoutName_;var a=rhizo.layout.layouts[b];
if(!a){rhizo.error("Invalid layout engine:"+b)}else{rhizo.log("layouting...");if(this.layoutEngine_&&this.layoutEngine_.cleanup){this.layoutEngine_.cleanup()
}this.layoutName_=b;this.layoutEngine_=a;$("#rhizo-universe").move(0,0,0,0);var e=jQuery.grep(this.models_,function(f){return !f.isFiltered()
});a.layout("#rhizo-universe",e,this.metaModel_,c)}};rhizo.Project.prototype.filter=function(a,b){if(!this.metaModel_[a]){rhizo.error("Invalid filtering key: "+a)
}if(b!=""){this.models_.forEach(function(c){if(this.metaModel_[a].kind.survivesFilter(b,c.unwrap()[a])){c.resetFilter(a)
}else{c.filter(a)}},this)}else{this.models_.forEach(function(c){c.resetFilter(a)})}this.alignVisibility();
this.layout(null,{filter:true})};rhizo.Project.prototype.alignVisibility=function(b){var a=0;this.models_.forEach(function(c){a+=c.isFiltered()?0:1;
if(c.isFiltered()){$("#"+c.id).fadeOut()}});if(!b){this.numShownModels_=a}this.models_.forEach(function(c){if(!c.isFiltered()){$("#"+c.id).fadeIn()
}});if(b){this.numShownModels_=a}};rhizo.meta={};rhizo.meta.StringKind=function(){};rhizo.meta.StringKind.prototype.renderFilter=function(c,b){var a=$("<input type='text' />");
$(a).change(function(d){$p.filter(b,$(this).val())});return $("<div class='rhizo-filter' />").append(c.label+": ").append($(a))
};rhizo.meta.StringKind.prototype.survivesFilter=function(b,a){return b!=""&&a.toLowerCase().indexOf(b.toLowerCase())!=-1
};rhizo.meta.StringKind.prototype.cluster=function(a){return a.toUpperCase().charAt(0)};rhizo.meta.NumberKind=function(){};
rhizo.meta.NumberKind.prototype.renderFilter=rhizo.meta.StringKind.prototype.renderFilter;rhizo.meta.NumberKind.prototype.survivesFilter=function(c,a){var b=parseInt(c,10);
if(isNaN(b)){return true}else{return b==a}};rhizo.meta.NumberKind.prototype.compare=function(a,b){return parseInt(a,10)-parseInt(b,10)
};rhizo.meta.NumberKind.prototype.cluster=function(d){var f=parseInt(d,10);if(parseFloat(d)<=10){return f
}var c=0;while(f>=100){f=parseInt(f/10);c++}var e=Math.pow(10,c);var a=parseInt(d/e,10)*e;var b=parseInt(d/e+1,10)*e;
return a.toString()+" - "+b.toString()};rhizo.meta.RangeKind=function(){};rhizo.meta.RangeKind.prototype.renderFilter=function(h,k){var b=$("<div id='rhizo-slider-"+k+"' />");
var e=$("<div class='ui-slider-handle'></div>");var j=$("<div class='ui-slider-handle' style='left: 160px'></div>");
var i=$("<strong>"+h.min+"</strong>");var g=$("<strong>"+h.max+"</strong>");var l=this.toFilterScale_(h.min);
var d=this.toFilterScale_(h.max);var a;if(h.stepping){a=this.toFilterScale_(h.stepping)}var f=(function(){var m=this;
return function(p,q){var n=$("#rhizo-slider-"+k).slider("value",0);var o=$("#rhizo-slider-"+k).slider("value",1);
if(n==q.value){i.text(m.toModelScale_(n)).addClass("rhizo-slider-moving");g.removeClass("rhizo-slider-moving")
}else{g.text(m.toModelScale_(o)).addClass("rhizo-slider-moving");i.removeClass("rhizo-slider-moving")
}}}).call(this);var c=(function(){var m=this;return function(p,q){var n=Math.max($("#rhizo-slider-"+k).slider("value",0),l);
var o=Math.min($("#rhizo-slider-"+k).slider("value",1),d);i.text(m.toModelScale_(n)).removeClass("rhizo-slider-moving");
g.text(m.toModelScale_(o)).removeClass("rhizo-slider-moving");$p.filter(k,{min:n,max:o})}}).call(this);
$(b).append($(e));$(b).append($(j));$(b).slider({stepping:h.stepping,steps:h.steps,range:true,min:l,max:d,slide:f,change:c});
return $("<div class='rhizo-filter' />").append(h.label+": ").append($(i)).append(" to ").append($(g)).append($(b))
};rhizo.meta.RangeKind.prototype.survivesFilter=function(d,a){var b=this.toModelScale_(d.min);var c=this.toModelScale_(d.max);
return a>=b&&a<=c};rhizo.meta.RangeKind.prototype.compare=rhizo.meta.NumberKind.prototype.compare;rhizo.meta.RangeKind.prototype.cluster=rhizo.meta.NumberKind.prototype.cluster;
rhizo.meta.RangeKind.prototype.toModelScale_=function(a){return a};rhizo.meta.RangeKind.prototype.toFilterScale_=function(a){return a
};rhizo.meta.BooleanKind=function(){};rhizo.meta.BooleanKind.prototype.renderFilter=function(c,b){var a=$("<select />");
a.append("<option value=''>-</option>");a.append("<option value='true'>Yes</option>");a.append("<option value='false'>No</option>");
$(a).change(function(d){$p.filter(b,$(this).val())});return $("<div class='rhizo-filter' />").append(c.label+": ").append($(a))
};rhizo.meta.BooleanKind.prototype.survivesFilter=function(c,a){var b=c=="true";return b==a};rhizo.meta.BooleanKind.prototype.compare=function(a,b){return a?(b?0:-1):(b?1:0)
};rhizo.meta.CategoryKind=function(){};rhizo.meta.CategoryKind.prototype.renderFilter=function(c,b){var a=$("<select "+(c.multiple?'multiple size="4" ':"")+" style='vertical-align:top' />");
a.append("<option value=''>-</option>");c.categories.forEach(function(d){a.append("<option value='"+d+"'>"+d+"</option>")
});$(a).change(function(e){var d=[$(this).val()];if(c.multiple){d=$.grep($(this).val(),function(f){return f!=""
})}$p.filter(b,d)});return $("<div class='rhizo-filter' />").append(c.label+": ").append($(a))};rhizo.meta.CategoryKind.prototype.survivesFilter=function(c,a){var b=false;
c.forEach(function(d){if(a.indexOf(d)!=-1){b=true}});return b};rhizo.meta.CategoryKind.prototype.cluster=function(a){return a.length==0?"Nothing":a
};rhizo.meta.CategoryKind.prototype.compare=function(a,b){return a.length-b.length};rhizo.meta.sortBy=function(a,b,c){return function(h,f){var d=h.unwrap();
var g=f.unwrap();var e=c?-1:1;if(b.compare){return b.compare(d[a],g[a])*e}else{return(d[a]<g[a]?-1:d[a]>g[a]?1:0)*e
}}};rhizo.meta.sortByKind=function(a){return function(b,c){if(a.compare){return a.compare(b,c)}else{return b<c?-1:b>c?1:0
}}};rhizo.meta.Kind={STRING:new rhizo.meta.StringKind(),NUMBER:new rhizo.meta.NumberKind(),RANGE:new rhizo.meta.RangeKind(),BOOLEAN:new rhizo.meta.BooleanKind(),CATEGORY:new rhizo.meta.CategoryKind()};
rhizo.layout={};rhizo.layout.NoLayout=function(){};rhizo.layout.NoLayout.prototype.layout=function(a,b,d,c){};
rhizo.layout.NoLayout.prototype.toString=function(){return"-"};rhizo.layout.FlowLayout=function(b,a){this.top=b||5;
this.left=a||5};rhizo.layout.FlowLayout.prototype.layout=function(b,c,k,l){var j=$(b).width();var h=0;
var d=$("#rhizo-flowlayout-order").val();var g=$("#rhizo-flowlayout-desc:checked").length>0;if(d){rhizo.log("Sorting by "+d);
c.sort(rhizo.meta.sortBy(d,k[d].kind,g))}for(var e=0,f=c.length;e<f;e++){var a=$(c[e].rendering);h=Math.max(h,a.height());
if(this.left+a.width()>j){this.left=5;this.top+=h+5;h=a.height()}a.move(this.top,this.left);this.left+=a.width()+5
}this.top+=h};rhizo.layout.FlowLayout.prototype.cleanup=function(){this.top=this.left=5};rhizo.layout.FlowLayout.prototype.details=function(){return $("<div />").append("Ordered by: ").append(rhizo.ui.metaModelKeySelector("rhizo-flowlayout-order")).append(" desc?").append('<input type="checkbox" id="rhizo-flowlayout-desc" />')
};rhizo.layout.FlowLayout.prototype.toString=function(){return"List"};rhizo.layout.ScrambleLayout=function(){};
rhizo.layout.ScrambleLayout.prototype.layout=function(b,d,k,l){if(l&&l.filter){return}var h=Math.round($(b).width()*0.3);
var j=Math.round($(b).height()*0.3);for(var e=0,f=d.length;e<f;e++){var a=$(d[e].rendering);var g=Math.round($(b).height()/3+Math.random()*j*2-j);
var c=Math.round($(b).width()/3+Math.random()*h*2-h);a.move(g,c)}};rhizo.layout.ScrambleLayout.prototype.toString=function(){return"Random"
};rhizo.layout.BucketLayout=function(){this.internalFlowLayout_=new rhizo.layout.FlowLayout();this.bucketHeaders_=[]
};rhizo.layout.BucketLayout.prototype.layout=function(a,c,l,m){var j=$("#rhizo-bucketlayout-bucket").val();
if(!l[j]){rhizo.error("layoutBy attribute does not match any property");return}rhizo.log("Bucketing by "+j);
var f;var h;if(l[j].cluster){f=l[j].cluster;h=l[j]}else{f=l[j].kind.cluster;h=l[j].kind}var b={};for(var e=0,g=c.length;
e<g;e++){var k=c[e].unwrap()[j];if(f){k=f.call(h,k)}if(!b[k]){b[k]=[]}b[k].push(c[e])}var d=[];for(k in b){d.push(k)
}d.sort(rhizo.meta.sortByKind(l[j].kind));d.forEach(function(i){this.renderBucketHeader_(a,i);this.internalFlowLayout_.layout(a,b[i],l,m);
this.internalFlowLayout_.top+=10;this.internalFlowLayout_.left=5},this)};rhizo.layout.BucketLayout.prototype.renderBucketHeader_=function(a,c){var b=$("<div class='rhizo-bucket-header'>"+c+"</div>");
b.css("position","absolute").css("left",5).css("top",this.internalFlowLayout_.top);this.bucketHeaders_.push(b);
$(a).append(b);this.internalFlowLayout_.top+=b.height()+5};rhizo.layout.BucketLayout.prototype.details=function(){return $("<div />").append("Group by: ").append(rhizo.ui.metaModelKeySelector("rhizo-bucketlayout-bucket"))
};rhizo.layout.BucketLayout.prototype.cleanup=function(){this.internalFlowLayout_.cleanup();this.bucketHeaders_.forEach(function(a){$(a).remove()
});this.bucketHeaders_=[]};rhizo.layout.BucketLayout.prototype.toString=function(){return"Buckets"};rhizo.layout.layouts={no:new rhizo.layout.NoLayout(),flow:new rhizo.layout.FlowLayout(),scramble:new rhizo.layout.ScrambleLayout(),bucket:new rhizo.layout.BucketLayout()};
rhizo.layout.TreeLayout=function(){};rhizo.layout.TreeLayout.prototype.layout=function(b,f,m,n){var g=$("#rhizo-treelayout-direction").val()=="ver";
this.treePainter_=new rhizo.layout.TreePainter(g);var j=$("#rhizo-treelayout-parentKey").val();if(!m[j]){rhizo.error("parentKey attribute does not match any property");
return}rhizo.log("Creating tree by "+j);try{var l=this.buildTree_(f,j);var i={left:0,top:0};var k=0;for(var c in l){var a=this.treePainter_.calculateBoundingRect_(l[c]);
var d=this.treePainter_.toAbsoluteCoords_(a);if(i.left+d.w>$(b).width()){i.left=0;i.top+=k+(k>0?5:0)}this.treePainter_.draw_(b,l[c],this.treePainter_.toRelativeCoords_(i));
i.left+=d.w;k=Math.max(k,d.h)}}catch(h){if(h.name=="TreeCycleException"){rhizo.error(h)}else{throw h}}};
rhizo.layout.TreeLayout.prototype.buildTree_=function(b,g){var f={};for(var d=0,c=b.length;d<c;d++){f[b[d].id]=new rhizo.layout.TreeNode(b[d])
}var k={};for(var d=0,c=b.length;d<c;d++){if(!f[b[d].unwrap().id].validated){var j={};var e=b[d].unwrap();
while(true){if(j[e.id]){throw new rhizo.layout.TreeCycleException("Tree is invalid: cycle detected")}j[e.id]=e;
f[e.id].validated=true;var h=this.findFirstVisibleParent_($p.model(e[g]),g);if(h){var a=h.unwrap();f[a.id].addChild(f[e.id]);
e=h.unwrap()}else{k[e.id]=f[e.id];break}}}}return k};rhizo.layout.TreeLayout.prototype.findFirstVisibleParent_=function(c,b){if(!c){return null
}var a={};while(c.isFiltered()){if(a[c.id]){throw new rhizo.layout.TreeCycleException("Tree is invalid: hidden cycle detected")
}a[c.id]=c;c=$p.model(c.unwrap()[b]);if(!c){return null}}return c};rhizo.layout.TreeLayout.prototype.details=function(){var a=$("<select id='rhizo-treelayout-direction' />");
a.append("<option value='hor'>Horizontally</option>");a.append("<option value='ver'>Vertically</option>");
return $("<div />").append(a).append(" arrange by: ").append(rhizo.ui.metaModelKeySelector("rhizo-treelayout-parentKey"))
};rhizo.layout.TreeLayout.prototype.toString=function(){return"Tree"};rhizo.layout.TreeLayout.prototype.cleanup=function(){if(this.treePainter_){this.treePainter_.cleanup_()
}};rhizo.layout.TreePainter=function(a){this.connectors_=[];this.vertical_=a;if(this.vertical_){this.gdName_="top";
this.odName_="left";this.gdLength_="height";this.odLength_="width"}else{this.gdName_="left";this.odName_="top";
this.gdLength_="width";this.odLength_="height"}};rhizo.layout.TreePainter.prototype.gd_=function(a){return this.vertical_?a.height():a.width()
};rhizo.layout.TreePainter.prototype.od_=function(a){return this.vertical_?a.width():a.height()};rhizo.layout.TreePainter.prototype.toAbsoluteCoords_=function(a){return this.vertical_?{w:a.od,h:a.gd}:{w:a.gd,h:a.od}
};rhizo.layout.TreePainter.prototype.toRelativeCoords_=function(a){return this.vertical_?{gd:a.top,od:a.left}:{gd:a.left,od:a.top}
};rhizo.layout.TreePainter.prototype.packedCenter_=function(b,a){return{gd:b.gd+5+this.gd_(a)/2,od:b.od+this.od_(a)/2}
};rhizo.layout.TreePainter.prototype.evenCenter_=function(c,a,b){return{gd:c.gd+b.gd/2,od:c.od+5+this.od_(a)/2}
};rhizo.layout.TreePainter.prototype.calculateBoundingRect_=function(e){var a={gd:0,od:0};for(var d in e.childs){var b=this.calculateBoundingRect_(e.childs[d]);
a.gd+=b.gd+5;a.od=Math.max(a.od,b.od)}var c=e.superModel.rendering;e.boundingRect={od:this.od_(c)+a.od+25,gd:Math.max(this.gd_(c),a.gd)+5};
return e.boundingRect};rhizo.layout.TreePainter.prototype.draw_=function(d,g,f,c,h){var b=$(g.superModel.rendering);
if(this.vertical_){b.move(f.gd+5,f.od);if(c!=null){this.drawConnector_(d,this.packedCenter_(f,b),this.packedCenter_(c,h.superModel.rendering))
}}else{b.move(f.od+5,f.gd+(g.boundingRect.gd-this.gd_(b))/2);if(c!=null){this.drawConnector_(d,this.evenCenter_(f,b,g.boundingRect),this.evenCenter_(c,h.superModel.rendering,h.boundingRect))
}}var i=f.gd;for(var e in g.childs){var a=g.childs[e];var j={od:f.od+this.od_(b)+20,gd:i};this.draw_(d,a,j,f,g);
i+=a.boundingRect.gd+5}};rhizo.layout.TreePainter.prototype.drawConnector_=function(b,e,c){var d=$("<div class='rhizo-tree-connector' />");
d.css("position","absolute").css(this.gdName_,Math.min(e.gd,c.gd)).css(this.odName_,c.od).css(this.odLength_,2).css(this.gdLength_,Math.abs(c.gd-e.gd));
var a=$("<div class='rhizo-tree-connector' />");a.css("position","absolute").css(this.gdName_,e.gd).css(this.odName_,c.od).css(this.gdLength_,2).css(this.odLength_,Math.abs(c.od-e.od));
this.connectors_.push(d);this.connectors_.push(a);$(b).append(d);$(b).append(a)};rhizo.layout.TreePainter.prototype.cleanup_=function(){this.connectors_.forEach(function(a){$(a).remove()
});this.connectors_=[]};rhizo.layout.TreeNode=function(a,b){this.superModel=a;this.id=a.id;this.childs=b||{};
this.validated=false};rhizo.layout.TreeNode.prototype.addChild=function(a){if(!this.childs[a.id]){this.childs[a.id]=a
}};rhizo.layout.TreeCycleException=function(a){this.message=a;this.name="TreeCycleException"};rhizo.layout.TreeCycleException.prototype.toString=function(){return this.name+": "+this.message
};rhizo.layout.layouts.tree=new rhizo.layout.TreeLayout();rhizo.model={};rhizo.model.SuperModel=function(a,c,b){this.model=a;
this.id=a.id;this.selected=c||false;this.filters_={};this.rendering=null};rhizo.model.SuperModel.prototype.unwrap=function(){return this.model
};rhizo.model.SuperModel.prototype.toString=function(){return this.model.toString()};rhizo.model.SuperModel.prototype.isFiltered=function(a){if(a){return this.filters_[a]||false
}else{var b=0;for(key in this.filters_){b++}return b!=0}};rhizo.model.SuperModel.prototype.filter=function(a){this.filters_[a]=true
};rhizo.model.SuperModel.prototype.resetFilter=function(a){delete this.filters_[a]};rhizo.model.kickstart=function(c,e,b,d){var a=e.render(c.unwrap(),b,d);
c.rendering=a;$(a).attr("id",c.id);$(a).dblclick(function(){if($p.isSelected(this.id)){$p.unselect(this.id)
}else{$p.select(this.id)}});$(a).draggable({opacity:0.7,start:function(f,g){$("#"+g.helper[0].id).data("dropTop0",parseInt($("#"+g.helper[0].id).css("top"),10));
$("#"+g.helper[0].id).data("dropLeft0",parseInt($("#"+g.helper[0].id).css("left"),10));if($p.isSelected(g.helper[0].id)){for(id in $p.allSelected()){$("#"+id).data("top0",parseInt($("#"+id).css("top"),10)-parseInt($(g.helper[0]).css("top"),10));
$("#"+id).data("left0",parseInt($("#"+id).css("left"),10)-parseInt($(g.helper[0]).css("left"),10));$("#"+id).data("dropTop0",parseInt($("#"+id).css("top"),10));
$("#"+id).data("dropLeft0",parseInt($("#"+id).css("left"),10))}}},drag:function(f,g){if($p.isSelected(g.helper[0].id)){for(id in $p.allSelected()){if(id!=g.helper[0].id){$("#"+id).css("top",$("#"+id).data("top0")+g.position.top);
$("#"+id).css("left",$("#"+id).data("left0")+g.position.left)}}}},stop:function(f,g){if($p.isSelected(g.helper[0].id)){for(id in $p.allSelected()){$("#"+id).removeData("top0");
$("#"+id).removeData("left0")}}},refreshPositions:false});return a};rhizo.model.loader={};rhizo.model.loader.loaders=[];
rhizo.model.loader.JS=function(){};rhizo.model.loader.loaders.push(new rhizo.model.loader.JS());rhizo.model.loader.JS.prototype.setGlobalOptions=function(a){this.globalOptions_=a
};rhizo.model.loader.JS.prototype.match=function(a){return/\.js$/.test(a)};rhizo.model.loader.JS.prototype.load=function(a){var b=document.createElement("script");
b.src=a;b.type="text/javascript";document.getElementsByTagName("head")[0].appendChild(b)};$gs=null;rhizo.model.loader.GoogleSpreadsheet=function(){$gs=this
};rhizo.model.loader.loaders.push(new rhizo.model.loader.GoogleSpreadsheet());rhizo.model.loader.GoogleSpreadsheet.prototype.setGlobalOptions=function(a){this.globalOptions_=a
};rhizo.model.loader.GoogleSpreadsheet.prototype.match=function(a){return/spreadsheets\.google\.com/.test(a)
};rhizo.model.loader.GoogleSpreadsheet.prototype.load=function(a){this.resource_=a;google.load("visualization","1");
google.setOnLoadCallback($gs.vizLoaded_)};rhizo.model.loader.GoogleSpreadsheet.prototype.vizLoaded_=function(){var a=new google.visualization.Query($gs.resource_);
a.send($gs.handleQueryResponse_)};rhizo.model.loader.GoogleSpreadsheet.prototype.handleQueryResponse_=function(a){if(a.isError()){alert("GViz load failed: "+a.getMessage());
return}var b=new rhizo.gviz.Initializer(a.getDataTable(),$gs.globalOptions_);new rhizo.Project(b.metamodel,b.renderer,$gs.globalOptions_);
$p.deploy(b.models);delete $gs};rhizo.model.loader.load=function(d,c){var a=rhizo.model.loader.loaders;
for(var b=0;b<a.length;b++){a[b].setGlobalOptions(c);if(a[b].match(d)){a[b].load(d);return}}alert("No loader available for the resource: "+d)
};rhizo.autorender={};rhizo.autorender.AR=function(b,d,c,a){this.metamodel_=b;this.fallbackToDefaults_=typeof(c)=="undefined"?true:c;
this.numfields_=typeof(a)=="undefined"?5:a;this.locateFields_();if(this.sizeField_){this.sizeRange_=this.locateMinMax_(d,this.sizeField_)
}if(this.colorField_){this.colorRange_=this.locateMinMax_(d,this.colorField_)}};rhizo.autorender.AR.prototype.getSizeRange=function(){return this.sizeRange_
};rhizo.autorender.AR.prototype.getColorRange=function(){return this.colorRange_};rhizo.autorender.AR.prototype.locateFields_=function(){for(key in this.metamodel_){this.masterField_=this.masterField_||this.getArField_(key,"master","true");
this.sizeField_=this.sizeField_||this.getArField_(key,"bind","size");this.colorField_=this.colorField_||this.getArField_(key,"bind","color")
}this.locateDefaultFields_()};rhizo.autorender.AR.prototype.getArField_=function(b,d,c){if(this.metamodel_[b].ar){var a=this.metamodel_[b].ar[d];
if(a&&a.toString().indexOf(c)!=-1){return b}}return null};rhizo.autorender.AR.prototype.locateDefaultFields_=function(){for(key in this.metamodel_){if(!this.masterField_){this.masterField_=key
}if(!this.fallbackToDefaults_){break}if(!this.sizeField_&&(this.metamodel_[key].kind==rhizo.meta.Kind.NUMBER||this.metamodel_[key].kind==rhizo.meta.Kind.RANGE)){this.sizeField_=key;
continue}if(this.sizeField_){if(!this.colorField_&&(this.metamodel_[key].kind==rhizo.meta.Kind.NUMBER||this.metamodel_[key].kind==rhizo.meta.Kind.RANGE)){this.colorField_=key
}}}};rhizo.autorender.AR.prototype.locateMinMax_=function(d,b){if(this.metamodel_[b].kind==rhizo.meta.Kind.RANGE){return{min:this.metamodel_[b].min,max:this.metamodel_[b].max,label:this.metamodel_[b].label}
}else{var c=Number.POSITIVE_INFINITY;var a=Number.NEGATIVE_INFINITY;d.forEach(function(e){c=Math.min(c,e[b]);
a=Math.max(a,e[b])});return{min:c,max:a,label:this.metamodel_[b].label}}};rhizo.autorender.AR.prototype.getClass_=function(e,b,a,c){var d=parseInt(((e-b.min)/(b.max-b.min))*5,10);
return"ar-"+c+"-"+d.toString()+(a?"m":"")};rhizo.autorender.AR.prototype.getFontClass_=function(d,b,a,c){return this.getClass_(d,b,a,"fon")
};rhizo.autorender.AR.prototype.getColorClass_=function(c,b,a){return this.getClass_(c,b,a,"col")};rhizo.autorender.AR.prototype.renderSingleModelKey_=function(b,c){var a=[];
a.push('<p><span class="dim">');a.push(this.metamodel_[b].label);a.push("</span>: ");a.push(c);a.push("</p>");
return a.join("")};rhizo.autorender.AR.prototype.render=function(e,c,g){var b=g&&g.miniRender;var d="ar-col-0"+(b?"m":"");
if(this.colorField_){d=this.getColorClass_(e[this.colorField_],this.colorRange_,b)}var a="ar-fon-0"+(b?"m":"");
if(this.sizeField_){a=this.getFontClass_(e[this.sizeField_],this.sizeRange_,b)}if(b){return $("<div class='rhizo-sample-model'><div class='"+d+"'><span class='"+a+"'>"+e[this.masterField_]+"</span></div></div>")
}else{html=[];html.push("<div class='rhizo-sample-model'>");html.push("<div class='"+d+"'>");html.push("<span class='"+a+"'>"+e[this.masterField_]+"</span>");
var f=0;if(this.sizeField_){html.push(this.renderSingleModelKey_(this.sizeField_,e[this.sizeField_]));
f++}if(this.colorField_&&this.colorField_!=this.sizeField_){html.push(this.renderSingleModelKey_(this.colorField_,e[this.colorField_]));
f++}for(key in this.metamodel_){if(f>=this.numfields_){break}if(key!=this.sizeField_&&key!=this.colorField_&&key!=this.masterField_){f++;
html.push(this.renderSingleModelKey_(key,e[key]))}}html.push("</div></div>");return $(html.join(""))}};
rhizo.gviz={};rhizo.gviz.Initializer=function(c,b,a){this.dt_=c;this.options_=b||{};this.customRenderer_=a;
this.init_()};rhizo.gviz.Initializer.prototype.init_=function(){this.metamodel=this.buildMetaModel_();
this.models=this.loadModels_(this.metamodel);this.renderer=this.customRenderer_?this.customRenderer_:this.createDefaultRenderer_(this.metamodel,this.models)
};rhizo.gviz.Initializer.prototype.buildMetaModel_=function(){var c={};for(var e=0,b=this.dt_.getNumberOfColumns();
e<b;e++){var g=this.dt_.getColumnId(e);c[g]={};c[g].label=this.dt_.getColumnLabel(e);if(c[g].label==""){c[g].label="Column "+g
}var f=this.dt_.getColumnType(e);if(f=="number"){var d=this.dt_.getColumnRange(e).min;var a=this.dt_.getColumnRange(e).max;
if(d==a){c[g].kind=rhizo.meta.Kind.NUMBER}else{c[g].kind=rhizo.meta.Kind.RANGE;c[g].min=d;c[g].max=a}}else{if(f=="boolean"){c[g].kind=rhizo.meta.Kind.BOOLEAN
}else{if(f!="string"){rhizo.warning("Column "+c[g].label+" will be treated as String. Unsupported type: "+f)
}if(c[g].label.indexOf("CAT")!=-1){c[g].kind=rhizo.meta.Kind.CATEGORY;c[g].label=c[g].label.replace("CAT","").replace(/^\s+|\s+$/g,"");
c[g].categories=this.parseCategories_(e);if(c[g].label.indexOf("MUL")!=-1){c[g].label=c[g].label.replace("MUL","").replace(/^\s+|\s+$/g,"");
c[g].multiple=true}}else{c[g].kind=rhizo.meta.Kind.STRING}}}this.buildAutoRenderInfo_(c[g],g)}return c
};rhizo.gviz.Initializer.prototype.parseSingleCategory_=function(e){var c={};var d=e.split(",");var a=$.grep(d,function(f){return f!=""
});a=a.forEach(function(f){c[f.replace(/^\s+|\s+$/g,"")]=true});var b=[];for(category in c){b.push(category)
}return b};rhizo.gviz.Initializer.prototype.parseCategories_=function(f){var d={};for(var e=0,a=this.dt_.getNumberOfRows();
e<a;e++){var c=this.parseSingleCategory_(this.dt_.getValue(e,f));c.forEach(function(g){d[g]=true})}var b=[];
for(category in d){b.push(category)}return b.sort()};rhizo.gviz.Initializer.prototype.buildAutoRenderInfo_=function(a,d){var b={};
var c=false;if(this.options_.arMaster&&this.matchAutoRenderOption_(this.options_.arMaster,a.label,d)){b.master=true;
c=true}if(this.options_.arSize&&this.matchAutoRenderOption_(this.options_.arSize,a.label,d)){b.bind=(b.bind?b.bind:"")+"size ";
c=true}if(this.options_.arColor&&this.matchAutoRenderOption_(this.options_.arColor,a.label,d)){b.bind=(b.bind?b.bind:"")+"color ";
c=true}if(c){a.ar=b}};rhizo.gviz.Initializer.prototype.matchAutoRenderOption_=function(d,a,c){var b=/^[a-zA-Z]$/;
if(b.test(d)){return d.toLowerCase()==new String(c).toLowerCase()}else{if(a.toLowerCase()==d.toLowerCase()){return true
}else{return a.replace("CAT","").replace("MUL","").toLowerCase()==d.toLowerCase()}}};rhizo.gviz.Initializer.prototype.loadModels_=function(c){var h=[];
for(var f=0,b=this.dt_.getNumberOfRows();f<b;f++){var e={};for(var d=0,a=this.dt_.getNumberOfColumns();
d<a;d++){e.id="gviz-"+f;var g=this.dt_.getValue(f,d);if(c[this.dt_.getColumnId(d)].kind==rhizo.meta.Kind.CATEGORY){e[this.dt_.getColumnId(d)]=this.parseSingleCategory_(g)
}else{e[this.dt_.getColumnId(d)]=g}}h.push(e)}return h};rhizo.gviz.Initializer.prototype.createDefaultRenderer_=function(a,b){return new rhizo.autorender.AR(a,b,this.options_.arDefaults,this.options_.arNumFields)
};rhizo.gviz.DebugRenderer=function(a){this.dt_=a};rhizo.gviz.DebugRenderer.prototype.render=function(d,b){var e=$("<div class='rhizo-gviz-model' />");
for(var c=0,a=this.dt_.getNumberOfColumns();c<a;c++){e.append("<p>"+d[this.dt_.getColumnId(c)]+"</p>")
}return e};rhizo.ui={};rhizo.ui.init=function(a){if(a&&a.autoSize){if($(document).width()>=600&&$(document).height()>=250){a.miniRender=false
}else{a.miniRender=true}}if(a&&a.miniRender){$("#rhizo-viewport").addClass("rhizo-miniRender");$("#rhizo-scroll-overlay").addClass("rhizo-miniRender");
$("#rhizo-admin").remove();$("#rhizo-console").remove();$("#rhizo-bottom-bar").css("display","")}else{$("#rhizo-viewport").css("left",300).css("right",130);
$("#rhizo-bottom-bar").remove();$("#rhizo-admin").css("display","");$("#rhizo-console").css("display","")
}rhizo.ui.initConsole();rhizo.ui.initEngineSelector();rhizo.ui.initLegend();rhizo.ui.initSelectionManagement();
rhizo.ui.initActions();rhizo.ui.initPanning();if(a&&a.miniRender){rhizo.ui.initFloatingPanels()}};rhizo.ui.initConsole=function(){$("#rhizo-console-close").click(function(){if($("#rhizo-console-contents").is(":visible")){$("#rhizo-console-contents").slideUp("slow",function(){$("#rhizo-console-close").html("&#8659;");
$("#rhizo-console-contents").empty()})}else{$("#rhizo-console-contents").slideDown("slow",function(){$("#rhizo-console-close").html("&#8657;")
})}})};rhizo.ui.initEngineSelector=function(){var a=$("<select id='rhizo-layout' />");var e={};for(layout in rhizo.layout.layouts){var c=rhizo.layout.layouts[layout];
a.append($("<option value='"+layout+"'>"+c+"</option>"));if(c.details){var b=c.details();e[layout]=b;
$("#rhizo-layout-extra-options").append(b.css("display","none"))}}a.change(function(f){for(layout in e){if(layout==$(this).val()){e[layout].show("fast")
}else{e[layout].hide("fast")}}});var d=$("<button>Update</button>");d.click(function(){$p.layout($("#rhizo-layout").val())
});$("#rhizo-update-layout").prepend(d).prepend(a).prepend("Keep items ordered by: ")};rhizo.ui.initLegend=function(){if($p.renderer().getSizeRange){var a=$p.renderer().getSizeRange();
if(a){$("#rhizo-legend").css("display","");$("#rhizo-legend-size").css("display","");$("#rhizo-legend-size-min").html(a.label+" &nbsp; "+a.min+":");
$("#rhizo-legend-size-max").html(": "+a.max)}}if($p.renderer().getColorRange){var b=$p.renderer().getColorRange();
if(b){$("#rhizo-legend").css("display","");$("#rhizo-legend-color").css("display","");$("#rhizo-legend-color-min").html(b.label+" &nbsp; "+b.min+":");
$("#rhizo-legend-color-max").html(": "+b.max)}}};rhizo.ui.initSelectionManagement=function(){var b=$('<button id="rhizo-selected-items-only">Work on selected items only</button>');
b.click(function(e){var c=0;for(id in $p.allSelected()){c++}if(c==0){rhizo.error("No items selected");
return}var d=$p.allUnselected();var f=0;for(id in d){d[id].filter("__selection__");f++}$p.alignVisibility();
$p.layout(null,{filter:true});$p.unselectAll();$("#rhizo-selected-reset").removeAttr("disabled").text("Reset ("+f+" filtered)")
});var a=$('<button id="rhizo-selected-reset" disabled="disabled">Reset</button>');a.click(function(c){$p.resetAllFilter("__selection__");
$p.alignVisibility();$p.layout(null,{filter:true});$(this).attr("disabled","disabled").text("Reset")});
$("#rhizo-selection").append(b).append(a)};rhizo.ui.initActions=function(){if($(".rhizo-action").length>0){$(".rhizo-action").draggable({helper:"clone"});
$("#rhizo-universe").droppable({accept:".rhizo-action",drop:function(i,h){var c=$("#rhizo-universe").offset();
var d=$("#rhizo-universe").width();var a=$("#rhizo-universe").height();var e=h.draggable.text();var b=h.absolutePosition.left-c.left;
if((b+200)>d){b=d-210}var g=h.absolutePosition.top-c.top;if((g+200)>a){g=a-210}var f=$("<div class='rhizo-droppable-action'>Drop your items here to perform:<br />"+e+"</div>").css("position","absolute").css("top",g).css("left",b).css("display","none");
$("#rhizo-universe").append(f);f.fadeIn();f.draggable();f.droppable({accept:".rhizo-sample-model",drop:function(k,l){if(!$p.isSelected(l.draggable[0].id)){var m=l.draggable[0].id;
alert("Action applied on "+$p.model(m));$("#"+m).move($("#"+m).data("dropTop0"),$("#"+m).data("dropLeft0"))
}else{var j=0;for(var m in $p.allSelected()){j++}alert("Action applied on "+j+" elements");for(var m in $p.allSelected()){$("#"+m).move($("#"+m).data("dropTop0"),$("#"+m).data("dropLeft0"))
}$p.unselectAll()}}});f.dblclick(function(){f.remove()})}})}};rhizo.ui.initPanning=function(){var a={top:$("#rhizo-viewport").offset().top+$("#rhizo-universe").offset().top,left:$("#rhizo-viewport").offset().left+$("#rhizo-universe").offset().left,};
$("#rhizo-scroll-trigger").click(function(){$(this).hide();var b=$("#rhizo-viewport");$("#rhizo-scroll-overlay").css("left",b.css("left")).css("top",b.css("top")).css("width",b.width()).css("height",b.height()).css("z-index",99).css("display","");
$("#rhizo-scroll-overlay").draggable({helper:function(){return $("<div />")},start:function(c,d){var e=$("#rhizo-universe").offset();
$("#rhizo-universe").data("top0",e.top).data("left0",e.left)},drag:function(c,e){var h=$("#rhizo-universe");
var g=h.offset();var d=e.position.top+h.data("top0")-a.top;var f=e.position.left+h.data("left0")-a.left;
$("#rhizo-universe").css("top",d).css("bottom",-d).css("left",f).css("right",-f)},refreshPositions:false})
});$("#rhizo-scroll-done").click(function(){$("#rhizo-scroll-overlay").css("z-index",-1).css("display","none");
$("#rhizo-scroll-trigger").show()})};rhizo.ui.initFloatingPanels=function(){var a=[{panel:"#rhizo-update-layout",link:"#rhizo-link-display"},{panel:"#rhizo-selection",link:"#rhizo-link-selection"},{panel:"#rhizo-filter-container",link:"#rhizo-link-filters"},{panel:"#rhizo-help",link:"#rhizo-link-help"},{panel:"#rhizo-maximize",link:"#rhizo-maximize-icon"},{panel:"#rhizo-legend-panel",link:"#rhizo-legend"}];
a.forEach(function(b){$(b.link).click(function(){a.forEach(function(c){if(c.panel==b.panel){$(c.panel).toggle();
$(c.link).toggleClass("rhizo-filter-open")}else{$(c.panel).css("display","none");$(c.link).removeClass("rhizo-filter-open")
}});return false})});$("#rhizo-next-filter").click(function(){var c=$(".rhizo-filter:visible");var b=c.next(".rhizo-filter:hidden").eq(0);
if(b.length>0){c.css("display","none");b.css("display","")}});$("#rhizo-prev-filter").click(function(){var c=$(".rhizo-filter:visible");
var b=c.prev(".rhizo-filter:hidden").eq(0);if(b.length>0){c.css("display","none");b.css("display","")
}})};rhizo.ui.metaModelKeySelector=function(b){var a=$("<select id='"+b+"' />");if($p&&$p.metaModel()){for(key in $p.metaModel()){a.append("<option value='"+key+"'>"+$p.metaModel()[key].label+"</option>")
}}return a};rhizo.ui.performanceTuning=function(a){if(a){jQuery.fn.extend({move:function(c,b,e,d){$(this).css("top",c);
$(this).css("left",b);if(e!=null){$(this).css("bottom",e)}if(d!=null){$(this).css("right",d)}}});jQuery.fn.extend({fadeIn:function(b,c){$(this).css("display","")
},fadeOut:function(b,c){$(this).css("display","none")}})}else{jQuery.fn.extend({move:function(d,c,f,e){if($p.countShownModels()>200){$(this).css("top",d);
$(this).css("left",c);if(f!=null){$(this).css("bottom",f)}if(e!=null){$(this).css("right",e)}}else{var b={top:d,left:c};
if(f!=null){b.bottom=f}if(e!=null){b.right=e}$(this).animate(b,1000)}}});jQuery.fn.extend({fadeIn:function(b,c){if($p.countShownModels()>200){$(this).css("display","")
}else{$(this).animate({opacity:"show"},b,c)}},fadeOut:function(b,c){if($p.countShownModels()>200){$(this).css("display","none")
}else{$(this).animate({opacity:"hide"},b,c)}}})}};