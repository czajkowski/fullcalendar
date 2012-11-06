
function HorizontalPositionCache(getElement) {

	var t = this,
		elements = {},
		lefts = {},
		rights = {};
		
	function e(i) {
		return elements[i] = elements[i] || getElement(i);
	}
	
	t.left = function(i, leftOffset) {
		leftOffset = leftOffset || 0;
	    
		return lefts[i] = (lefts[i] === undefined ? e(i).position().left + leftOffset : lefts[i]);
	};
	
	t.right = function(i, leftOffset) {
		return rights[i] = rights[i] === undefined ? t.left(i, leftOffset) + e(i).width() : rights[i];
	};
	
	t.clear = function() {
		elements = {};
		lefts = {};
		rights = {};
	};
	
}
