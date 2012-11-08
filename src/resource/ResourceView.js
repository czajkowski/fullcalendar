
setDefaults({
    allDaySlot: true,
    allDayText: 'all-day',
    firstHour: 6,
    slotMinutes: 30,
    defaultEventMinutes: 120,
    axisFormat: 'h(:mm)tt',
    timeFormat: {
        agenda: 'h:mm{ - h:mm}'
    },
    dragOpacity: {
        resource: .5
    },
    minTime: 0,
    maxTime: 24
});


// TODO: make it work in quirks mode (event corners, all-day height)
// TODO: test liquid width, especially in IE6


function ResourceView(element, calendar, viewName) {
    var t = this;
	
	
    // exports
    t.renderResource = renderResource;
    t.setWidth = setWidth;
    t.setHeight = setHeight;
    t.beforeHide = beforeHide;
    t.afterShow = afterShow;
    t.defaultEventEnd = defaultEventEnd;
    t.timePosition = timePosition;
    t.dayOfWeekCol = dayOfWeekCol;
    t.dateCell = dateCell;
    t.cellDate = cellDate;
    t.cellIsAllDay = cellIsAllDay;
    t.allDayRow = getAllDayRow;
    t.allDayBounds = allDayBounds;
    t.getHoverListener = function() { return hoverListener };
    t.colContentLeft = colContentLeft;
    t.colContentRight = colContentRight;
    t.getDaySegmentContainer = function() { return allDay.eventContainer };
    t.getSlotSegmentContainer = function() { return slots.eventContainer };
    t.getMinMinute = function() { return minMinute };
    t.getMaxMinute = function() { return maxMinute };
    t.getBodyContent = function() { return slots.content }; // !!??
    t.getRowCnt = function() { return 1 };
    t.getColCnt = function() { return colCnt };
    t.getColWidth = function() { return colWidth };
    t.getSlotHeight = function() { return slotHeight };
    t.defaultSelectionEnd = defaultSelectionEnd;
    t.renderDayOverlay = renderDayOverlay;
    t.renderSelection = renderSelection;
    t.clearSelection = clearSelection;
    t.reportDayClick = reportDayClick; // selection mousedown hack
    t.dragStart = dragStart;
    t.dragStop = dragStop;
    t.resourceCol = resourceCol;
    t.resources = calendar.fetchResources();
    t.afterRender = afterRender
    
	
    // imports
    View.call(t, element, calendar, viewName);
    OverlayManager.call(t);
    SelectionManager.call(t);
    ResourceEventRenderer.call(t);
    
    var opt = t.opt;
    var trigger = t.trigger;
    var clearEvents = t.clearEvents;
    var renderOverlay = t.renderOverlay;
    var clearOverlays = t.clearOverlays;
    var reportSelection = t.reportSelection;
    var unselect = t.unselect;
    //var daySelectionMousedown = t.daySelectionMousedown;  // redefine here
    var slotSegHtml = t.slotSegHtml;
    var formatDate = calendar.formatDate;
    
    
    // locals
    
    var day = {
	table : null,
	
	headSections : null,
	headAxisCell : null,
	headGutterCell : null,
	headResourceCells : null,
	
	bodySections : null, 
	bodyAxisCell : null, 
	bodyGutterCell : null,
	bodyResourceCells : null,
	bodyResourceCellsInner : null,
	bodyResourceFirstCell : null, 
	bodyStrecherCells : null,
	
	footerSections : null, 
	footerAxisCell : null ,
	footerGutterCell : null,
	
	resourceScrollContainer : null
    };
    
    var slots = {
	layer : null,
	scroller : null,
	content : null,
	table : null,
	tableFirstInner : null,
	
	resourceScrollContainer : null,
	eventContainer : null,
	
	availabilityScrollContainer : null,
	availabilityContainer : null
    };

    var allDay = {
	eventContainer : null,
	table : null,
	sections : null,
	rows : null,
	divider : null,
	
	resourceScrollContainer : null
    };

    var availabilityOverlayTable = [];

    var axisObjects = null;
    var gutterObjects = null;
    var resourceScrollContainers = null;

    var selectionHelper;
    var viewWidth;
    var viewHeight;
    var axisWidth;
    var colWidth;
    var gutterWidth;
    var slotHeight; // TODO: what if slotHeight changes? (see issue 650)
    var savedScrollTop = 0;
    var savedScrollLeft = 0;
	
    var colCnt;
    var slotCnt;
    var coordinateGrid;
    var hoverListener;
    var colContentPositions;
    var slotTopCache = {};
	
    var tm;
    var firstDay;
    var nwe;            // no weekends (int)
    var rtl, dis, dit;  // day index sign / translate
    var minMinute, maxMinute;
    var colFormat;
    var resources = t.resources;
    
    
    
    /* Rendering
	-----------------------------------------------------------------------------*/
	
	
    disableTextSelection(element.addClass('fc-agenda'));

	
    function renderResource() {
        colCnt = resources.length;
        updateOptions();
        if (!day.table) {
            buildSkeleton();
        } else {
            clearEvents();
        }
        updateCells();
    }
	
	
	
    function updateOptions() {
        tm = opt('theme') ? 'ui' : 'fc';
        nwe = opt('weekends') ? 0 : 1;
        firstDay = opt('firstDay');
        if (rtl = opt('isRTL')) {
            dis = -1;
            dit = colCnt - 1;
        }else{
            dis = 1;
            dit = 0;
        }
        minMinute = parseTime(opt('minTime'));
        maxMinute = parseTime(opt('maxTime'));
        colFormat = opt('columnFormat');
    }
	
	
	
    function buildSkeleton() {
        var headerClass = tm + "-widget-header";
        var contentClass = tm + "-widget-content";
        var s;
        var i;
        var d;
	var tmp;
        var maxd;
        var minutes;
        var slotNormal = opt('slotMinutes') % 5 == 0;
		
	s = "<table cellspacing='0' class='fc-outer-day-table'>" + 
		"<tr>" + 
		    "<td class='fc-outer-day-table-axis'>";
	
	// axis column
	s +=		"<table class='fc-agenda-days fc-border-separate' cellspacing='0'>" +
			    "<thead>" +
				"<tr>" +
				    "<th class='fc-agenda-axis " + headerClass + "'>&nbsp;</th>" + 
				"</tr>" +
			    "</thead>" +
			    "<tbody>" +
				"<tr>" +
				    "<td class='fc-agenda-axis " + headerClass + "'><div>&nbsp;</div></td>" + 
				"</tr>" +
			    "</tbody>" +
			    "<tfoot>" + 
				"<tr>" +
				    "<td class='fc-agenda-axis " + headerClass + "'><div>&nbsp;</div></td>" + 
				"</tr>" +
			    "</tfoot>" +
			"</table>";
			
	s +=	    "</td>" +
		    "<td class='fc-outer-day-table-resources'>" +
			"<div class='sc-resource-scroll-container'>"
		
	// resource columns
	s +=		    "<table class='fc-agenda-days fc-border-separate' cellspacing='0' style='width:100%'>" +
				"<thead>" +
				    "<tr>";

				    for (i=0; i<colCnt; i++) {
					s += "<th class='fc- fc-col" + i + ' ' + headerClass + "  fc-resource-col'/>"; // fc- needed for setDayID
				    }

	s +=			    "</tr>" +
				"</thead>" +
				"<tbody>" +
				    "<tr>";
				
				    for (i=0; i<colCnt; i++) {
					s +="<td class='fc- fc-col" + i + " " + contentClass + "'>" + // fc- needed for setDayID
						"<div>" +
						    "<div class='fc-day-content'>" +
							"<div style='position:relative'>&nbsp;</div>" +
						    "</div>" +
						"</div>" +
					    "</td>";
				    }				
				
	s +=			    "</tr>" +
				"</tbody>" +
			    "</table>";
		
	s +=		"</div>" +
		    "</td>" +
		    "<td class='fc-outer-day-table-gutter'>";
		
	// gutter column
	s +=		"<table class='fc-agenda-days fc-border-separate' cellspacing='0'>" +
			    "<thead>" +
				"<tr>" +
				    "<th class='fc-agenda-gutter " + headerClass + "'>&nbsp;</th>" + 
				"</tr>" +
			    "</thead>" +
			    "<tbody>" +
				"<tr>" +
				    "<td class='fc-agenda-gutter " + headerClass + "'><div>&nbsp;</div></td>" + 
				"</tr>" +
			    "</tbody>" +
			    "<tfoot>" + 
				"<tr>" +
				    "<td class='fc-agenda-gutter " + headerClass + "'><div>&nbsp;</div></td>" + 
				"</tr>" +
			    "</tfoot>" +			    
			"</table>";
		
	s +=	    "</td>" +
		"</tr>" + 
	    "</table>";
	
    
        day.table		= $(s).appendTo(element);
        
	day.headSections	= day.table.find('.fc-agenda-days thead');
        tmp			= day.headSections.find('th');
	day.headAxisCell	= tmp.eq(0);
	day.headResourceCells	= tmp.slice(1, -1);
	day.headGutterCell	= tmp.eq(tmp.size()-1);
	
	day.bodySections	= day.table.find('.fc-agenda-days tbody'); 
	tmp			= day.bodySections.find('td');
	day.bodyAxisCell	= tmp.eq(0); 
	day.bodyResourceCells	= tmp.slice(1, -1);
	day.bodyGutterCell	= tmp.eq(tmp.size()-1);
	
	day.resourceScrollContainer	= day.table.find('.sc-resource-scroll-container');
	
	day.bodyResourceCellsInner = day.bodyResourceCells.find('div.fc-day-content div');
	day.bodyResourceFirstCell = day.bodyResourceCells.first();
	
	day.bodyStrecherCells = day.bodyResourceFirstCell.find('>div')
	    .add(day.bodyAxisCell.find('> div'))
	    .add(day.bodyGutterCell.find('> div')); // there are 3 first cells, one in each table (axis, resource, gutter)

	day.footerSections	= day.table.find('.fc-agenda-days tfoot');
	day.footerAxisCell	= day.footerSections.find('.fc-agenda-axis');
	day.footerGutterCell	= day.footerSections.find('.fc-agenda-gutter');


        markFirstLast(day.headSections);
	markFirst(day.headSections.eq(0).find('tr'));
	markLast(day.headSections.eq(2).find('tr'));
	
	markFirst(day.bodySections);
	markLast(day.bodySections.eq(1));

	markLast(day.footerSections);
	markLast(day.footerSections.eq(1).find('tr'));

	axisObjects = day.headSections.eq(0).find('th:first');
	axisObjects = axisObjects.add(day.headSections.eq(0).closest('table')); // this is added to change the width of the container table 

	gutterObjects = day.table.find('.fc-agenda-gutter');
	gutterObjects = gutterObjects.add(day.headSections.eq(2).closest('table')); // this is added to change the width of the container table 
		
		
        slots.layer = $("<div style='position:absolute;z-index:2;left:0;width:100%'/>").appendTo(element);
				
        if (opt('allDaySlot')) {
	    
            allDay.resourceScrollContainer = $("<div style='position:absolute;top:0;left:0' class='sc-resource-scroll-container'/>").appendTo(slots.layer);
            allDay.eventContainer = $("<div style='position:absolute;z-index:8;top:0;left:0' class='fc-event-container'/>").appendTo(allDay.resourceScrollContainer);
		
            s = "<table cellspacing='0' class='fc-outer-allday-table'>" + 
		"<tr>" + 
		    "<td class='fc-outer-allday-table-axis'>" + 
		    
			"<table style='width:100%' class='fc-agenda-allday' cellspacing='0'>" +
			    "<tr>" +
				"<th class='" + headerClass + " fc-agenda-axis'>" + opt('allDayText') + "</th>" +
			    "</tr>" +
			"</table>" + 
		    
		    "</td>" +
		    "<td class='fc-outer-day-table-resources'>" +
			
			"<table style='width:100%' class='fc-agenda-allday' cellspacing='0'>" +
			    "<tr>" +
				"<td>" +
				    "<div class='fc-day-content'>" +
					"<div style='position:relative'/>" + 
				    "</div>" +
				"</td>" +
			    "</tr>" +
			"</table>" +

		    "</td>" +
		    "<td class='fc-outer-day-table-gutter'>" +

			    "<table style='width:100%' class='fc-agenda-allday' cellspacing='0'>" +
				"<tr>" +
				    "<th class='" + headerClass + " fc-agenda-gutter'>&nbsp;</th>" +
				"</tr>" +
			    "</table>" +

		    "</td>" +
		"</tr>" + 
	    "</table>";		    

            allDay.table = $(s).appendTo(slots.layer);
	    allDay.sections = allDay.table.find('.fc-agenda-allday')
            allDay.rows = allDay.table.find('.fc-agenda-allday tr');
			
            dayBind(allDay.rows.eq(1).find('td'));
			
            axisObjects = axisObjects.add(allDay.rows.eq(0).find('th:first')).add(allDay.table.find('.fc-outer-allday-table-axis'));
	    
            gutterObjects = gutterObjects.add(allDay.rows.eq(2).find('th.fc-agenda-gutter')).add(allDay.table.find('.fc-outer-day-table-gutter'));
	
	    allDay.divider = $(
                "<div class='fc-agenda-divider " + headerClass + "'>" +
		    "<div class='fc-agenda-divider-inner'/>" +
                "</div>"
                ).appendTo(slots.layer);
			
        } else {
		
            allDay.eventContainer = $([]); // in jQuery 1.4, we can just do $()
		
        }
		
        slots.scroller = $("<div style='position:absolute;width:100%;overflow-x:hidden;overflow-y:auto'/>") .appendTo(slots.layer);
        slots.content = $("<div style='position:relative;width:100%;overflow:hidden'/>").appendTo(slots.scroller);
	
        slots.resourceScrollContainer = $("<div style='position:absolute;top:0;left:0' class='sc-resource-scroll-container'/>").appendTo(slots.content);
        slots.eventContainer = $("<div style='position:absolute;z-index:8;top:0;left:0'/>").appendTo(slots.resourceScrollContainer);
		
	slots.availabilityScrollContainer = $("<div style='position:absolute;top:0;left:0' class='sc-availability-scroll-container'/>").appendTo(slots.content);
	slots.availabilityContainer = $("<div style='position:absolute;z-index:8;top:0;left:0'/>").appendTo(slots.availabilityScrollContainer);		
		
        s = "<table class='fc-agenda-slots' style='width:100%' cellspacing='0'>" +
	    "<tbody>";
	
        d = zeroDate();
        maxd = addMinutes(cloneDate(d), maxMinute);
        addMinutes(d, minMinute);
        slotCnt = 0;
        for (i=0; d < maxd; i++) {
            minutes = d.getMinutes();
            s += "<tr class='fc-slot" + i + ' ' + (!minutes ? '' : 'fc-minor') + "'>" +
		    "<th class='fc-agenda-axis " + headerClass + "'>" +
			((!slotNormal || !minutes) ? formatDate(d, opt('axisFormat')) : '&nbsp;') +
		    "</th>" +
		    "<td class='" + contentClass + "'>" +
			"<div style='position:relative'>&nbsp;</div>" +
		    "</td>" +
                "</tr>";
	    
            addMinutes(d, opt('slotMinutes'));
            slotCnt++;
        }
	
        s += "</tbody>" +
        "</table>";
    
        slots.table = $(s).appendTo(slots.content);
        slots.tableFirstInner = slots.table.find('div:first');
		
        slotBind(slots.table.find('td'));
		
        axisObjects = axisObjects.add(slots.table.find('th:first'));
	
	//associate resource scroll elements
	day.resourceScrollContainer.scroll(function(){
	    savedScrollLeft = day.resourceScrollContainer.scrollLeft();
	    slots.eventContainer.css('left', -savedScrollLeft);
	    slots.availabilityContainer.css('left', -savedScrollLeft);
	    allDay.eventContainer.css('left', -savedScrollLeft);
	});
    }	
	
	
    function updateCells() {
	
        var i;
        var headCell;
        var bodyCell;
        var date;
        var today = clearTime(new Date());
	
        for (i=0; i<colCnt; i++) {
            date = resourceDate(i);
            
	    headCell = day.headResourceCells.eq(i);
            headCell.html(resources[i].name);
            headCell.attr("id", resources[i].id);
	    
            bodyCell = day.bodyResourceCells.eq(i);
            
	    if (+date == +today) {
                bodyCell.addClass(tm + '-state-highlight fc-today');
            } else {
                bodyCell.removeClass(tm + '-state-highlight fc-today');
            }
	    
            setDayID(headCell.add(bodyCell), date);
        }
    }
	
		
    function setHeight(height, dateChanged) {
	
        if (height === undefined) {
            height = viewHeight;
        }
        viewHeight = height;
        slotTopCache = {};
	
        var headHeight = day.bodySections.eq(1).position().top; // the hight of the resoureces section, it may be the largest
	day.headSections.eq(0).find('tr').height(headHeight);
	day.headSections.eq(2).find('tr').height(headHeight);
	
        var allDayHeight = slots.scroller.position().top; // including divider
	if(opt('allDaySlot')){
	    var allDayDividerHeight = allDay.divider ? allDay.divider.outerHeight() : 0;
	    allDay.rows.height(allDayHeight - allDayDividerHeight);
	    allDay.resourceScrollContainer.height(allDayHeight - allDayDividerHeight);
	}
	
        var bodyHeight = Math.min( // total body height, including borders
            height - headHeight,   // when scrollbars
            slots.table.height() + allDayHeight + 1 // when no scrollbars. +1 for bottom border
            );
	
	// the slots container should be inder the header
        slots.layer.css('top', headHeight);
        
        day.bodyStrecherCells.height(bodyHeight - vsides(day.bodyResourceFirstCell));
	slots.scroller.height(bodyHeight - allDayHeight);
	
        slotHeight = slots.tableFirstInner.height() + 1; // +1 for border

	// make the scroll containr small to show the bottom scrollbars
	var prevSCWidth = day.resourceScrollContainer.width();
	day.resourceScrollContainer.width(day.table.width()/10);
	
	// count bottom scroll bar height and resize the footer
	var resourceContainer = day.table.find('.sc-resource-scroll-container');
	var resourceTable = resourceContainer.find('table');
	var resourceContainerHeight = resourceContainer.height();
	var resourceTableHeight = resourceTable.height();
	var footerHeight = resourceContainerHeight - resourceTableHeight;
	setOuterHeight(day.footerSections.find('div'), footerHeight - 1);
	
	// restore previous scroll container width
	day.resourceScrollContainer.width(prevSCWidth);

	slots.resourceScrollContainer.height(slots.table.height());
	slots.availabilityScrollContainer.height(slots.table.height());

        if (dateChanged) {
            resetScroll();
        }
    }
		
	
    function setWidth(width) {
	
        viewWidth = width;
        colContentPositions.clear();
	
	// count the maximum resource column width for the d'n'd grid
	var columnHeaderSize = getMaxColumnHeaderSize();
	colWidth = columnHeaderSize.width;	
		
        axisWidth = 0;
	axisObjects
	    .width('')
	    .each(function(i, _cell) {
		axisWidth = Math.max(axisWidth, $(_cell).outerWidth());
	    });
        setOuterWidth(axisObjects,axisWidth);
		
        var slotTableWidth = slots.scroller[0].clientWidth; // needs to be done after axisWidth (for IE7)
		
        gutterWidth = slots.scroller.width() - slotTableWidth;
        if (gutterWidth) {
            setOuterWidth(gutterObjects, gutterWidth);
            gutterObjects.show();
        } else {
            gutterObjects.hide();
        }

	var resourcesBodyWidth = viewWidth - axisWidth - gutterWidth;
	setOuterWidth(day.resourceScrollContainer, resourcesBodyWidth);
	setOuterWidth(slots.resourceScrollContainer, resourcesBodyWidth);
	slots.resourceScrollContainer.css('left', axisWidth);
	setOuterWidth(slots.availabilityScrollContainer, resourcesBodyWidth);
	slots.availabilityScrollContainer.css('left', axisWidth);

	if (day.resourceScrollContainer.width() < day.resourceScrollContainer.find('table').width()){
	    day.footerSections.show();
	} else {
	    day.footerSections.hide();
	    markLast(day.bodySections.eq(0));
	    markLast(day.bodySections.eq(2));
	}

	if(opt('allDaySlot')){
	    setOuterWidth(allDay.resourceScrollContainer, resourcesBodyWidth);
	    allDay.sections.eq(1).css('width', resourcesBodyWidth);
	    allDay.resourceScrollContainer.css('left', axisWidth);
	}
    }
	
	
    function getMaxColumnHeaderSize(){
	
	var size = {
	    height : 0,
	    width : 0
	}
	
	day.headResourceCells.each(function(i, column){
	    var col  = $(column);
	    size.height = Math.max(col.height(), size.height);
	    size.width = Math.max(col.width(), size.width);
	});
	
	return size;
    }

    
    function renderAvailabilityOverlay(){

	var i;
	for (i=0; i<colCnt; i++) {
	    
	    var availability = opt('resourceAvailability');
	    
	    if ($.isFunction(availability)) {
		availability = availability(null, null);
	    }
	    else if ($.isArray(availability)) {
		availability = availability[i];
	    }	    
	    
	    if(availability){
		
		availabilityOverlayTable[i] = availabilityOverlayTable[i] || $("<div class='fc-availability-overlay'/>")

		availabilityOverlayTable[i].css({
		    height : '100px', 
		    width: colWidth, 
		    left : (colWidth + 1) * i, // + border 
		    top : '100px'
		});

		slots.availabilityContainer.append(availabilityOverlayTable[i]);
	    }
	}

    }


    function resetScroll() {
        var d0 = zeroDate();
        var scrollDate = cloneDate(d0);
        scrollDate.setHours(opt('firstHour'));
        var top = timePosition(d0, scrollDate) + 1; // +1 for the border
        function scroll() {
            slots.scroller.scrollTop(top);
        }
        scroll();
        setTimeout(scroll, 0); // overrides any previous scroll state made by the browser
    }
	
	
    function beforeHide() {
        savedScrollTop = slots.scroller.scrollTop();
	savedScrollLeft = day.resourceScrollContainer.scrollLeft();
    }
	
	
    function afterShow() {
        slots.scroller.scrollTop(savedScrollTop);
	day.resourceScrollContainer.scrollLeft(savedScrollLeft);
	slots.eventContainer.css('left', -savedScrollLeft);
	allDay.eventContainer.css('left', -savedScrollLeft);	
	
    }
	
    
    function afterRender(){
	renderAvailabilityOverlay();

    }
    
	
    /* Slot/Day clicking and binding
	-----------------------------------------------------------------------*/
	

    function dayBind(cells) {
        cells.click(slotClick)
	    .mousedown(daySelectionMousedown);
    }


    function slotBind(cells) {
        cells.click(slotClick)
        .mousedown(slotSelectionMousedown);
    }
	
	
    function slotClick(ev) {
	
        if (!opt('selectable')) { // if selectable, SelectionManager will worry about dayClick
            var col = Math.min(colCnt-1, Math.floor((ev.pageX - day.table.offset().left - axisWidth) / colWidth));
            var date = resourceDate(col);
            var rowMatch = this.parentNode.className.match(/fc-slot(\d+)/); // TODO: maybe use data
            if (rowMatch) {
                var mins = parseInt(rowMatch[1]) * opt('slotMinutes');
                var hours = Math.floor(mins/60);
                date.setHours(hours);
                date.setMinutes(mins%60 + minMinute);
                trigger('dayClick', day.bodyResourceCells[col], date, false, ev);
            }else{
                trigger('dayClick', day.bodyResourceCells[col], date, true, ev);
            }
        }
    }
	
	
	
    /* Semi-transparent Overlay Helpers
	-----------------------------------------------------*/
	
    
    function renderDayOverlay(startDate, endDate, refreshCoordinateGrid, resource) { // endDate is exclusive
        if (refreshCoordinateGrid) {
            coordinateGrid.build();
        }
        var startCol, endCol;
        startCol = resourceCol(resource);
        endCol = startCol + 1;
        dayBind(renderCellOverlay(0, startCol, 0, endCol-1));
    }
	
	
    function renderCellOverlay(row0, col0, row1, col1) { // only for all-day?
        var rect = coordinateGrid.rect(row0, col0, row1, col1, slots.layer);
        return renderOverlay(rect, slots.layer);
    }
	

    function renderSlotOverlay(overlayStart, overlayEnd) {
        var dayStart = cloneDate(t.visStart);
        var dayEnd = addDays(cloneDate(dayStart), 1);
        for (var i=0; i<colCnt; i++) {
            var stretchStart = new Date(Math.max(dayStart, overlayStart));
            var stretchEnd = new Date(Math.min(dayEnd, overlayEnd));
            if (stretchStart < stretchEnd) {
                var col = i*dis+dit;
                var rect = coordinateGrid.rect(0, col, 0, col, slots.contnet); // only use it for horizontal coords
                var top = timePosition(dayStart, stretchStart);
                var bottom = timePosition(dayStart, stretchEnd);
                rect.top = top;
                rect.height = bottom - top;
                slotBind(
                    renderOverlay(rect, slots.content)
                    );
            }
            addDays(dayStart, 1);
            addDays(dayEnd, 1);
        }
    }
	
	
    
    /* Coordinate Utilities
	-----------------------------------------------------------------------------*/
	
	
    coordinateGrid = new CoordinateGrid(function(rows, cols) {
        var e, n, p;
        day.headResourceCells.each(function(i, _e) {
            e = $(_e);
            n = e.offset().left;
            if (i) {
                p[1] = n;
            }
            p = [n];
            cols[i] = p;
        });
        p[1] = n + e.outerWidth();
        if (opt('allDaySlot')) {
            e = allDay.rows;
            n = e.offset().top;
            rows[0] = [n, n+e.outerHeight()];
        }
        var slotTableTop = slots.content.offset().top;
        var slotScrollerTop = slots.scroller.offset().top;
        var slotScrollerBottom = slotScrollerTop + slots.scroller.outerHeight();
        function constrain(n) {
            return Math.max(slotScrollerTop, Math.min(slotScrollerBottom, n));
        }
        for (var i=0; i<slotCnt; i++) {
            rows.push([
                constrain(slotTableTop + slotHeight*i),
                constrain(slotTableTop + slotHeight*(i+1))
                ]);
        }
    });
	
	
    hoverListener = new HoverListener(coordinateGrid);
	
	
    colContentPositions = new HorizontalPositionCache(function(col, scrollLeft) {
        return day.bodyResourceCellsInner.eq(col, scrollLeft);
    });
	
	
    function colContentLeft(col) {
        return colContentPositions.left(col, savedScrollLeft) - axisWidth;
    }
	
	
    function colContentRight(col) {
        return colContentPositions.right(col, savedScrollLeft) - axisWidth;
    }
	
	
	
	
    function dateCell(date) { // "cell" terminology is now confusing
        return {
            row: Math.floor(dayDiff(date, t.visStart) / 7),
            col: dayOfWeekCol(date.getDay())
        };
    }
	
	
    function cellDate(cell) {
        var d = resourceDate(cell.col);
        var slotIndex = cell.row;
        if (opt('allDaySlot')) {
            slotIndex--;
        }
        if (slotIndex >= 0) {
            addMinutes(d, minMinute + slotIndex * opt('slotMinutes'));
        }
        return d;
    }
       
       
    function resourceDate(col) {
        return cloneDate(t.visStart);
    }
	
    
    function cellIsAllDay(cell) {
        return opt('allDaySlot') && !cell.row;
    }
	
    
    function dayOfWeekCol(dayOfWeek) {
        return 0;
    }
    
    /* return the column index the resource is at.  Return -1 if resource cannot be found. */
    function resourceCol(resource) {
        for (var i=0; i<resources.length; i++) {
            if (resource.id === resources[i].id)
                return i;
        }
        return -1;
    }
	
	
	
    // get the Y coordinate of the given time on the given day (both Date objects)
    function timePosition(day, time) { // both date objects. day holds 00:00 of current day
        day = cloneDate(day, true);
        if (time < addMinutes(cloneDate(day), minMinute)) {
            return 0;
        }
        if (time >= addMinutes(cloneDate(day), maxMinute)) {
            return slots.table.height();
        }
        var slotMinutes = opt('slotMinutes'),
        minutes = time.getHours()*60 + time.getMinutes() - minMinute,
        slotI = Math.floor(minutes / slotMinutes),
        slotTop = slotTopCache[slotI];
        if (slotTop === undefined) {
            slotTop = slotTopCache[slotI] = slots.table.find('tr:eq(' + slotI + ') td div')[0].offsetTop; //.position().top; // need this optimization???
        }
        return Math.max(0, Math.round(
            slotTop - 1 + slotHeight * ((minutes % slotMinutes) / slotMinutes)
            ));
    }
	
	
    function allDayBounds() {
        return {
            left: axisWidth,
            right: viewWidth - gutterWidth
        }
    }
	
	
    function getAllDayRow(index) {
        return allDay.rows;
    }
	
	
    function defaultEventEnd(event) {
        var start = cloneDate(event.start);
        if (event.allDay) {
            return start;
        }
        return addMinutes(start, opt('defaultEventMinutes'));
    }
	
	
	
    /* Selection
	---------------------------------------------------------------------------------*/
	
	
    function defaultSelectionEnd(startDate, allDay) {
        if (allDay) {
            return cloneDate(startDate);
        }
        return addMinutes(cloneDate(startDate), opt('slotMinutes'));
    }
	
	
    function renderSelection(startDate, endDate, allDay, resource) { // only for all-day
        if (allDay) {
            if (opt('allDaySlot')) {
                renderDayOverlay(startDate, addDays(cloneDate(endDate), 1), true, resource);
            }
        }else{
            renderSlotSelection(startDate, endDate, resource);
        }
    }
	
	
    function renderSlotSelection(startDate, endDate, resource) {
        var helperOption = opt('selectHelper');
        coordinateGrid.build();
        if (helperOption) {
            var col = resourceCol(resource);
            if (col >= 0 && col < colCnt) { // only works when times are on same day
                var rect = coordinateGrid.rect(0, col, 0, col, slots.content); // only for horizontal coords
                var top = timePosition(startDate, startDate);
                var bottom = timePosition(startDate, endDate);
                if (bottom > top) { // protect against selections that are entirely before or after visible range
                    rect.top = top;
                    rect.height = bottom - top;
                    rect.left += 2;
                    rect.width -= 5;
                    if ($.isFunction(helperOption)) {
                        var helperRes = helperOption(startDate, endDate);
                        if (helperRes) {
                            rect.position = 'absolute';
                            rect.zIndex = 8;
                            selectionHelper = $(helperRes)
                            .css(rect)
                            .appendTo(slots.content);
                        }
                    }else{
                        rect.isStart = true; // conside rect a "seg" now
                        rect.isEnd = true;   //
                        selectionHelper = $(slotSegHtml(
                        {
                            title: '',
                            start: startDate,
                            end: endDate,
                            className: ['fc-select-helper'],
                            editable: false
                        },
                        rect
                        ));
                        selectionHelper.css('opacity', opt('dragOpacity'));
                    }
                    if (selectionHelper) {
                        slotBind(selectionHelper);
                        slots.content.append(selectionHelper);
                        setOuterWidth(selectionHelper, rect.width, true); // needs to be after appended
                        setOuterHeight(selectionHelper, rect.height, true);
                    }
                }
            }
        }else{
            renderSlotOverlay(startDate, endDate);
        }
    }
	
	
    function clearSelection() {
        clearOverlays();
        if (selectionHelper) {
            selectionHelper.remove();
            selectionHelper = null;
        }
    }
    
    function daySelectionMousedown(ev) {
        var cellDate = t.cellDate;
        var cellIsAllDay = t.cellIsAllDay;
        var hoverListener = t.getHoverListener();
        if (ev.which == 1 && opt('selectable')) { // which==1 means left mouse button
            unselect(ev);
            var _mousedownElement = this;
            var dates;
            var resource;
            hoverListener.start(function(cell, origCell) { // TODO: maybe put cellDate/cellIsAllDay info in cell
                clearSelection();
                if (cell && cellIsAllDay(cell)) {
                    resource = resources[cell.col];
                    dates = [ cellDate(origCell), cellDate(cell) ].sort(cmp);
                    renderSelection(dates[0], dates[1], true, resource);
                }else{
                    dates = null;
                }
            }, ev);
            $(document).one('mouseup', function(ev) {
                hoverListener.stop();
                if (dates && resource) {
                    reportSelection(dates[0], dates[1], true, ev, resource.id);
                }
            });
        }
    }
	
	
    function slotSelectionMousedown(ev) {
        if (ev.which == 1 && opt('selectable')) { // ev.which==1 means left mouse button
            unselect(ev);
            var dates;
            var resource;
            hoverListener.start(function(cell, origCell) {
                clearSelection();
                if (cell && cell.col == origCell.col && !cellIsAllDay(cell)) {
                    resource = resources[cell.col];
                    var d1 = cellDate(origCell);
                    var d2 = cellDate(cell);
                    dates = [
                    d1,
                    addMinutes(cloneDate(d1), opt('slotMinutes')),
                    d2,
                    addMinutes(cloneDate(d2), opt('slotMinutes'))
                    ].sort(cmp);
                    renderSlotSelection(dates[0], dates[3], resource);
                }else{
                    dates = null;
                }
            }, ev);
            $(document).one('mouseup', function(ev) {
                hoverListener.stop();
                if (dates && resource) {
                    reportSelection(dates[0], dates[3], false, ev, resource.id);
                }
            });
        }
    }
	
	
    function reportDayClick(date, allDay, ev) {
        trigger('dayClick', day.bodyResourceCells[dayOfWeekCol(date.getDay())], date, allDay, ev);
    }
	
	
	
    /* External Dragging
	--------------------------------------------------------------------------------*/
	
	
    function dragStart(_dragElement, ev, ui) {
        hoverListener.start(function(cell) {
            clearOverlays();
            if (cell) {
                if (cellIsAllDay(cell)) {
                    renderCellOverlay(cell.row, cell.col, cell.row, cell.col);
                }else{
                    var d1 = cellDate(cell);
                    var d2 = addMinutes(cloneDate(d1), opt('defaultEventMinutes'));
                    renderSlotOverlay(d1, d2);
                }
            }
        }, ev);
    }
	
	
    function dragStop(_dragElement, ev, ui) {
        var cell = hoverListener.stop();
        clearOverlays();
        if (cell) {
            trigger('drop', _dragElement, cellDate(cell), cellIsAllDay(cell), ev, ui);
        }
    }

}
